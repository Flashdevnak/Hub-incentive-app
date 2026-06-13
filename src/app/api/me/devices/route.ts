import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const snap = await db().collection('trusted_devices').where('employee_code', '==', user.employeeCode).get();
    return ok({ devices: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) { return handleError(e); }
}
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { deviceId, deviceName, reason } = await req.json();
    const ref = await db().collection('device_requests').add({ employee_code: user.employeeCode, device_fingerprint: deviceId || '', device_name: deviceName || '', reason: reason || '', status: 'PENDING', requested_at: ts() });
    return ok({ message: 'ส่งคำขออุปกรณ์ใหม่แล้ว', requestId: ref.id });
  } catch (e) { return handleError(e); }
}
