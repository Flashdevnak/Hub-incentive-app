import { db } from '@/lib/firebaseAdmin';
import { filterRequestsByScope } from '@/lib/approvalScope';
import { managerRoles } from '@/lib/rbac';
import type { SessionUser } from '@/types';

function canSeeManagerCounts(user: SessionUser) {
  return (managerRoles as readonly string[]).includes(user.role);
}

function isHiddenForUser(data: any, employeeCode: string) {
  const hiddenBy = Array.isArray(data.hidden_by_employee_codes)
    ? data.hidden_by_employee_codes
    : [];

  return hiddenBy.includes(employeeCode) || (data.recipient_employee_code === employeeCode && data.is_hidden === true);
}

function isUnreadForUser(data: any, employeeCode: string) {
  if (data.recipient_employee_code === employeeCode) return data.is_read !== true;

  const readBy = Array.isArray(data.read_by_employee_codes)
    ? data.read_by_employee_codes
    : [];

  return !readBy.includes(employeeCode);
}

export async function getUnreadNotificationCount(user: SessionUser) {
  const [personalSnap, roleSnap] = await Promise.all([
    db()
      .collection('notifications')
      .where('recipient_employee_code', '==', user.employeeCode)
      .limit(100)
      .get(),
    db()
      .collection('notifications')
      .where('recipient_roles', 'array-contains', user.role)
      .limit(100)
      .get()
  ]);

  const map = new Map<string, any>();

  personalSnap.docs.forEach((doc) => map.set(doc.id, doc.data()));
  roleSnap.docs.forEach((doc) => map.set(doc.id, doc.data()));

  return Array.from(map.values()).filter((data) => (
    !isHiddenForUser(data, user.employeeCode) &&
    isUnreadForUser(data, user.employeeCode)
  )).length;
}

export async function getPendingSummary(user: SessionUser) {
  const unreadNotificationCount = await getUnreadNotificationCount(user);

  if (!canSeeManagerCounts(user)) {
    return {
      pending_activation_count: 0,
      pending_pin_reset_count: 0,
      pending_issue_count: 0,
      total_pending_approval_count: 0,
      unread_notification_count: unreadNotificationCount
    };
  }

  const [activationSnap, pinSnap, issueSnap] = await Promise.all([
    db().collection('activation_requests').where('status', '==', 'PENDING').limit(250).get(),
    db().collection('pin_reset_requests').where('status', '==', 'PENDING').limit(250).get().catch(() => ({ docs: [] } as any)),
    db()
      .collection('issue_tickets')
      .where('status', 'in', ['รอตรวจสอบ', 'กำลังดำเนินการ'])
      .limit(250)
      .get()
      .catch(() => ({ docs: [] } as any))
  ]);

  const activationRequests = activationSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  const pinRequests = pinSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  const issueRequests = issueSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  const [visibleActivations, visiblePins, visibleIssues] = await Promise.all([
    filterRequestsByScope(user, activationRequests, 'activation'),
    filterRequestsByScope(user, pinRequests, 'pin'),
    filterRequestsByScope(user, issueRequests, 'issue')
  ]);

  return {
    pending_activation_count: visibleActivations.length,
    pending_pin_reset_count: visiblePins.length,
    pending_issue_count: visibleIssues.length,
    total_pending_approval_count: visibleActivations.length + visiblePins.length + visibleIssues.length,
    unread_notification_count: unreadNotificationCount
  };
}
