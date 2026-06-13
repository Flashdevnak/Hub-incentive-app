import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok, requireAuth, handleError } from '@/lib/http';
import { hashPin, verifyPin } from '@/lib/crypto';
import { audit } from '@/lib/audit';
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { oldPin, newPin } = await req.json();
    if (!/^\d{6}$/.test(String(newPin || ''))) return fail('PIN ใหม่ต้องเป็นตัวเลข 6 หลัก');
    const ref = db().collection('user_accounts').doc(user.employeeCode);
    const snap = await ref.get();
    const acc = snap.data()!;
    if (!verifyPin(String(oldPin), acc.pin_hash)) return fail('PIN เดิมไม่ถูกต้อง');
    await ref.set({ pin_hash: hashPin(String(newPin)), updated_at: ts() }, { merge: true });
    await audit(user.employeeCode, user.role, 'CHANGE_PIN', 'account', user.employeeCode, {}, req);
    return ok({ message: 'เปลี่ยน PIN สำเร็จ' });
  } catch (e) { return handleError(e); }
}
