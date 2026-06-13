'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  created_at?: string;
  is_read?: boolean;
};

function looksBrokenThai(value?: string) {
  if (!value) return false;
  return /à|Â|Ã|�/.test(value);
}

function cleanTitle(item: NotificationItem) {
  if (!looksBrokenThai(item.title)) return item.title;

  if (item.type === 'ACTIVATION_PENDING') return 'มีคำขอเปิดใช้งานใหม่';
  if (item.type === 'ACTIVATION_APPROVED') return 'คำขอเปิดใช้งานได้รับอนุมัติแล้ว';
  if (item.type === 'ACTIVATION_REJECTED') return 'คำขอเปิดใช้งานไม่ผ่านการอนุมัติ';

  return 'การแจ้งเตือน';
}

function cleanMessage(item: NotificationItem) {
  if (!looksBrokenThai(item.message)) return item.message;

  if (item.type === 'ACTIVATION_PENDING') {
    return 'มีพนักงานส่งคำขอเปิดใช้งานครั้งแรก กรุณาตรวจสอบ';
  }

  if (item.type === 'ACTIVATION_APPROVED') {
    return 'คำขอของคุณได้รับอนุมัติแล้ว กรุณาตั้ง PIN เพื่อเข้าใช้งานระบบ';
  }

  if (item.type === 'ACTIVATION_REJECTED') {
    return 'คำขอของคุณไม่ผ่านการอนุมัติ กรุณาติดต่อหัวหน้าหรือ Admin';
  }

  return 'กรุณาตรวจสอบรายละเอียดการแจ้งเตือน';
}

export default function NotificationsPage() {
  const router = useRouter();

  const { data, loading, error } = useApi<{
    notifications: NotificationItem[];
    unreadCount: number;
    readCount: number;
  }>('/api/me/notifications');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'notice' | 'ok' | 'danger'>('notice');
  const [busy, setBusy] = useState(false);

  const notifications = data?.notifications || [];
  const unreadCount = Number(data?.unreadCount || 0);
  const readCount = notifications.filter((n) => n.is_read).length;

  const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
  const readIds = notifications.filter((n) => n.is_read).map((n) => n.id);

  async function updateNotifications(
    ids: string[],
    action: 'mark_read' | 'clear_read',
    successMessage: string
  ) {
    if (!ids.length) return;

    setBusy(true);
    setMessage('');

    try {
      const res = await fetch('/api/me/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids, action })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMessageType('danger');
        setMessage(json?.message || 'อัปเดตแจ้งเตือนไม่สำเร็จ');
        return;
      }

      setMessageType('ok');
      setMessage(successMessage);

      setTimeout(() => location.reload(), 450);
    } catch {
      setMessageType('danger');
      setMessage('เชื่อมต่อระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function openNotification(item: NotificationItem) {
    await updateNotifications([item.id], 'mark_read', 'อ่านแจ้งเตือนแล้ว');

    if (item.action_url) {
      router.push(item.action_url);
    }
  }

  return (
    <AppShell>
      <div className="page-head notification-page-head">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>แจ้งเตือน</h1>
          <p className="muted">
            ติดตามสถานะคำขอเปิดใช้งาน การอนุมัติ และรายการที่ต้องดำเนินการ
          </p>
        </div>

        <div className="notification-page-actions">
          {unreadCount > 0 && (
            <button
              className="btn-secondary"
              onClick={() =>
                updateNotifications(unreadIds, 'mark_read', 'อ่านแจ้งเตือนทั้งหมดแล้ว')
              }
              disabled={busy}
            >
              อ่านทั้งหมด ({unreadCount})
            </button>
          )}

          {readCount > 0 && (
            <button
              className="btn-danger"
              onClick={() => {
                const confirmed = window.confirm(
                  'ล้างรายการแจ้งเตือนที่อ่านแล้วใช่ไหม? รายการจะถูกซ่อนจากหน้าของคุณ'
                );

                if (!confirmed) return;

                updateNotifications(readIds, 'clear_read', 'ล้างรายการที่อ่านแล้วเรียบร้อย');
              }}
              disabled={busy}
            >
              ล้างที่อ่านแล้ว ({readCount})
            </button>
          )}
        </div>
      </div>

      <Message text={message} type={messageType} />

      {loading && <div className="notice">กำลังโหลดแจ้งเตือน...</div>}
      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && notifications.length === 0 && (
        <div className="card empty-state-card">
          <h2>ยังไม่มีแจ้งเตือน</h2>
          <p className="muted">ตอนนี้ยังไม่มีรายการแจ้งเตือนใหม่</p>
        </div>
      )}

      <div className="notification-page-list">
        {notifications.map((item) => (
          <button
            type="button"
            className={`card notification-page-card ${item.is_read ? '' : 'unread'}`}
            key={item.id}
            onClick={() => openNotification(item)}
          >
            <div>
              <strong>{cleanTitle(item)}</strong>
              <p>{cleanMessage(item)}</p>
            </div>

            <span>{formatThaiDateTime(item.created_at)}</span>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
