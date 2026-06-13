import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
import { managerRoles } from '@/lib/rbac';
import { notifyActivationApproved } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { requestId } = await req.json();

    const ref = db().collection('activation_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return fail('ไม่พบคำขอ');

    const data = snap.data()!;
    if (data.status && data.status !== 'PENDING') return fail('คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ');

    await ref.set(
      {
        status: 'APPROVED',
        approved_by: user.employeeCode,
        approved_at: ts()
      },
      { merge: true }
    );

    const accountRef = db().collection('user_accounts').doc(data.employee_code);
    const accountSnap = await accountRef.get();
    const account = accountSnap.exists ? accountSnap.data() || {} : {};

    await accountRef.set(
      {
        employee_code: data.employee_code,
        role: account.role || 'staff',
        scope_type: account.scope_type || 'SELF',
        scope_value: account.scope_value || '',
        status: account.status === 'ACTIVE' ? 'ACTIVE' : 'PIN_REQUIRED',
        is_locked: false,
        failed_login_count: 0,
        created_at: account.created_at || ts(),
        updated_at: ts()
      },
      { merge: true }
    );

    await notifyActivationApproved({
      employeeCode: data.employee_code,
      employeeName: data.employee_name || '',
      requestId
    });

    await audit(
      user.employeeCode,
      user.role,
      'APPROVE_ACTIVATION',
      'activation_request',
      requestId,
      { employeeCode: data.employee_code },
      req
    );

    return ok({ message: 'อนุมัติเปิดใช้งานแล้ว พนักงานสามารถตั้ง PIN ได้' });
  } catch (e) {
    return handleError(e);
  }
}
