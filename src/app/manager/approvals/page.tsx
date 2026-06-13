'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';

type ActivationRequest = {
  id: string;
  employee_code?: string;
  employee_name?: string;
  hub_name?: string;
  start_date_input?: string;
  device_info?: string;
  status?: string;
};

export default function Approvals() {
  const { data, loading, error } = useApi<{ requests: ActivationRequest[] }>(
    '/api/manager/activation-requests'
  );

  const [actionMsg, setActionMsg] = useState('');
  const [actionType, setActionType] = useState<'notice' | 'ok' | 'danger'>('notice');
  const [busyId, setBusyId] = useState('');

  const requests = data?.requests || [];

  async function act(id: string, approve: boolean) {
    const okText = approve ? 'อนุมัติคำขอนี้ใช่ไหม?' : 'ปฏิเสธคำขอนี้ใช่ไหม?';
    const confirmed = window.confirm(okText);

    if (!confirmed) return;

    setBusyId(id);
    setActionMsg('');
    setActionType('notice');

    try {
      const res = await fetch(
        approve ? '/api/manager/approve-activation' : '/api/manager/reject-activation',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: id,
            reason: approve ? 'อนุมัติเปิดใช้งาน' : 'ตรวจสอบแล้วไม่ผ่าน'
          })
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setActionType('danger');
        setActionMsg(json?.message || 'ดำเนินการไม่สำเร็จ');
        return;
      }

      setActionType('ok');
      setActionMsg(approve ? 'อนุมัติสำเร็จ' : 'ปฏิเสธคำขอสำเร็จ');

      setTimeout(() => {
        location.reload();
      }, 600);
    } catch {
      setActionType('danger');
      setActionMsg('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell area="manager">
      <div className="page-head">
        <div>
          <p className="eyebrow">Activation Approval</p>
          <h1>อนุมัติเปิดใช้งาน</h1>
          <p className="muted">
            ตรวจคำขอเปิดใช้งานครั้งแรกของพนักงาน ก่อนให้ตั้ง PIN และเข้าใช้งานระบบ
          </p>
        </div>
      </div>

      <Message text={actionMsg} type={actionType} />

      {loading && <div className="notice">กำลังโหลดคำขอเปิดใช้งาน...</div>}

      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && requests.length === 0 && (
        <div className="card empty-state-card">
          <h2>ไม่มีคำขอรออนุมัติ</h2>
          <p className="muted">
            ตอนนี้ยังไม่มีคำขอเปิดใช้งานที่รอตรวจสอบ หรือรายการถูกอนุมัติ/ปฏิเสธไปแล้ว
          </p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>HUB</th>
                <th>วันเริ่มงาน</th>
                <th>อุปกรณ์</th>
                <th>ดำเนินการ</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.employee_code || '-'}</td>
                  <td>{r.employee_name || '-'}</td>
                  <td>{r.hub_name || '-'}</td>
                  <td>{r.start_date_input || '-'}</td>
                  <td className="device-cell">{r.device_info || '-'}</td>
                  <td>
                    <div className="actions">
                      <button onClick={() => act(r.id, true)} disabled={busyId === r.id}>
                        {busyId === r.id ? 'กำลังทำรายการ...' : 'อนุมัติ'}
                      </button>

                      <button
                        className="btn-danger"
                        onClick={() => act(r.id, false)}
                        disabled={busyId === r.id}
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}