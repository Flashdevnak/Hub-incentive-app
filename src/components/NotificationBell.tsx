'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

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

function BellIcon() {
  return (
    <svg
      className="notification-bell-svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15.8 17.2H8.2a3 3 0 0 1-2.9-3.75l.28-1.04c.18-.68.27-1.38.27-2.09V9.6A6.15 6.15 0 0 1 12 3.45a6.15 6.15 0 0 1 6.15 6.15v.72c0 .71.09 1.41.27 2.09l.28 1.04a3 3 0 0 1-2.9 3.75Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.85 19.1a2.25 2.25 0 0 0 4.3 0"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.45V2.3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function NotificationBell({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const res = await fetch('/api/me/notifications', { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        setItems(json.notifications || []);
        setUnreadCount(Number(json.unreadCount || 0));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const topItems = useMemo(() => items.slice(0, 6), [items]);
  const readItems = useMemo(() => items.filter((x) => x.is_read), [items]);
  const unreadItems = useMemo(() => items.filter((x) => !x.is_read), [items]);

  async function updateNotifications(ids: string[], action: 'mark_read' | 'clear_read') {
    if (!ids.length) return;

    setBusy(true);

    try {
      await fetch('/api/me/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids, action })
      });

      await load();
    } finally {
      setBusy(false);
    }
  }

  async function openItem(item: NotificationItem) {
    await updateNotifications([item.id], 'mark_read');
    setOpen(false);

    if (item.action_url) {
      router.push(item.action_url);
    }
  }

  async function markAllRead() {
    await updateNotifications(unreadItems.map((x) => x.id), 'mark_read');
  }

  async function clearRead() {
    await updateNotifications(readItems.map((x) => x.id), 'clear_read');
  }

  return (
    <div className={`notification-widget ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="notification-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="การแจ้งเตือน"
      >
        <BellIcon />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <div>
              <strong>การแจ้งเตือน</strong>
              <p>อัปเดตคำขอและสถานะอนุมัติ</p>
            </div>
          </div>

          <div className="notification-popover-actions">
            {unreadItems.length > 0 && (
              <button type="button" onClick={markAllRead} disabled={busy}>
                อ่านทั้งหมด
              </button>
            )}

            {readItems.length > 0 && (
              <button type="button" onClick={clearRead} disabled={busy}>
                ล้างที่อ่านแล้ว
              </button>
            )}
          </div>

          {loading && <div className="notification-empty">กำลังโหลด...</div>}

          {!loading && topItems.length === 0 && (
            <div className="notification-empty">ยังไม่มีการแจ้งเตือน</div>
          )}

          {!loading && topItems.length > 0 && (
            <div className="notification-list">
              {topItems.map((item) => (
                <button
                  type="button"
                  className={`notification-item ${item.is_read ? '' : 'unread'}`}
                  onClick={() => openItem(item)}
                  key={item.id}
                >
                  <span>{cleanTitle(item)}</span>
                  <p>{cleanMessage(item)}</p>
                  <small>{shortDate(item.created_at)}</small>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="notification-view-all"
            onClick={() => {
              setOpen(false);
              router.push('/notifications');
            }}
          >
            ดูการแจ้งเตือนทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}
