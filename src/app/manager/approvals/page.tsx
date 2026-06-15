'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

type ActivationRequest = {
  id: string;
  employee_code?: string;
  employee_name?: string;
  hub_name?: string;
  start_date_input?: string;
  status?: string;
  requested_at?: string;
};

export default function Approvals() {
  const { data, loading, error } = useApi<{ requests: ActivationRequest[] }>('/api/manager/activation-requests');
  const [actionMsg, setActionMsg] = useState('');
  const [actionType, setActionType] = useState<'notice' | 'ok' | 'danger'>('notice');
  const [busyId, setBusyId] = useState('');
  const requests = data?.requests || [];

  async function act(id: string, approve: boolean) {
    const okText = approve ? 'อนุมัติคำขอนี้ใช่ไหม?' : 'ปฏิเสธคำขอนี้ใช่ไหม?';
    if (!window.confirm(okText)) return;

    setBusyId(id);
    setActionMsg('');
    setActionType('notice');

    try {
      const res = await fetch(approve ? '/api/manager/approve-activation' : '/api/manager/reject-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, reason: approve ? 'อนุมัติเปิดใช้งาน' : 'ตรวจสอบแล้วไม่ผ่าน' })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setActionType('danger');
        setActionMsg(json?.message || 'ดำเนินการไม่สำเร็จ');
        return;
      }

      setActionType('ok');
      setActionMsg(approve ? 'อนุมัติสำเร็จ' : 'ปฏิเสธคำขอสำเร็จ');
      setTimeout(() => location.reload(), 600);
    } catch {
      setActionType('danger');
      setActionMsg('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell area="manager">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Activation Approval</p>
          <h1>อนุมัติเปิดใช้งาน</h1>
          <p className="muted">ตรวจคำขอเปิดใช้งานครั้งแรกของพนักงาน ก่อนให้ตั้ง PIN และเข้าใช้งานระบบ</p>
        </div>
      </div>

      <Message text={actionMsg} type={actionType} />

      {loading && <div className="notice">กำลังโหลดคำขอเปิดใช้งาน...</div>}
      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && requests.length === 0 && (
        <div className="card empty-state-card">
          <h2>ไม่มีคำขอรออนุมัติ</h2>
          <p className="muted">ตอนนี้ยังไม่มีคำขอเปิดใช้งานที่รอตรวจสอบ</p>
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
                    <th>HUB</th>
                    <th>วันเริ่มงาน</th>
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
                      <td>{r.hub_name || '-'}</td>
                      <td>{r.start_date_input || '-'}</td>
                      <td><span className="pill">{r.status || 'PENDING'}</span></td>
                      <td>{formatThaiDateTime(r.requested_at)}</td>
                      <td>
                        <div className="desktop-table-actions">
                          <button className="small-button" onClick={() => act(r.id, true)} disabled={busyId === r.id}>อนุมัติ</button>
                          <button className="btn-danger small-button" onClick={() => act(r.id, false)} disabled={busyId === r.id}>ปฏิเสธ</button>
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
                  <span className="pill">รอตรวจสอบ</span>
                </div>
                <div className="mobile-info-grid data-grid">
                  <div><span>ชื่อ</span><strong>{r.employee_name || '-'}</strong></div>
                  <div><span>HUB</span><strong>{r.hub_name || '-'}</strong></div>
                  <div><span>วันเริ่มงาน</span><strong>{r.start_date_input || '-'}</strong></div>
                  <div><span>สถานะ</span><strong>{r.status || 'PENDING'}</strong></div>
                  <div><span>วันที่ส่งคำขอ</span><strong>{formatThaiDateTime(r.requested_at)}</strong></div>
                </div>
                <div className="data-card-actions two">
                  <button onClick={() => act(r.id, true)} disabled={busyId === r.id}>{busyId === r.id ? 'กำลังทำรายการ...' : 'อนุมัติ'}</button>
                  <button className="btn-danger" onClick={() => act(r.id, false)} disabled={busyId === r.id}>ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
