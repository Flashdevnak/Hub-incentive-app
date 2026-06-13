'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

type IssueItem = {
  id: string;
  employee_code?: string;
  employee_name?: string;
  topic?: string;
  detail?: string;
  status?: string;
  created_at?: string;
  resolution_note?: string;
};

export default function ManagerIssues() {
  const { data, loading, error } = useApi<{ issues: IssueItem[] }>('/api/admin/issues');

  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'notice' | 'ok' | 'danger'>('notice');

  const issues = data?.issues || [];

  async function updateIssue(id: string, status: string) {
    const resolutionNote =
      status === 'RESOLVED'
        ? window.prompt('ระบุข้อความตอบกลับ/ผลการแก้ไขให้พนักงาน', 'ตรวจสอบและดำเนินการเรียบร้อยแล้ว') || ''
        : window.prompt('ระบุหมายเหตุเพิ่มเติม', '') || '';

    setBusyId(id);
    setMessage('');

    try {
      const res = await fetch('/api/admin/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, resolutionNote })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMessageType('danger');
        setMessage(json?.message || 'อัปเดตคำร้องไม่สำเร็จ');
        return;
      }

      setMessageType('ok');
      setMessage('อัปเดตคำร้องเรียบร้อย');
      setTimeout(() => location.reload(), 500);
    } catch {
      setMessageType('danger');
      setMessage('เชื่อมต่อระบบไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell area="manager">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Support Requests</p>
          <h1>จัดการคำร้อง</h1>
          <p className="muted">ติดตาม ตอบกลับ และปิดคำร้องตรวจสอบข้อมูล Incentive</p>
        </div>
      </div>

      <Message text={message} type={messageType} />

      {loading && <div className="notice">กำลังโหลดคำร้อง...</div>}
      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && issues.length === 0 && (
        <div className="card empty-state-card">
          <h2>ยังไม่มีคำร้อง</h2>
          <p className="muted">เมื่อพนักงานส่งคำร้อง รายการจะแสดงที่นี่</p>
        </div>
      )}

      {!loading && !error && issues.length > 0 && (
        <>
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table">
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>ชื่อ</th>
                    <th>หัวข้อ</th>
                    <th>รายละเอียด</th>
                    <th>สถานะ</th>
                    <th>วันที่ส่ง</th>
                    <th>คำตอบ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i) => (
                    <tr key={i.id}>
                      <td><strong>{i.employee_code || '-'}</strong></td>
                      <td>{i.employee_name || '-'}</td>
                      <td>{i.topic || '-'}</td>
                      <td className="desktop-detail-cell">{i.detail || '-'}</td>
                      <td><span className="pill">{i.status || 'OPEN'}</span></td>
                      <td>{formatThaiDateTime(i.created_at)}</td>
                      <td className="desktop-detail-cell">{i.resolution_note || '-'}</td>
                      <td>
                        <div className="desktop-table-actions">
                          <button className="btn-secondary small-button" disabled={busyId === i.id} onClick={() => updateIssue(i.id, 'IN_PROGRESS')}>รับเรื่อง</button>
                          <button className="small-button" disabled={busyId === i.id} onClick={() => updateIssue(i.id, 'RESOLVED')}>ปิดงาน</button>
                          <button className="btn-danger small-button" disabled={busyId === i.id} onClick={() => updateIssue(i.id, 'REJECTED')}>ปฏิเสธ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="responsive-mobile-cards mobile-card-list data-card-list">
            {issues.map((i) => (
              <div className="card mobile-data-card data-card" key={i.id}>
                <div className="mobile-data-card-head">
                  <div>
                    <span className="data-kicker">รหัสพนักงาน</span>
                    <h3>{i.employee_code || '-'}</h3>
                    {i.employee_name && <p className="data-subtitle">{i.employee_name}</p>}
                  </div>
                  <span className="pill">{i.status || 'OPEN'}</span>
                </div>

                <div className="mobile-info-grid data-grid">
                  <div><span>หัวข้อ</span><strong>{i.topic || '-'}</strong></div>
                  <div><span>เวลา</span><strong>{formatThaiDateTime(i.created_at)}</strong></div>
                </div>

                <div className="data-note">
                  <span>รายละเอียด</span>
                  <p>{i.detail || '-'}</p>
                </div>

                {i.resolution_note && (
                  <div className="data-note resolved-note">
                    <span>คำตอบ / ผลการแก้ไข</span>
                    <p>{i.resolution_note}</p>
                  </div>
                )}

                <div className="data-card-actions three">
                  <button className="btn-secondary" disabled={busyId === i.id} onClick={() => updateIssue(i.id, 'IN_PROGRESS')}>รับเรื่อง</button>
                  <button disabled={busyId === i.id} onClick={() => updateIssue(i.id, 'RESOLVED')}>ตอบกลับ / ปิดงาน</button>
                  <button className="btn-danger" disabled={busyId === i.id} onClick={() => updateIssue(i.id, 'REJECTED')}>ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
