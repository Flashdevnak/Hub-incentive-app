use client';

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

export default function NotificationBell({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/me/notifications');
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

  async function markRead(ids: string[]) {
    if (!ids.length) return;

    await fetch('/api/me/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: ids })
    });

    await load();
  }

  async function openItem(item: NotificationItem) {
    await markRead([item.id]);
    setOpen(false);

    if (item.action_url) {
      router.push(item.action_url);
    }
  }

  async function markAllRead() {
    await markRead(items.filter((x) => !x.is_read).map((x) => x.id));
  }

  return (
    <div className={`notification-widget ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="notification-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="แจ้งเตือน"
      >
        <span className="notification-bell-icon">แจ้งเตือน</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <strong>แจ้งเตือน</strong>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead}>
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {loading && <div className="notification-empty">กำลังโหลด...</div>}

          {!loading && topItems.length === 0 && (
            <div className="notification-empty">ยังไม่มีแจ้งเตือน</div>
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
                  <span>{item.title}</span>
                  <p>{item.message}</p>
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
            ดูแจ้งเตือนทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}
