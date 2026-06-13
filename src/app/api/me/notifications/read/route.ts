import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.notificationIds) ? body.notificationIds : [];

    if (!ids.length) return ok({ message: 'ไม่มีรายการที่ต้องอัปเดต' });

    await Promise.all(
      ids.slice(0, 50).map(async (id) => {
        const ref = db().collection('notifications').doc(String(id));
        const snap = await ref.get();
        if (!snap.exists) return;

        const data = snap.data() || {};
        const isPersonal = data.recipient_employee_code === user.employeeCode;

        if (isPersonal) {
          await ref.set({ is_read: true, read_at: ts() }, { merge: true });
          return;
        }

        const roles = Array.isArray(data.recipient_roles) ? data.recipient_roles : [];
        if (!roles.includes(user.role)) return;

        const readBy = Array.isArray(data.read_by_employee_codes) ? data.read_by_employee_codes : [];
        const nextReadBy = Array.from(new Set([...readBy, user.employeeCode]));

        await ref.set({ read_by_employee_codes: nextReadBy, updated_at: ts() }, { merge: true });
      })
    );

    return ok({ message: 'อ่านแจ้งเตือนแล้ว' });
  } catch (e) {
    return handleError(e);
  }
}
