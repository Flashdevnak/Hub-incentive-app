'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';

type PinResetRequest = {
  id: string;
  employee_code?: string;
  employee_name?: string;
  start_date_input?: string;
  reason?: string;
  status?: string;
};

export default function PinResetRequestsPage() {
  const { data, loading, error } = useApi<{ requests: PinResetRequest[] }>('/api/manager/pin-reset-requests');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'notice' | 'ok' | 'danger'>('notice');
  const [busyId, setBusyId] = useState('');
  const requests = data?.requests || [];

  async function act(id: string, approve: boolean) {
    const reason = approve ? 'อนุมัติรีเซ็ต PIN' : window.prompt('เหตุผลที่ปฏิเสธ', 'ข้อมูลยืนยันตัวตนไม่ตรง') || '';
    const confirmed = window.confirm(approve ? 'อนุมัติให้รีเซ็ต PIN ใช่ไหม?' : 'ปฏิเสธคำขอนี้ใช่ไหม?');
    if (!confirmed) return;
    setBusyId(id);
    setMessage('');
    try {
      const res = await fetch(approve ? '/api/manager/approve-pin-reset' : '/api/manager/reject-pin-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, reason })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setMessageType('danger');
        setMessage(json?.message || 'ดำเนินการไม่สำเร็จ');
        return;
      }
      setMessageType('ok');
      setMessage(json.message || 'ดำเนินการสำเร็จ');
      setTimeout(() => location.reload(), 600);
    } catch {
      setMessageType('danger');
      setMessage('เชื่อมต่อระบบไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell area="manager">
      <div className="page-head">
        <div>
          <p className="eyebrow">PIN Reset Approval</p>
          <h1>อนุมัติรีเซ็ต PIN</h1>
          <p className="muted">ตรวจสอบคำขอลืม PIN ก่อนให้พนักงานตั้ง PIN ใหม่</p>
        </div>
      </div>
      <Message text={message} type={messageType} />
      {loading && <div className="notice">กำลังโหลดคำขอรีเซ็ต PIN...</div>}
      {error && <div className="notice danger">{error}</div>}
      {!loading && !error && requests.length === 0 && (
        <div className="card empty-state-card"><h2>ไม่มีคำขอรออนุมัติ</h2><p className="muted">ตอนนี้ยังไม่มีคำขอรีเซ็ต PIN</p></div>
      )}
      <div className="data-card-list">
        {requests.map((r) => (
          <div className="card data-card" key={r.id}>
            <div className="data-card-top"><div><span className="data-kicker">รหัสพนักงาน</span><h3>{r.employee_code || '-'}</h3></div><span className="pill">รอตรวจสอบ</span></div>
            <div className="data-grid"><div><span>ชื่อ</span><strong>{r.employee_name || '-'}</strong></div><div><span>วันเริ่มงาน</span><strong>{r.start_date_input || '-'}</strong></div></div>
            <div className="data-note"><span>เหตุผล</span><p>{r.reason || '-'}</p></div>
            <div className="data-card-actions two"><button onClick={() => act(r.id, true)} disabled={busyId === r.id}>{busyId === r.id ? 'กำลังทำรายการ...' : 'อนุมัติ'}</button><button className="btn-danger" onClick={() => act(r.id, false)} disabled={busyId === r.id}>ปฏิเสธ</button></div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
