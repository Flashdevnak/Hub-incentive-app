import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { canAccessEmployee, managerRoles } from '@/lib/rbac';
import { isActiveEmployeeRecord, isExplicitInactiveEmployeeRecord, isUsableAccountRecord } from '@/lib/employeeStatus';
import { buildShiftSummaryForPeriod } from '@/lib/incentiveRecords';
import { getPendingSummary } from '@/lib/pendingSummary';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const periodParam = String(req.nextUrl.searchParams.get('period') || '').trim();
    const monthParam = Number(req.nextUrl.searchParams.get('month') || 0);
    const yearParam = Number(req.nextUrl.searchParams.get('year') || 0);
    const selectedPeriodKey = periodParam || (monthParam && yearParam ? `${yearParam}${String(monthParam).padStart(2, '0')}` : '');

    const [emp, acc, incentiveSnap, pendingSummary] = await Promise.all([
      db().collection('employees').limit(1000).get(),
      db().collection('user_accounts').limit(1000).get(),
      db().collection('incentive_records').where('is_active', '==', true).limit(1000).get().catch(() => ({ docs: [] } as any)),
      getPendingSummary(user)
    ]);

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
          account_exists: !!account,
          account_status: account?.status || employee.account_status || employee.status,
          accountStatus: account?.status || employee.accountStatus
        };
      })
      .filter((employee) => canAccessEmployee(user, employee))
      .filter((employee) => employee.is_deleted !== true);

    const activeEmployees = employeeDocs.filter(isActiveEmployeeRecord);
    const inactiveEmployees = employeeDocs.filter(isExplicitInactiveEmployeeRecord);
    const missingAccountCount = activeEmployees.filter((employee) => !employee.account_exists).length;
    const visibleEmployeeCodes = new Set(employeeDocs.map((employee) => String(employee.employee_code || '').toUpperCase()));
    const visibleAccountDocs = acc.docs.filter((doc) => visibleEmployeeCodes.has(String(doc.id || '').toUpperCase()));
    const activeAccountCount = visibleAccountDocs.filter((doc) => isUsableAccountRecord(doc.data())).length;

    const incentiveRecords = (incentiveSnap.docs || [])
      .map((doc: any) => ({ id: doc.id, ...doc.data() }))
      .filter((record: any) => visibleEmployeeCodes.has(String(record.employee_code || '').toUpperCase()));
    const periodSummary = buildShiftSummaryForPeriod(incentiveRecords, selectedPeriodKey);

    return ok({
      summary: {
        active_employee_count: activeEmployees.length,
        total_employee_count: employeeDocs.length,
        inactive_employee_count: inactiveEmployees.length,
        account_count: visibleAccountDocs.length,
        active_account_count: activeAccountCount,
        missing_account_count: missingAccountCount,
        pending_activation_count: pendingSummary.pending_activation_count,
        pending_pin_reset_count: pendingSummary.pending_pin_reset_count,
        pending_issue_count: pendingSummary.pending_issue_count,
        unread_notification_count: pendingSummary.unread_notification_count,
        employees: activeEmployees.length,
        accounts: visibleAccountDocs.length,
        pendingActivation: pendingSummary.pending_activation_count,
        pendingPinReset: pendingSummary.pending_pin_reset_count,
        pendingIssues: pendingSummary.pending_issue_count
      },
      selectedPeriod: periodSummary.selectedPeriod,
      periodOptions: periodSummary.periodOptions,
      shiftSummary: periodSummary.shiftSummary
    });
  } catch (e) {
    return handleError(e);
  }
}
