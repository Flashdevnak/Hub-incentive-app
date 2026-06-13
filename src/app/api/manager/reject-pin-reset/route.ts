import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { notifyPinResetRejected } from '@/lib/notifications';
import { assertCanApprove } from '@/lib/approvalScope';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { requestId, reason } = await req.json();

    if (!requestId) return fail('ไม่พบรหัสคำขอ');

    const ref = db().collection('pin_reset_requests').doc(String(requestId));
    const snap = await ref.get();

    if (!snap.exists) return fail('ไม่พบคำขอรีเซ็ต PIN');

    const data = snap.data() || {};
    const employeeCode = data.employee_code || '';
    if (!employeeCode) return fail('คำขอไม่มีรหัสพนักงาน');

    if (data.status && data.status !== 'PENDING') return fail('คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ');
    const denied = await assertCanApprove(user, employeeCode, 'pin');
    if (denied) return denied;

    await ref.set(
      {
        status: 'REJECTED',
        rejected_by: user.employeeCode,
        rejected_at: ts(),
        reason: reason || '',
        updated_at: ts()
      },
      { merge: true }
    );

    await notifyPinResetRejected({
      employeeCode,
      employeeName: data.employee_name || '',
      reason: reason || '',
      requestId: String(requestId)
    });

    await audit(user.employeeCode, user.role, 'REJECT_PIN_RESET', 'pin_reset_request', String(requestId), { employeeCode, reason }, req);

    return ok({ message: 'ปฏิเสธคำขอรีเซ็ต PIN แล้ว' });
  } catch (e) {
    return handleError(e);
  }
}
