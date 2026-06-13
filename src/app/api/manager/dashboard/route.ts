import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';
import { isActiveEmployeeRecord, isExplicitInactiveEmployeeRecord } from '@/lib/employeeStatus';

function shiftKey(data: any) {
  return String(data.shift_code || data.shift_name || data.shift_group || '').trim();
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, [...managerRoles]);

    const [emp, acc, act, pinReset, issues, incentiveSnap] = await Promise.all([
      db().collection('employees').limit(1000).get(),
      db().collection('user_accounts').limit(1000).get(),
      db().collection('activation_requests').where('status', '==', 'PENDING').get(),
      db().collection('pin_reset_requests').where('status', '==', 'PENDING').get().catch(() => ({ size: 0 } as any)),
      db().collection('issue_tickets').where('status', 'in', ['รอตรวจสอบ', 'กำลังดำเนินการ']).limit(200).get().catch(() => ({ size: 0 } as any)),
      db().collection('incentive_records').where('is_active', '==', true).limit(1000).get().catch(() => ({ docs: [] } as any))
    ]);

    const shiftMap = new Map<string, any>();
    const accountMap = new Map<string, any>();

    acc.docs.forEach((doc) => accountMap.set(doc.id, doc.data()));

    const employeeDocs = emp.docs
      .map((doc) => {
        const employee = { id: doc.id, ...doc.data() } as any;
        const code = String(employee.employee_code || doc.id).toUpperCase();
        const account = accountMap.get(code);

        return {
          ...employee,
          employee_code: code,
          account_status: account?.status || employee.account_status || employee.status,
          accountStatus: account?.status || employee.accountStatus
        };
      })
      .filter((employee) => employee.is_deleted !== true);
    const activeEmployees = employeeDocs.filter(isActiveEmployeeRecord);
    const inactiveEmployees = employeeDocs.filter(isExplicitInactiveEmployeeRecord);

    for (const data of activeEmployees) {
      const key = shiftKey(data);
      if (!key) continue;

      const row = shiftMap.get(key) || {
        shift_code: data.shift_code || key,
        shift_name: data.shift_name || data.shift_code || key,
        shift_group: data.shift_group || '',
        employees: 0,
        gross_amount: 0,
        deduction_amount: 0,
        net_amount: 0
      };

      row.employees++;
      shiftMap.set(key, row);
    }

    for (const doc of incentiveSnap.docs || []) {
      const data = doc.data();
      const key = shiftKey(data);
      if (!key) continue;

      const row = shiftMap.get(key) || {
        shift_code: data.shift_code || key,
        shift_name: data.shift_name || data.shift_code || key,
        shift_group: data.shift_group || '',
        employees: 0,
        gross_amount: 0,
        deduction_amount: 0,
        net_amount: 0
      };

      row.gross_amount += Number(data.gross_amount || 0);
      row.deduction_amount += Number(data.deduction_amount || 0);
      row.net_amount += Number(data.net_amount || 0);
      shiftMap.set(key, row);
    }

    return ok({
      summary: {
        active_employee_count: activeEmployees.length,
        total_employee_count: employeeDocs.length,
        inactive_employee_count: inactiveEmployees.length,
        account_count: acc.size,
        pending_activation_count: act.size,
        pending_pin_reset_count: pinReset.size || 0,
        employees: activeEmployees.length,
        accounts: acc.size,
        pendingActivation: act.size,
        pendingPinReset: pinReset.size || 0,
        pendingIssues: issues.size || 0
      },
      shiftSummary: Array.from(shiftMap.values()).sort((a, b) => String(a.shift_name).localeCompare(String(b.shift_name), 'th'))
    });
  } catch (e) {
    return handleError(e);
  }
}
