import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
import { hashPin, normalizeCode } from '@/lib/crypto';
import { managerRoles } from '@/lib/rbac';
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);
    const { employeeCode: rawCode, action, reason } = await req.json();
    const employeeCode = normalizeCode(rawCode);
    const ref = db().collection('user_accounts').doc(employeeCode);
    const snap = await ref.get();
    if (!snap.exists) return fail('ไม่พบบัญชี');
    if (action === 'unlock') await ref.set({ is_locked: false, status: 'ACTIVE', failed_login_count: 0, updated_at: ts() }, { merge: true });
    else if (action === 'reset_pin') await ref.set({ pin_hash: '', status: 'PIN_REQUIRED', is_locked: false, failed_login_count: 0, updated_at: ts() }, { merge: true });
    else if (action === 'disable') await ref.set({ status: 'DISABLED', updated_at: ts() }, { merge: true });
    else if (action === 'reset_device') {
      const devices = await db().collection('trusted_devices').where('employee_code', '==', employeeCode).get();
      const batch = db().batch();
      devices.docs.forEach(d => batch.set(d.ref, { status: 'REVOKED', revoked_by: user.employeeCode, revoked_at: ts() }, { merge: true }));
      await batch.commit();
    } else return fail('action ไม่ถูกต้อง');
    await audit(user.employeeCode, user.role, `ACCOUNT_${action}`.toUpperCase(), 'account', employeeCode, { reason }, req);
    return ok({ message: 'ดำเนินการสำเร็จ' });
  } catch(e) { return handleError(e); }
}
