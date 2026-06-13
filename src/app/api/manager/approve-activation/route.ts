import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
import { managerRoles } from '@/lib/rbac';
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { requestId } = await req.json();
    const ref = db().collection('activation_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return fail('ไม่พบคำขอ');
    const data = snap.data()!;
    await ref.set({ status: 'APPROVED', approved_by: user.employeeCode, approved_at: ts() }, { merge: true });
    const emp = await db().collection('employees').doc(data.employee_code).get();
    const empData = emp.data() || {};
    await db().collection('user_accounts').doc(data.employee_code).set({ employee_code: data.employee_code, role: 'staff', scope_type: 'SELF', status: 'PIN_REQUIRED', is_locked: false, failed_login_count: 0, created_at: ts(), updated_at: ts() }, { merge: true });
    await audit(user.employeeCode, user.role, 'APPROVE_ACTIVATION', 'activation_request', requestId, { employeeCode: data.employee_code }, req);
    return ok({ message: 'อนุมัติเปิดใช้งานแล้ว พนักงานสามารถตั้ง PIN ได้' });
  } catch(e) { return handleError(e); }
}
