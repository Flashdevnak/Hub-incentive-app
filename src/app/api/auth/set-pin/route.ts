import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok } from '@/lib/http';
import { hashPin, normalizeCode } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  const { employeeCode: rawCode, pin, deviceId, deviceName } = await req.json();
  const employeeCode = normalizeCode(rawCode);
  if (!/^\d{6}$/.test(String(pin || ''))) return fail('PIN ต้องเป็นตัวเลข 6 หลัก');
  const reqSnap = await db().collection('activation_requests').where('employee_code', '==', employeeCode).where('status', '==', 'APPROVED').limit(1).get();
  if (reqSnap.empty) return fail('ยังไม่มีคำขอที่ได้รับอนุมัติ');
  const accountRef = db().collection('user_accounts').doc(employeeCode);
  const accountSnap = await accountRef.get();
  const account = accountSnap.exists ? accountSnap.data()! : null;
  if (!account || account.status !== 'PIN_REQUIRED') return fail('บัญชีนี้ไม่อยู่ในสถานะตั้ง PIN');
  await accountRef.set({ pin_hash: hashPin(String(pin)), status: 'ACTIVE', is_locked: false, failed_login_count: 0, updated_at: ts() }, { merge: true });
  await db().collection('trusted_devices').add({ employee_code: employeeCode, device_fingerprint: deviceId || '', device_name: deviceName || '', browser: '', os: '', status: 'ACTIVE', approved_by: 'SYSTEM_AFTER_ACTIVATION', approved_at: ts(), last_used_at: ts(), created_at: ts() });
  return ok({ message: 'ตั้ง PIN และเปิดใช้งานอุปกรณ์สำเร็จ' });
}
