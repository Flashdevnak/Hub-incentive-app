import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
import { managerRoles } from '@/lib/rbac';
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { requestId, reason } = await req.json();
    const ref = db().collection('activation_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return fail('ไม่พบคำขอ');
    await ref.set({ status: 'REJECTED', rejected_reason: reason || '', approved_by: user.employeeCode, approved_at: ts() }, { merge: true });
    await audit(user.employeeCode, user.role, 'REJECT_ACTIVATION', 'activation_request', requestId, { reason }, req);
    return ok({ message: 'ปฏิเสธคำขอแล้ว' });
  } catch(e) { return handleError(e); }
}
