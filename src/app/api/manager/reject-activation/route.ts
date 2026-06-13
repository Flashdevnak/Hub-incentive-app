import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
import { managerRoles } from '@/lib/rbac';
import { notifyActivationRejected } from '@/lib/notifications';
import { assertCanApprove } from '@/lib/approvalScope';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { requestId, reason } = await req.json();

    const ref = db().collection('activation_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return fail('ไม่พบคำขอ');

    const data = snap.data()!;
    if (data.status && data.status !== 'PENDING') return fail('คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ');

    const denied = await assertCanApprove(user, data.employee_code, 'activation');
    if (denied) return denied;

    await ref.set(
      {
        status: 'REJECTED',
        rejected_reason: reason || '',
        approved_by: user.employeeCode,
        approved_at: ts()
      },
      { merge: true }
    );

    await notifyActivationRejected({
      employeeCode: data.employee_code,
      employeeName: data.employee_name || '',
      reason: reason || '',
      requestId
    });

    await audit(user.employeeCode, user.role, 'REJECT_ACTIVATION', 'activation_request', requestId, { reason }, req);

    return ok({ message: 'ปฏิเสธคำขอแล้ว' });
  } catch (e) {
    return handleError(e);
  }
}
