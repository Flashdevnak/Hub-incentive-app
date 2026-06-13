import { db, ts } from '@/lib/firebaseAdmin';
import type { Role } from '@/types';

export type NotificationType =
  | 'ACTIVATION_PENDING'
  | 'ACTIVATION_APPROVED'
  | 'ACTIVATION_REJECTED'
  | 'DEVICE_PENDING'
  | 'SYSTEM';

type CreateNotificationInput = {
  recipientEmployeeCode?: string | null;
  recipientRoles?: Role[] | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  sourceEmployeeCode?: string;
  metadata?: Record<string, any>;
};

export async function createNotification(input: CreateNotificationInput) {
  try {
    const ref = await db().collection('notifications').add({
      recipient_employee_code: input.recipientEmployeeCode || null,
      recipient_roles: input.recipientRoles || [],
      type: input.type,
      title: input.title,
      message: input.message,
      action_url: input.actionUrl || '',
      source_employee_code: input.sourceEmployeeCode || '',
      metadata: input.metadata || {},
      is_read: false,
      read_by_employee_codes: [],
      created_at: ts()
    });

    return ref.id;
  } catch (e) {
    console.error('createNotification failed', e);
    return '';
  }
}

export async function notifyActivationPending(input: {
  employeeCode: string;
  employeeName?: string;
  hubName?: string;
  requestId: string;
}) {
  return createNotification({
    recipientRoles: ['super_admin', 'admin', 'area_manager', 'hub_manager', 'supervisor'],
    type: 'ACTIVATION_PENDING',
    title: 'มีคำขอเปิดใช้งานใหม่',
    message: `${input.employeeName || input.employeeCode} ส่งคำขอเปิดใช้งานครั้งแรก รอตรวจสอบ`,
    actionUrl: '/manager/approvals',
    sourceEmployeeCode: input.employeeCode,
    metadata: {
      request_id: input.requestId,
      hub_name: input.hubName || ''
    }
  });
}

export async function notifyActivationApproved(input: {
  employeeCode: string;
  employeeName?: string;
  requestId?: string;
}) {
  return createNotification({
    recipientEmployeeCode: input.employeeCode,
    type: 'ACTIVATION_APPROVED',
    title: 'คำขอเปิดใช้งานได้รับอนุมัติแล้ว',
    message: 'คำขอของคุณได้รับอนุมัติแล้ว กรุณาตั้ง PIN เพื่อเข้าใช้งานระบบ',
    actionUrl: '/set-pin',
    sourceEmployeeCode: input.employeeCode,
    metadata: {
      request_id: input.requestId || ''
    }
  });
}

export async function notifyActivationRejected(input: {
  employeeCode: string;
  employeeName?: string;
  reason?: string;
  requestId?: string;
}) {
  return createNotification({
    recipientEmployeeCode: input.employeeCode,
    type: 'ACTIVATION_REJECTED',
    title: 'คำขอเปิดใช้งานไม่ผ่านการอนุมัติ',
    message: input.reason ? `เหตุผล: ${input.reason}` : 'คำขอเปิดใช้งานของคุณไม่ผ่าน กรุณาติดต่อหัวหน้าหรือ Admin',
    actionUrl: '/activate',
    sourceEmployeeCode: input.employeeCode,
    metadata: {
      request_id: input.requestId || '',
      reason: input.reason || ''
    }
  });
}
