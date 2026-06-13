'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { getDeviceId, Message } from '@/components/ClientTools';

type MessageType = 'ok' | 'danger' | 'notice';

type ActivationStatus = {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE';
  title: string;
  message: string;
  actionUrl?: string;
};

function cleanEmployeeCode(value: string) {
  return value.trim().toUpperCase();
}

function statusClass(status?: string) {
  if (status === 'APPROVED' || status === 'ACTIVE') return 'activation-status-card approved';
  if (status === 'REJECTED') return 'activation-status-card rejected';
  if (status === 'PENDING') return 'activation-status-card pending';
  return 'activation-status-card';
}

export default function ActivatePage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [msg, setMsg] = useState('');
  const [type, setType] = useState<MessageType>('notice');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<ActivationStatus | null>(null);

  const canSubmit = useMemo(() => {
    return cleanEmployeeCode(employeeCode).length > 0 && startDate.length > 0 && !loading;
  }, [employeeCode, startDate, loading]);

  async function checkStatus() {
    const code = cleanEmployeeCode(employeeCode);

    if (!code) {
      setType('danger');
      setMsg('กรุณากรอกรหัสพนักงานก่อนตรวจสถานะ');
      return;
    }

    if (!startDate) {
      setType('danger');
      setMsg('กรุณาเลือกวันเริ่มงานก่อนตรวจสถานะ');
      return;
    }

    setChecking(true);
    setMsg('');

    try {
      const res = await fetch('/api/auth/activation-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: code, startDate })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setStatus(null);
        setType('danger');
        setMsg(json?.message || 'ตรวจสถานะไม่สำเร็จ');
        return;
      }

      setStatus({
        status: json.status,
        title: json.title,
        message: json.message,
        actionUrl: json.actionUrl
      });
    } catch {
      setType('danger');
      setMsg('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setChecking(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const code = cleanEmployeeCode(employeeCode);

    if (!code) {
      setType('danger');
      setMsg('กรุณากรอกรหัสพนักงาน');
      return;
    }

    if (!startDate) {
      setType('danger');
      setMsg('กรุณาเลือกวันเริ่มงาน');
      return;
    }

    setLoading(true);
    setSubmitted(false);
    setStatus(null);
    setType('notice');
    setMsg('กำลังส่งคำขอเปิดใช้งาน...');

    try {
      const res = await fetch('/api/auth/request-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: code,
          startDate,
          deviceId: getDeviceId(),
          deviceInfo: navigator.userAgent
        })
      });

      const json = await res.json();

      if (json.ok) {
        setType('ok');
        setMsg(json.message || 'ส่งคำขอเปิดใช้งานสำเร็จ กรุณารอหัวหน้าหรือ Admin อนุมัติ');
        setSubmitted(true);
        await checkStatus();
        return;
      }

      setType('danger');
      setMsg(json.message || 'ส่งคำขอไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง');
    } catch {
      setType('danger');
      setMsg('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="activate-page">
      <section className="activate-hero">
        <Link href="/login" className="activate-brand">
          <span className="brand-monogram">NAK</span>
          <span>
            <strong>NAK Incentive</strong>
            <small>Employee Incentive System</small>
          </span>
        </Link>

        <div className="activate-copy">
          <span className="activate-chip">First-time access</span>
          <h1>ขอเปิดใช้งานครั้งแรก</h1>
          <p>
            สำหรับพนักงานที่ยังไม่เคยเข้าใช้งานระบบ ให้กรอกรหัสพนักงานและวันเริ่มงาน
            ระบบจะส่งคำขอให้หัวหน้าหรือ Admin ตรวจสอบก่อนตั้ง PIN
          </p>
        </div>

        <div className="activate-steps">
          <div className="activate-step active">
            <span>1</span>
            <div>
              <strong>ยืนยันตัวตน</strong>
              <p>กรอกรหัสพนักงานและวันเริ่มงาน</p>
            </div>
          </div>

          <div className="activate-step">
            <span>2</span>
            <div>
              <strong>รออนุมัติ</strong>
              <p>หัวหน้าหรือ Admin ตรวจสอบคำขอ</p>
            </div>
          </div>

          <div className="activate-step">
            <span>3</span>
            <div>
              <strong>ตั้ง PIN</strong>
              <p>เมื่อตรวจผ่านแล้วจึงตั้ง PIN เพื่อเข้าใช้งาน</p>
            </div>
          </div>
        </div>
      </section>

      <section className="activate-panel card">
        <div className="activate-panel-head">
          <span className="login-label">Account Activation</span>
          <h2>กรอกข้อมูลพนักงาน</h2>
          <p className="muted">
            ข้อมูลต้องตรงกับข้อมูลพนักงานในระบบ เช่น รหัสพนักงาน และวันเริ่มงาน
          </p>
        </div>

        <Message text={msg} type={type} />

        {status && (
          <div className={statusClass(status.status)}>
            <strong>{status.title}</strong>
            <p>{status.message}</p>
            {status.actionUrl && (
              <Link href={status.actionUrl} className="btn btn-secondary">
                {status.status === 'APPROVED' ? 'ไปตั้ง PIN' : status.status === 'ACTIVE' ? 'ไปหน้า Login' : 'ดำเนินการต่อ'}
              </Link>
            )}
          </div>
        )}

        <form className="form activate-form" onSubmit={submit}>
          <label>
            รหัสพนักงาน
            <input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="เช่น 6600123"
              autoComplete="username"
              inputMode="text"
            />
          </label>

          <label>
            วันเริ่มงาน
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <button className="activate-submit" disabled={!canSubmit}>
            {loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเปิดใช้งาน'}
          </button>

          <button type="button" className="btn-secondary" onClick={checkStatus} disabled={checking}>
            {checking ? 'กำลังตรวจสถานะ...' : 'ตรวจสถานะคำขอ'}
          </button>
        </form>

        {submitted && !status && (
          <div className="activate-success-box">
            <strong>ส่งคำขอแล้ว</strong>
            <p>
              หลังจากหัวหน้าหรือ Admin อนุมัติ ให้กลับมาที่หน้า “ตั้ง PIN หลังอนุมัติ”
              เพื่อสร้าง PIN สำหรับเข้าใช้งาน
            </p>

            <Link href="/set-pin" className="btn btn-secondary">
              ไปหน้าตั้ง PIN
            </Link>
          </div>
        )}

        <div className="activate-help">
          <div>
            <strong>กรอกไม่ได้ / วันเริ่มงานไม่ตรง?</strong>
            <p>ติดต่อหัวหน้าหรือ Admin ให้ตรวจสอบข้อมูลพนักงานในระบบก่อน</p>
          </div>
        </div>

        <div className="activate-actions">
          <Link href="/login" className="btn btn-secondary">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>

          <Link href="/set-pin" className="btn btn-secondary">
            ตั้ง PIN หลังอนุมัติ
          </Link>
        </div>
      </section>
    </main>
  );
}
