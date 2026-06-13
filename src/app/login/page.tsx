'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDeviceId, Message } from '@/components/ClientTools';

function landingPath(role?: string) {
  if (role === 'super_admin' || role === 'admin') return '/admin';

  if (role === 'area_manager' || role === 'hub_manager' || role === 'supervisor') {
    return '/manager';
  }

  return '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();

  const [employeeCode, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const [danger, setDanger] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setMsg('');
    setDanger(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode,
          pin,
          deviceId: getDeviceId(),
          deviceName: navigator.userAgent
        })
      });

      const json = await res.json();

      if (json.ok) {
        router.replace(landingPath(json.user?.role));
        return;
      }

      setDanger(true);
      setMsg(json.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } catch {
      setDanger(true);
      setMsg('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth auth-modern">
      <div className="login-hero">
        <div className="brand-monogram large">NAK</div>

        <h1>NAK Incentive</h1>

        <p>
          ระบบตรวจสอบ Incentive พนักงาน พร้อมการจัดการสิทธิ์ Admin / หัวหน้า / พนักงาน
          และรองรับการใช้งานบนมือถือ
        </p>
      </div>

      <div className="card auth-card auth-card-modern">
        <div className="login-header">
          <span className="login-label">Employee Incentive System</span>
          <h1>เข้าสู่ระบบ</h1>
          <p className="muted">กรอกรหัสพนักงานและ PIN 6 หลัก</p>
        </div>

        <Message text={msg} type={danger ? 'danger' : 'notice'} />

        <form className="form" onSubmit={submit}>
          <label>
            รหัสพนักงาน
            <input
              value={employeeCode}
              onChange={(e) => setCode(e.target.value)}
              placeholder="เช่น 6600123 หรือ ADMIN"
              autoComplete="username"
            />
          </label>

          <label>
            PIN 6 หลัก
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="******"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
            />
          </label>

          <button className="login-button" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="actions login-actions">
          <Link className="btn btn-secondary" href="/activate">
            ขอเปิดใช้งานครั้งแรก
          </Link>

          <Link className="btn btn-secondary" href="/set-pin">
            ตั้ง PIN หลังอนุมัติ
          </Link>
        </div>

        <p className="small muted login-note">
          ระบบจะพาไปหน้าใช้งานตามสิทธิ์อัตโนมัติหลังเข้าสู่ระบบสำเร็จ
        </p>
      </div>
    </div>
  );
}
