import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok, requireAuth, handleError } from '@/lib/http';
import { hashPin, normalizeCode } from '@/lib/crypto';
import { audit } from '@/lib/audit';
import type { Role, SessionUser, AccountStatus } from '@/types';

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

        return {
          ...employee,
          employee_code: code,
          account_role: account?.role,
          account_status: account?.status,
          scope_type: account?.scope_type,
          scope_value: account?.scope_value,
          is_locked: account?.is_locked || false
        };
      })
      .filter((employee) => canSeeEmployee(session, employee))
      .filter((employee) => !shiftCode || String(employee.shift_code || '').trim() === shiftCode)
      .filter((employee) => !shiftName || String(employee.shift_name || '').trim() === shiftName)
      .filter((employee) => !shiftGroup || String(employee.shift_group || '').trim() === shiftGroup);

    return ok({ employees });
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

    const status = String(body.status || 'PIN_REQUIRED') as AccountStatus;
    if (!accountStatuses.includes(status)) return fail('สถานะบัญชีไม่ถูกต้อง');

    const employeeRef = db().collection('employees').doc(employeeCode);
    const accountRef = db().collection('user_accounts').doc(employeeCode);

    const employeeSnap = await employeeRef.get();
    const currentEmployee = employeeSnap.exists ? employeeSnap.data() || {} : {};
    const accountSnap = await accountRef.get();
    const currentAccount = accountSnap.exists ? accountSnap.data() || {} : {};

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
      employment_status: String(body.employment_status || 'ACTIVE').trim(),
      updated_at: ts()
    });

    const accountData: Record<string, any> = clean({
      employee_code: employeeCode,
      role,
      scope_type: scopeType,
      scope_value: scopeValue,
      status,
      is_locked:
        status === 'LOCKED'
          ? true
          : status === 'ACTIVE' || status === 'PIN_REQUIRED'
            ? false
            : currentAccount.is_locked || false,
      failed_login_count:
        status === 'ACTIVE' || status === 'PIN_REQUIRED' ? 0 : Number(currentAccount.failed_login_count || 0),
      updated_at: ts(),
      created_at: currentAccount.created_at || ts()
    });

    const pin = String(body.pin || '').trim();

    if (pin) {
      if (!/^\d{4,12}$/.test(pin)) {
        return fail('PIN ต้องเป็นตัวเลข 4-12 หลัก');
      }

      accountData.pin_hash = hashPin(pin);

      if (status === 'PIN_REQUIRED') {
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

    return ok({
      message: 'บันทึกข้อมูลพนักงานและบัญชีสำเร็จ',
      employeeCode,
      role: accountData.role,
      scopeType: accountData.scope_type,
      scopeValue: accountData.scope_value,
      status: accountData.status
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
