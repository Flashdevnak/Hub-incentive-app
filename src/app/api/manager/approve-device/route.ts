import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
import { managerRoles } from '@/lib/rbac';
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { requestId } = await req.json();
    const ref = db().collection('device_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return fail('ไม่พบคำขออุปกรณ์');
    const data = snap.data()!;
    const max = Number(process.env.MAX_TRUSTED_DEVICES || 2);
    const active = await db().collection('trusted_devices').where('employee_code', '==', data.employee_code).where('status', '==', 'ACTIVE').get();
    if (active.size >= max) return fail(`บัญชีนี้มีอุปกรณ์ครบ ${max} เครื่องแล้ว กรุณาลบอุปกรณ์เก่าก่อน`);
    await db().collection('trusted_devices').add({ employee_code: data.employee_code, device_fingerprint: data.device_fingerprint || '', device_name: data.device_name || '', status: 'ACTIVE', approved_by: user.employeeCode, approved_at: ts(), last_used_at: '', created_at: ts() });
    await ref.set({ status: 'APPROVED', approved_by: user.employeeCode, approved_at: ts() }, { merge: true });
    await audit(user.employeeCode, user.role, 'APPROVE_DEVICE', 'device_request', requestId, { employeeCode: data.employee_code }, req);
    return ok({ message: 'อนุมัติอุปกรณ์ใหม่แล้ว' });
  } catch(e) { return handleError(e); }
}
