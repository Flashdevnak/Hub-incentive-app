import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok } from '@/lib/http';
import { hashPin, normalizeCode } from '@/lib/crypto';

async function hasApprovedActivation(employeeCode: string) {
  const snap = await db()
    .collection('activation_requests')
    .where('employee_code', '==', employeeCode)
    .where('status', '==', 'APPROVED')
    .limit(1)
    .get();

  return !snap.empty;
}

async function hasApprovedPinReset(employeeCode: string) {
  const snap = await db()
    .collection('pin_reset_requests')
    .where('employee_code', '==', employeeCode)
    .where('status', '==', 'APPROVED')
    .limit(1)
    .get();

  return !snap.empty;
}

export async function POST(req: NextRequest) {
  const { employeeCode: rawCode, pin } = await req.json();
  const employeeCode = normalizeCode(rawCode);

  if (!employeeCode) return fail('กรุณากรอกรหัสพนักงาน');
  if (!/^\d{6}$/.test(String(pin || ''))) return fail('PIN ต้องเป็นตัวเลข 6 หลัก');

  const accountRef = db().collection('user_accounts').doc(employeeCode);
  const accountSnap = await accountRef.get();
  const account = accountSnap.exists ? accountSnap.data()! : null;

  if (!account || account.status !== 'PIN_REQUIRED') {
    return fail('บัญชีนี้ไม่อยู่ในสถานะตั้ง PIN');
  }

  const canSetPin = (await hasApprovedActivation(employeeCode)) || (await hasApprovedPinReset(employeeCode));

  if (!canSetPin) {
    return fail('ยังไม่มีคำขอเปิดใช้งานหรือคำขอรีเซ็ต PIN ที่ได้รับอนุมัติ');
  }

  await accountRef.set(
    {
      pin_hash: hashPin(String(pin)),
      status: 'ACTIVE',
      is_locked: false,
      failed_login_count: 0,
      updated_at: ts()
    },
    { merge: true }
  );

  return ok({ message: 'ตั้ง PIN สำเร็จ สามารถเข้าสู่ระบบได้แล้ว' });
}
