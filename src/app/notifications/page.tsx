use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  created_at?: string;
  is_read?: boolean;
};

function shortDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data, loading, error } = useApi<{ notifications: NotificationItem[]; unreadCount: number }>(
    '/api/me/notifications'
  );

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'notice' | 'ok' | 'danger'>('notice');
  const [busy, setBusy] = useState(false);

  const notifications = data?.notifications || [];
  const unreadCount = Number(data?.unreadCount || 0);

  async function markRead(ids: string[]) {
    if (!ids.length) return;

    setBusy(true);
    setMessage('');

    try {
      const res = await fetch('/api/me/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMessageType('danger');
        setMessage(json?.message || 'อัปเดตแจ้งเตือนไม่สำเร็จ');
        return;
      }

      setMessageType('ok');
      setMessage('อ่านแจ้งเตือนแล้ว');
      setTimeout(() => location.reload(), 400);
    } catch {
      setMessageType('danger');
      setMessage('เชื่อมต่อระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function openNotification(item: NotificationItem) {
    await markRead([item.id]);
    if (item.action_url) router.push(item.action_url);
  }

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>แจ้งเตือน</h1>
          <p className="muted">ติดตามสถานะคำขอเปิดใช้งาน การอนุมัติ และรายการที่ต้องดำเนินการ</p>
        </div>

        {unreadCount > 0 && (
          <button
            className="btn-secondary"
            onClick={() => markRead(notifications.filter((n) => !n.is_read).map((n) => n.id))}
            disabled={busy}
          >
            อ่านทั้งหมด ({unreadCount})
          </button>
        )}
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
              <strong>{item.title}</strong>
              <p>{item.message}</p>
            </div>
            <span>{shortDate(item.created_at)}</span>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
