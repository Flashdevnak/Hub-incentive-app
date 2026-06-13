'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

type PinResetRequest = {
  id: string;
  employee_code?: string;
  employee_name?: string;
  reason?: string;
  status?: string;
  requested_at?: string;
};

export default function PinResetRequests() {
  const { data, loading, error } = useApi<{ requests: PinResetRequest[] }>('/api/manager/pin-reset-requests');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'notice' | 'ok' | 'danger'>('notice');
  const [busyId, setBusyId] = useState('');
  const requests = data?.requests || [];

  async function act(id: string, approve: boolean) {
    if (!window.confirm(approve ? 'อนุมัติให้รีเซ็ต PIN ใช่ไหม?' : 'ปฏิเสธคำขอนี้ใช่ไหม?')) return;
    const reason = approve ? 'อนุมัติรีเซ็ต PIN' : window.prompt('ระบุเหตุผลที่ปฏิเสธ', 'ข้อมูลไม่ตรง') || 'ข้อมูลไม่ตรง';

    setBusyId(id);
    setMsg('');

    try {
      const res = await fetch(approve ? '/api/manager/approve-pin-reset' : '/api/manager/reject-pin-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, reason })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMsgType('danger');
        setMsg(json?.message || 'ดำเนินการไม่สำเร็จ');
        return;
      }

      setMsgType('ok');
      setMsg(approve ? 'อนุมัติรีเซ็ต PIN แล้ว' : 'ปฏิเสธคำขอแล้ว');
      setTimeout(() => location.reload(), 600);
    } catch {
      setMsgType('danger');
      setMsg('เชื่อมต่อระบบไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell area="manager">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">PIN Reset</p>
          <h1>อนุมัติรีเซ็ต PIN</h1>
          <p className="muted">ตรวจคำขอลืม PIN ก่อนให้พนักงานตั้ง PIN ใหม่เอง</p>
        </div>
      </div>

      <Message text={msg} type={msgType} />

      {loading && <div className="notice">กำลังโหลดคำขอรีเซ็ต PIN...</div>}
      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && requests.length === 0 && (
        <div className="card empty-state-card">
          <h2>ไม่มีคำขอรีเซ็ต PIN</h2>
          <p className="muted">เมื่อพนักงานยื่นคำขอลืม PIN รายการจะแสดงที่นี่</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <>
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table">
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>ชื่อ</th>
                    <th>เหตุผล</th>
                    <th>สถานะ</th>
                    <th>วันที่ส่ง</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.employee_code || '-'}</strong></td>
                      <td>{r.employee_name || '-'}</td>
                      <td className="desktop-detail-cell">{r.reason || '-'}</td>
                      <td><span className="pill">{r.status || 'PENDING'}</span></td>
                      <td>{formatThaiDateTime(r.requested_at)}</td>
                      <td>
                        <div className="desktop-table-actions">
                          <button className="small-button" disabled={busyId === r.id} onClick={() => act(r.id, true)}>อนุมัติ</button>
                          <button className="btn-danger small-button" disabled={busyId === r.id} onClick={() => act(r.id, false)}>ปฏิเสธ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="responsive-mobile-cards mobile-card-list data-card-list">
            {requests.map((r) => (
              <div className="card mobile-data-card data-card" key={r.id}>
                <div className="mobile-data-card-head">
                  <div>
                    <span className="data-kicker">รหัสพนักงาน</span>
                    <h3>{r.employee_code || '-'}</h3>
                    {r.employee_name && <p className="data-subtitle">{r.employee_name}</p>}
                  </div>
                  <span className="pill">{r.status || 'PENDING'}</span>
                </div>
                <div className="mobile-info-grid data-grid">
                  <div><span>ชื่อ</span><strong>{r.employee_name || '-'}</strong></div>
                  <div><span>วันที่ส่งคำขอ</span><strong>{formatThaiDateTime(r.requested_at)}</strong></div>
                </div>
                <div className="data-note"><span>เหตุผล</span><p>{r.reason || '-'}</p></div>
                <div className="data-card-actions two">
                  <button disabled={busyId === r.id} onClick={() => act(r.id, true)}>{busyId === r.id ? 'กำลังทำรายการ...' : 'อนุมัติ'}</button>
                  <button className="btn-danger" disabled={busyId === r.id} onClick={() => act(r.id, false)}>ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
