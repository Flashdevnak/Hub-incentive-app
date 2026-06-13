import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';

type NotificationAction = 'mark_read' | 'clear_read';

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function canAccessNotification(data: any, employeeCode: string, role: string) {
  const isPersonal = data.recipient_employee_code === employeeCode;

  if (isPersonal) {
    return { canAccess: true, isPersonal };
  }

  const roles = Array.isArray(data.recipient_roles) ? data.recipient_roles : [];
  if (roles.includes(role)) {
    return { canAccess: true, isPersonal: false };
  }

  return { canAccess: false, isPersonal: false };
}

async function markRead(id: string, employeeCode: string, role: string) {
  const ref = db().collection('notifications').doc(String(id));
  const snap = await ref.get();

  if (!snap.exists) return;

  const data = snap.data() || {};
  const access = await canAccessNotification(data, employeeCode, role);

  if (!access.canAccess) return;

  if (access.isPersonal) {
    await ref.set(
      {
        is_read: true,
        read_at: ts(),
        updated_at: ts()
      },
      { merge: true }
    );
    return;
  }

  const readBy = Array.isArray(data.read_by_employee_codes)
    ? data.read_by_employee_codes
    : [];

  await ref.set(
    {
      read_by_employee_codes: unique([...readBy, employeeCode]),
      updated_at: ts()
    },
    { merge: true }
  );
}

async function clearRead(id: string, employeeCode: string, role: string) {
  const ref = db().collection('notifications').doc(String(id));
  const snap = await ref.get();

  if (!snap.exists) return;

  const data = snap.data() || {};
  const access = await canAccessNotification(data, employeeCode, role);

  if (!access.canAccess) return;

  const readBy = Array.isArray(data.read_by_employee_codes)
    ? data.read_by_employee_codes
    : [];

  const isPersonalRead = access.isPersonal && data.is_read === true;
  const isRoleRead = !access.isPersonal && readBy.includes(employeeCode);

  if (!isPersonalRead && !isRoleRead) return;

  if (access.isPersonal) {
    await ref.set(
      {
        is_hidden: true,
        hidden_at: ts(),
        updated_at: ts()
      },
      { merge: true }
    );
    return;
  }

  const hiddenBy = Array.isArray(data.hidden_by_employee_codes)
    ? data.hidden_by_employee_codes
    : [];

  await ref.set(
    {
      hidden_by_employee_codes: unique([...hiddenBy, employeeCode]),
      updated_at: ts()
    },
    { merge: true }
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const action: NotificationAction =
      body.action === 'clear_read' ? 'clear_read' : 'mark_read';

    const ids: string[] = Array.isArray(body.notificationIds)
      ? body.notificationIds.map(String)
      : [];

    if (!ids.length) {
      return ok({ message: 'ไม่มีรายการที่ต้องอัปเดต' });
    }

    const safeIds = ids.slice(0, 80);

    if (action === 'clear_read') {
      await Promise.all(
        safeIds.map((id) => clearRead(id, user.employeeCode, user.role))
      );

      return ok({ message: 'ล้างรายการที่อ่านแล้วเรียบร้อย' });
    }

    await Promise.all(
      safeIds.map((id) => markRead(id, user.employeeCode, user.role))
    );

    return ok({ message: 'อ่านแจ้งเตือนแล้ว' });
  } catch (e) {
    return handleError(e);
  }
}