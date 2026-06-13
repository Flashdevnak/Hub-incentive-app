import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { notifyPinResetApproved } from '@/lib/notifications';
import { assertCanApprove } from '@/lib/approvalScope';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { requestId } = await req.json();

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

    const accountRef = db().collection('user_accounts').doc(employeeCode);
    const accountSnap = await accountRef.get();

    if (!accountSnap.exists) return fail('ไม่พบบัญชีพนักงาน');

    await accountRef.set(
      {
        status: 'PIN_REQUIRED',
        is_locked: false,
        failed_login_count: 0,
        updated_at: ts()
      },
      { merge: true }
    );

    await ref.set(
      {
        status: 'APPROVED',
        approved_by: user.employeeCode,
        approved_at: ts(),
        updated_at: ts()
      },
      { merge: true }
    );

    await notifyPinResetApproved({
      employeeCode,
      employeeName: data.employee_name || '',
      requestId: String(requestId)
    });

    await audit(user.employeeCode, user.role, 'APPROVE_PIN_RESET', 'pin_reset_request', String(requestId), { employeeCode }, req);

    return ok({ message: 'อนุมัติรีเซ็ต PIN แล้ว' });
  } catch (e) {
    return handleError(e);
  }
}
