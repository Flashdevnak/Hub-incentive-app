import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok, requireAuth, handleError } from '@/lib/http';
import { hashPin, normalizeCode } from '@/lib/crypto';
import { audit } from '@/lib/audit';
import type { Role, SessionUser, AccountStatus, EmploymentStatus } from '@/types';

const roles: Role[] = [
  'super_admin',
  'admin',
  'area_manager',
  'hub_manager',
  'supervisor',
  'staff',
  'viewer'
];

const accountStatuses: AccountStatus[] = ['PIN_REQUIRED', 'ACTIVE', 'LOCKED', 'DISABLED'];
const employmentStatuses: EmploymentStatus[] = ['ACTIVE', 'INACTIVE', 'RESIGNED', 'SUSPENDED'];

function clean<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }

  return out as T;
}

function deriveScopeType(role: Role): SessionUser['scopeType'] {
  if (role === 'super_admin' || role === 'admin') return 'ALL';
  if (role === 'area_manager') return 'AREA';
  if (role === 'hub_manager') return 'HUB';
  if (role === 'supervisor') return 'HUB';
  return 'SELF';
}

function normalizeEmploymentStatus(status?: string): EmploymentStatus {
  const normalized = String(status || 'ACTIVE').trim().toUpperCase() as EmploymentStatus;
  return employmentStatuses.includes(normalized) ? normalized : 'ACTIVE';
}

function isCurrentActive(employee: any) {
  return (
    normalizeEmploymentStatus(employee.employment_status) === 'ACTIVE' &&
    employee.is_active !== false &&
    employee.is_deleted !== true &&
    employee.hidden_from_current_count !== true
  );
}

function canSeeEmployee(session: SessionUser, employee: any) {
  if (session.role === 'super_admin' || session.role === 'admin') return true;
  if (session.scopeType === 'ALL') return true;

  const scopeValue = String(session.scopeValue || '').trim();

  if (session.scopeType === 'SELF') {
    return employee.employee_code === session.employeeCode;
  }

  if (!scopeValue) return employee.employee_code === session.employeeCode;

  if (session.scopeType === 'AREA') {
    return String(employee.area || '').trim() === scopeValue;
  }

  if (session.scopeType === 'HUB') {
    return (
      String(employee.hub_id || '').trim() === scopeValue ||
      String(employee.hub_name || '').trim() === scopeValue
    );
  }

  if (session.scopeType === 'TEAM') {
    return (
      String(employee.team || '').trim() === scopeValue ||
      String(employee.team_name || '').trim() === scopeValue ||
      String(employee.shift_code || '').trim() === scopeValue ||
      String(employee.shift_group || '').trim() === scopeValue ||
      String(employee.hub_id || '').trim() === scopeValue ||
      String(employee.hub_name || '').trim() === scopeValue
    );
  }

  if (session.scopeType === 'SHIFT') {
    return (
      String(employee.shift_code || '').trim() === scopeValue ||
      String(employee.shift_name || '').trim() === scopeValue ||
      String(employee.shift_group || '').trim() === scopeValue
    );
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req, [
      'super_admin',
      'admin',
      'area_manager',
      'hub_manager',
      'supervisor'
    ]);

    const shiftCode = String(req.nextUrl.searchParams.get('shiftCode') || '').trim();
    const shiftName = String(req.nextUrl.searchParams.get('shiftName') || '').trim();
    const shiftGroup = String(req.nextUrl.searchParams.get('shiftGroup') || '').trim();

    const [employeesSnap, accountsSnap] = await Promise.all([
      db().collection('employees').limit(1000).get(),
      db().collection('user_accounts').limit(1000).get()
    ]);

    const accountMap = new Map<string, any>();

    accountsSnap.docs.forEach((doc) => {
      accountMap.set(doc.id, doc.data());
    });

    const employees = employeesSnap.docs
      .map((doc) => {
        const employee = { id: doc.id, ...doc.data() } as any;
        const code = String(employee.employee_code || doc.id).toUpperCase();
        const account = accountMap.get(code);
        const employmentStatus = normalizeEmploymentStatus(employee.employment_status);

        return {
          ...employee,
          employee_code: code,
          employment_status: employmentStatus,
          is_active: employee.is_active ?? employmentStatus === 'ACTIVE',
          account_role: account?.role,
          account_status: account?.status,
          scope_type: account?.scope_type,
          scope_value: account?.scope_value,
          permission_preset: account?.permission_preset || employee.permission_preset,
          is_locked: account?.is_locked || false
        };
      })
      .filter((employee) => canSeeEmployee(session, employee))
      .filter((employee) => !shiftCode || String(employee.shift_code || '').trim() === shiftCode)
      .filter((employee) => !shiftName || String(employee.shift_name || '').trim() === shiftName)
      .filter((employee) => !shiftGroup || String(employee.shift_group || '').trim() === shiftGroup);

    const visibleEmployees = employees.filter((employee) => employee.is_deleted !== true);
    const counts = {
      active: visibleEmployees.filter(isCurrentActive).length,
      inactive: visibleEmployees.filter((employee) => !isCurrentActive(employee)).length,
      total: visibleEmployees.length,
      pending: visibleEmployees.filter((employee) => employee.account_status === 'PIN_REQUIRED').length
    };

    return ok({ employees, counts });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req, ['super_admin', 'admin']);
    const body = await req.json();

    const employeeCode = normalizeCode(body.employee_code || body.employeeCode || '');
    if (!employeeCode) return fail('กรุณากรอกรหัสพนักงาน');

    const role = String(body.role || 'staff') as Role;
    if (!roles.includes(role)) return fail('Role ไม่ถูกต้อง');

    if ((role === 'super_admin' || role === 'admin') && session.role !== 'super_admin') {
      return fail('เฉพาะ Super Admin เท่านั้นที่สร้าง/แก้ Admin ได้', 403);
    }

    const scopeType = (body.scope_type || deriveScopeType(role)) as SessionUser['scopeType'];
    const scopeValue = String(body.scope_value || '').trim();

    if ((scopeType === 'HUB' || scopeType === 'AREA' || scopeType === 'SHIFT') && !scopeValue) {
      return fail(`Scope Type = ${scopeType} ต้องมี Scope Value`);
    }

    const status = String(body.status || 'PIN_REQUIRED') as AccountStatus;
    if (!accountStatuses.includes(status)) return fail('สถานะบัญชีไม่ถูกต้อง');
    const employmentStatus = normalizeEmploymentStatus(body.employment_status);
    const requestedIsActive = typeof body.is_active === 'boolean' ? body.is_active : employmentStatus === 'ACTIVE';
    const hiddenFromCurrentCount =
      typeof body.hidden_from_current_count === 'boolean'
        ? body.hidden_from_current_count
        : employmentStatus !== 'ACTIVE';

    if (employmentStatus !== 'ACTIVE' && status === 'ACTIVE' && !body.allow_login_when_inactive) {
      return fail('พนักงานที่ลาออก/ไม่ใช้งานต้องปิดบัญชีหรือยืนยัน allow_login_when_inactive ก่อน');
    }

    const employeeRef = db().collection('employees').doc(employeeCode);
    const accountRef = db().collection('user_accounts').doc(employeeCode);

    const employeeSnap = await employeeRef.get();
    const currentEmployee = employeeSnap.exists ? employeeSnap.data() || {} : {};
    const accountSnap = await accountRef.get();
    const currentAccount = accountSnap.exists ? accountSnap.data() || {} : {};
    const previousEmploymentStatus = normalizeEmploymentStatus(currentEmployee.employment_status);
    const now = ts();

    const employeeData = clean({
      employee_code: employeeCode,
      employee_name: String(body.employee_name || '').trim() || employeeCode,
      hub_id: String(body.hub_id || '').trim(),
      hub_name: String(body.hub_name || '').trim(),
      area: String(body.area || '').trim(),
      position: String(body.position || '').trim(),
      shift_code: String(body.shift_code || '').trim(),
      shift_name: String(body.shift_name || '').trim(),
      shift_group: String(body.shift_group || '').trim(),
      shift_start: String(body.shift_start || '').trim(),
      shift_end: String(body.shift_end || '').trim(),
      start_date: String(body.start_date || '').trim(),
      employment_status: employmentStatus,
      permission_preset: String(body.permission_preset || 'custom_advanced').trim(),
      is_active: requestedIsActive && employmentStatus === 'ACTIVE',
      is_deleted: body.is_deleted === true ? true : currentEmployee.is_deleted === true ? true : false,
      resigned_at:
        employmentStatus === 'RESIGNED'
          ? String(body.resigned_at || currentEmployee.resigned_at || now).trim()
          : body.resigned_at === ''
            ? ''
            : currentEmployee.resigned_at || undefined,
      inactive_reason: String(body.inactive_reason || '').trim(),
      hidden_from_current_count: hiddenFromCurrentCount || employmentStatus !== 'ACTIVE',
      updated_at: now,
      updated_by: session.employeeCode
    });

    const accountData: Record<string, any> = clean({
      employee_code: employeeCode,
      role,
      scope_type: scopeType,
      scope_value: scopeValue,
      permission_preset: String(body.permission_preset || 'custom_advanced').trim(),
      status: employmentStatus === 'ACTIVE' ? status : status === 'ACTIVE' ? 'DISABLED' : status,
      is_locked:
        status === 'LOCKED'
          ? true
          : status === 'ACTIVE' || status === 'PIN_REQUIRED'
            ? false
            : currentAccount.is_locked || false,
      failed_login_count:
        status === 'ACTIVE' || status === 'PIN_REQUIRED' ? 0 : Number(currentAccount.failed_login_count || 0),
      updated_at: now,
      updated_by: session.employeeCode,
      created_at: currentAccount.created_at || now
    });

    const pin = String(body.pin || '').trim();

    if (pin) {
      if (!/^\d{4,12}$/.test(pin)) {
        return fail('PIN ต้องเป็นตัวเลข 4-12 หลัก');
      }

      accountData.pin_hash = hashPin(pin);

      if (status === 'PIN_REQUIRED' && employmentStatus === 'ACTIVE') {
        accountData.status = 'ACTIVE';
      }
    }

    if (!accountSnap.exists && !pin && status === 'ACTIVE') {
      return fail('บัญชีใหม่ที่เป็น ACTIVE ต้องตั้ง PIN เริ่มต้น');
    }

    await employeeRef.set(employeeData, { merge: true });
    await accountRef.set(accountData, { merge: true });

    const shiftChanged = ['shift_code', 'shift_name', 'shift_group', 'shift_start', 'shift_end'].some(
      (key) => String(currentEmployee[key] || '') !== String(employeeData[key as keyof typeof employeeData] || '')
    );

    if (shiftChanged) {
      await audit(session.employeeCode, session.role, 'UPDATE_EMPLOYEE_SHIFT', 'employee', employeeCode, {
        shift_code: employeeData.shift_code,
        shift_name: employeeData.shift_name,
        shift_group: employeeData.shift_group,
        shift_start: employeeData.shift_start,
        shift_end: employeeData.shift_end
      }, req);
    }

    if (previousEmploymentStatus !== employmentStatus) {
      await audit(session.employeeCode, session.role, 'UPDATE_EMPLOYEE_STATUS', 'employee', employeeCode, {
        from: previousEmploymentStatus,
        to: employmentStatus,
        accountStatus: accountData.status,
        hiddenFromCurrentCount: employeeData.hidden_from_current_count
      }, req);
    }

    return ok({
      message: 'บันทึกข้อมูลพนักงานและบัญชีสำเร็จ',
      employeeCode,
      role: accountData.role,
      scopeType: accountData.scope_type,
      scopeValue: accountData.scope_value,
      status: accountData.status,
      employmentStatus: employeeData.employment_status
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
