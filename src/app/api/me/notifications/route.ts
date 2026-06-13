import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

function isHiddenForUser(data: any, employeeCode: string) {
  const hiddenBy = Array.isArray(data.hidden_by_employee_codes)
    ? data.hidden_by_employee_codes
    : [];

  if (hiddenBy.includes(employeeCode)) return true;

  if (data.recipient_employee_code === employeeCode && data.is_hidden === true) {
    return true;
  }

  return false;
}

function mapNotification(id: string, data: any, employeeCode: string) {
  const roles = Array.isArray(data.recipient_roles) ? data.recipient_roles : [];
  const readBy = Array.isArray(data.read_by_employee_codes)
    ? data.read_by_employee_codes
    : [];

  const isPersonal = data.recipient_employee_code === employeeCode;

  return {
    id,
    type: data.type || 'SYSTEM',
    title: data.title || 'แจ้งเตือน',
    message: data.message || '',
    action_url: data.action_url || '',
    created_at: data.created_at || '',
    is_read: isPersonal ? !!data.is_read : readBy.includes(employeeCode),
    is_personal: isPersonal,
    recipient_roles: roles
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);

    const personalSnap = await db()
      .collection('notifications')
      .where('recipient_employee_code', '==', user.employeeCode)
      .limit(80)
      .get();

    const roleSnap = await db()
      .collection('notifications')
      .where('recipient_roles', 'array-contains', user.role)
      .limit(80)
      .get();

    const map = new Map<string, any>();

    personalSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (isHiddenForUser(data, user.employeeCode)) return;

      map.set(doc.id, mapNotification(doc.id, data, user.employeeCode));
    });

    roleSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (isHiddenForUser(data, user.employeeCode)) return;

      map.set(doc.id, mapNotification(doc.id, data, user.employeeCode));
    });

    const notifications = Array.from(map.values())
      .sort((a, b) => toMs(b.created_at) - toMs(a.created_at))
      .slice(0, 80);

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const readCount = notifications.filter((n) => n.is_read).length;

    return ok({ notifications, unreadCount, readCount });
  } catch (e) {
    return handleError(e);
  }
}