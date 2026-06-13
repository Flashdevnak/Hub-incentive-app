'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { Message } from '@/components/ClientTools';
import type { Role, SessionUser } from '@/types';

type MessageType = 'notice' | 'ok' | 'danger';

const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  area_manager: 'ผู้จัดการ Area',
  hub_manager: 'ผู้จัดการ HUB',
  supervisor: 'Supervisor',
  staff: 'พนักงาน',
  viewer: 'ผู้ดูข้อมูล'
};

function scopeLabel(user?: SessionUser | null) {
  if (!user) return '-';

  if (user.scopeType === 'ALL') return 'ทั้งระบบ';
  if (user.scopeType === 'AREA') return `Area: ${user.scopeValue || '-'}`;
  if (user.scopeType === 'HUB') return `HUB: ${user.scopeValue || '-'}`;
  if (user.scopeType === 'TEAM') return `Team: ${user.scopeValue || '-'}`;
  if (user.scopeType === 'SHIFT') return `Shift: ${user.scopeValue || '-'}`;

  return 'เฉพาะข้อมูลของตัวเอง';
}

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<MessageType>('notice');

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadMe() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json().catch(() => null);

        if (!alive) return;

        if (res.ok && json?.user) {
          setUser(json.user);
          return;
        }

        router.replace('/login');
      } catch {
        if (alive) router.replace('/login');
      } finally {
        if (alive) setLoadingUser(false);
      }
    }

    loadMe();

    return () => {
      alive = false;
    };
  }, [router]);

  async function changePin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMsg('');
    setMsgType('notice');

    if (!oldPin.trim()) {
      setMsgType('danger');
      setMsg('กรุณากรอก PIN เดิม');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      setMsgType('danger');
      setMsg('PIN ใหม่ต้องเป็นตัวเลข 6 หลัก');
      return;
    }

    if (newPin !== confirmPin) {
      setMsgType('danger');
      setMsg('ยืนยัน PIN ใหม่ไม่ตรงกัน');
      return;
    }

    if (oldPin === newPin) {
      setMsgType('danger');
      setMsg('PIN ใหม่ต้องไม่ซ้ำกับ PIN เดิม');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin })
      });

      const json = await res.json();

      if (json.ok) {
        setMsgType('ok');
        setMsg(json.message || 'เปลี่ยน PIN สำเร็จ');
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        return;
      }

      setMsgType('danger');
      setMsg(json.message || 'เปลี่ยน PIN ไม่สำเร็จ');
    } catch {
      setMsgType('danger');
      setMsg('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    const confirmLogout = window.confirm('ต้องการออกจากระบบใช่ไหม?');

    if (!confirmLogout) return;

    setLoggingOut(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  }

  const displayName = user?.employeeName || user?.employeeCode || (loadingUser ? 'กำลังโหลด...' : '-');
  const displayCode = user?.employeeCode || '-';
  const displayRole = user?.role ? roleLabels[user.role] : '-';

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">My Account</p>
          <h1>บัญชีของฉัน</h1>
          <p className="muted">ตรวจสอบข้อมูลบัญชี เปลี่ยน PIN และออกจากระบบ</p>
        </div>

        <button className="btn-danger account-logout-top" onClick={logout} disabled={loggingOut}>
          {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
        </button>
      </div>

      <div className="account-grid">
        <section className="card account-profile-card">
          <div className="account-avatar">NAK</div>

          <div>
            <span className="login-label">Signed in as</span>
            <h2>{displayName}</h2>
            <p className="muted">รหัสพนักงาน: {displayCode}</p>
          </div>

          <div className="account-detail-list">
            <div className="account-detail-row">
              <span>สิทธิ์ใช้งาน</span>
              <strong>{displayRole}</strong>
            </div>

            <div className="account-detail-row">
              <span>ขอบเขตข้อมูล</span>
              <strong>{scopeLabel(user)}</strong>
            </div>

            <div className="account-detail-row">
              <span>สถานะ</span>
              <strong className="account-status-ok">กำลังใช้งาน</strong>
            </div>
          </div>
        </section>

        <section className="card account-pin-card">
          <div className="account-card-head">
            <div>
              <span className="login-label">Security</span>
              <h2>เปลี่ยน PIN</h2>
            </div>

            <span className="pill">6 หลัก</span>
          </div>

          <Message text={msg} type={msgType} />

          <form className="form" onSubmit={changePin}>
            <label>
              PIN เดิม
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="กรอก PIN เดิม"
                autoComplete="current-password"
              />
            </label>

            <label>
              PIN ใหม่
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="ตัวเลข 6 หลัก"
                autoComplete="new-password"
              />
            </label>

            <label>
              ยืนยัน PIN ใหม่
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="กรอก PIN ใหม่อีกครั้ง"
                autoComplete="new-password"
              />
            </label>

            <button disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก PIN ใหม่'}
            </button>
          </form>
        </section>

        <section className="card account-danger-card">
          <div>
            <span className="login-label">Session</span>
            <h2>ออกจากระบบ</h2>
            <p className="muted">
              ใช้ปุ่มนี้เมื่อต้องการออกจากระบบ โดยเฉพาะกรณีใช้งานผ่านมือถือหรือเครื่องส่วนกลาง
            </p>
          </div>

          <button className="btn-danger" onClick={logout} disabled={loggingOut}>
            {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
          </button>
        </section>
      </div>
    </AppShell>
  );
}
