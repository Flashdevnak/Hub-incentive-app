import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok } from '@/lib/http';
import { hashPin, normalizeCode } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!process.env.SETUP_SECRET || body.setupSecret !== process.env.SETUP_SECRET) return fail('SETUP_SECRET ไม่ถูกต้อง', 403);
  const employeeCode = normalizeCode(body.employeeCode || process.env.DEFAULT_ADMIN_CODE || 'ADMIN');
  const pin = String(body.pin || process.env.DEFAULT_ADMIN_PIN || '123456');
  const doc = db().collection('user_accounts').doc(employeeCode);
  const snap = await doc.get();
  if (snap.exists && body.force !== true) return fail('มีบัญชีนี้อยู่แล้ว ถ้าต้องการเขียนทับให้ส่ง force=true', 409);
  await doc.set({
    employee_code: employeeCode,
    pin_hash: hashPin(pin),
    role: 'super_admin',
    scope_type: 'ALL',
    status: 'ACTIVE',
    is_locked: false,
    failed_login_count: 0,
    created_at: ts(),
    updated_at: ts()
  }, { merge: true });
  await db().collection('employees').doc(employeeCode).set({ employee_code: employeeCode, employee_name: 'ผู้ดูแลระบบ', employment_status: 'ACTIVE', updated_at: ts() }, { merge: true });
  return ok({ message: 'สร้าง Super Admin สำเร็จ', employeeCode });
}
