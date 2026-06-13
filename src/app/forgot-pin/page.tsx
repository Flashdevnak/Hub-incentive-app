'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Message } from '@/components/ClientTools';

export default function ForgotPinPage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'notice' | 'ok' | 'danger'>('notice');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/request-pin-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode, startDate, reason })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setType('danger');
        setMessage(json?.message || 'ส่งคำขอไม่สำเร็จ');
        return;
      }

      setType('ok');
      setMessage(json.message || 'ส่งคำขอรีเซ็ต PIN แล้ว กรุณารออนุมัติ');
    } catch {
      setType('danger');
      setMessage('เชื่อมต่อระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth auth-modern">
      <div className="login-hero">
        <div className="brand-monogram large">NAK</div>
        <h1>ลืม PIN</h1>
        <p>ส่งคำขอรีเซ็ต PIN ให้ Admin หรือหัวหน้าตรวจสอบ หลังอนุมัติแล้วจึงตั้ง PIN ใหม่ได้</p>
      </div>

      <div className="card auth-card auth-card-modern">
        <div className="login-header">
          <span className="login-label">PIN Reset Request</span>
          <h1>ขอรีเซ็ต PIN</h1>
          <p className="muted">กรอกรหัสพนักงานและวันเริ่มงานเพื่อยืนยันตัวตน</p>
        </div>

        <Message text={message} type={type} />

        <form className="form" onSubmit={submit}>
          <label>
            รหัสพนักงาน
            <input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="เช่น 6600123" />
          </label>

          <label>
            วันเริ่มงาน
            <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </label>

          <label>
            เหตุผล
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ลืม PIN / เปลี่ยนเครื่อง" />
          </label>

          <button disabled={loading}>{loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอรีเซ็ต PIN'}</button>
        </form>

        <div className="actions login-actions">
          <Link className="btn btn-secondary" href="/login">กลับไปเข้าสู่ระบบ</Link>
          <Link className="btn btn-secondary" href="/set-pin">ตั้ง PIN หลังอนุมัติ</Link>
        </div>
      </div>
    </div>
  );
}
