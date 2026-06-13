import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok } from '@/lib/http';
import { normalizeCode, sign, verifyPin } from '@/lib/crypto';
import { audit } from '@/lib/audit';

const maxFailed = Number(process.env.MAX_FAILED_PIN || 5);
const sessionDays = Number(process.env.SESSION_DAYS || 7);

export async function POST(req: NextRequest) {
  const { employeeCode: rawCode, pin, deviceName } = await req.json();
  const employeeCode = normalizeCode(rawCode);

  if (!employeeCode || !pin) return fail('กรุณากรอกรหัสพนักงานและ PIN');

  const accountRef = db().collection('user_accounts').doc(employeeCode);
  const accountSnap = await accountRef.get();

  if (!accountSnap.exists) return fail('ไม่พบบัญชี หรือยังไม่ได้เปิดใช้งาน', 404);

  const account = accountSnap.data()!;

  if (account.status === 'DISABLED') return fail('บัญชีถูกปิดใช้งาน กรุณาติดต่อหัวหน้า/Admin', 403);
  if (account.is_locked || account.status === 'LOCKED') return fail('บัญชีถูกล็อก กรุณาติดต่อหัวหน้า/Admin', 423);
  if (account.status === 'PIN_REQUIRED') return fail('บัญชียังไม่ได้ตั้ง PIN หรือมีคำขอรีเซ็ต PIN ที่ได้รับอนุมัติแล้ว', 428);

  if (!verifyPin(String(pin), account.pin_hash)) {
    const failed = Number(account.failed_login_count || 0) + 1;

    await accountRef.set(
      {
        failed_login_count: failed,
        is_locked: failed >= maxFailed,
        status: failed >= maxFailed ? 'LOCKED' : account.status,
        updated_at: ts()
      },
      { merge: true }
    );

    return fail(
      failed >= maxFailed ? 'กรอก PIN ผิดเกินกำหนด บัญชีถูกล็อก' : 'PIN ไม่ถูกต้อง',
      failed >= maxFailed ? 423 : 401
    );
  }

  const empSnap = await db().collection('employees').doc(employeeCode).get();
  const emp = empSnap.exists ? empSnap.data()! : {};

  await accountRef.set(
    {
      failed_login_count: 0,
      last_login_at: ts(),
      updated_at: ts()
    },
    { merge: true }
  );

  const session = {
    employeeCode,
    role: account.role,
    scopeType: account.scope_type || 'SELF',
    scopeValue: account.scope_value || '',
    employeeName: emp.employee_name || employeeCode
  };

  const token = sign(session, sessionDays * 86400);

  await audit(employeeCode, account.role, 'LOGIN', 'account', employeeCode, { deviceName }, req);

  const res = ok({ user: session });

  res.cookies.set('nak_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionDays * 86400
  });

  return res;
}
