import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';

function shiftKey(data: any) {
  return String(data.shift_code || data.shift_name || data.shift_group || '').trim();
}

function isCurrentActiveEmployee(data: any) {
  const employmentStatus = String(data.employment_status || 'ACTIVE').trim().toUpperCase();
  return (
    employmentStatus === 'ACTIVE' &&
    data.is_active !== false &&
    data.is_deleted !== true &&
    data.hidden_from_current_count !== true
  );
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, [...managerRoles]);

    const [emp, acc, act, issues, incentiveSnap] = await Promise.all([
      db().collection('employees').limit(1000).get(),
      db().collection('user_accounts').limit(1000).get(),
      db().collection('activation_requests').where('status', '==', 'PENDING').get(),
      db().collection('issue_tickets').where('status', 'in', ['รอตรวจสอบ', 'กำลังดำเนินการ']).limit(200).get().catch(() => ({ size: 0 } as any)),
      db().collection('incentive_records').where('is_active', '==', true).limit(1000).get().catch(() => ({ docs: [] } as any))
    ]);

    const shiftMap = new Map<string, any>();

    const activeEmployees = emp.docs.filter((doc) => isCurrentActiveEmployee(doc.data()));

    for (const doc of activeEmployees) {
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
        employees: activeEmployees.length,
        accounts: acc.size,
        pendingActivation: act.size,
        pendingIssues: issues.size || 0
      },
      shiftSummary: Array.from(shiftMap.values()).sort((a, b) => String(a.shift_name).localeCompare(String(b.shift_name), 'th'))
    });
  } catch (e) {
    return handleError(e);
  }
}
