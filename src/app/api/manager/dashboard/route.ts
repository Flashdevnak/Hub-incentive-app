import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, [...managerRoles]);
    const [emp, acc, act, issues] = await Promise.all([
      db().collection('employees').limit(1000).get(),
      db().collection('user_accounts').limit(1000).get(),
      db().collection('activation_requests').where('status','==','PENDING').get(),
      db().collection('issue_tickets').where('status','in',['รอตรวจสอบ','กำลังดำเนินการ']).limit(200).get().catch(() => ({ size: 0 } as any))
    ]);
    return ok({ summary: { employees: emp.size, accounts: acc.size, pendingActivation: act.size, pendingIssues: issues.size || 0 } });
  } catch(e) { return handleError(e); }
}
