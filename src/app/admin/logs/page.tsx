'use client';

import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

function shortDetail(value: any) {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (!text) return '-';
    return text.length > 260 ? `${text.slice(0, 260)}...` : text;
  } catch {
    return '-';
  }
}

function fmt(value: any) {
  return formatThaiDateTime(value);
}

export default function Logs() {
  const { data, loading, error } = useApi<any>('/api/admin/audit-logs');
  const logs = data?.logs || [];

  return (
    <AppShell area="admin">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Audit Trail</p>
          <h1>Audit Log</h1>
          <p className="muted">ตรวจสอบประวัติการใช้งานและการกระทำสำคัญในระบบ</p>
        </div>
      </div>

      {loading && <div className="notice">กำลังโหลด Audit Log...</div>}
      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && logs.length === 0 && (
        <div className="card empty-state-card">
          <h2>ยังไม่มี Audit Log</h2>
          <p className="muted">ยังไม่พบประวัติการทำรายการ</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <>
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table">
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>ผู้ทำรายการ</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>รายละเอียด</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td>{fmt(l.created_at)}</td>
                      <td><strong>{l.actor_code || l.actor || '-'}</strong></td>
                      <td>{l.actor_role || '-'}</td>
                      <td><span className="pill">{l.action || '-'}</span></td>
                      <td>{l.target_type || '-'}{l.target_id ? `: ${l.target_id}` : ''}</td>
                      <td className="desktop-detail-cell">{shortDetail(l.detail_json || l.detail || l.metadata)}</td>
                      <td>{l.ip || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="responsive-mobile-cards mobile-card-list data-card-list">
            {logs.map((l: any) => (
              <div className="card mobile-data-card data-card audit-card" key={l.id}>
                <div className="mobile-data-card-head">
                  <div>
                    <span className="data-kicker">Action</span>
                    <h3>{l.action || '-'}</h3>
                  </div>
                  <span className="pill">{l.actor_code || l.actor || '-'}</span>
                </div>

                <div className="mobile-info-grid data-grid">
                  <div><span>เวลา</span><strong>{fmt(l.created_at)}</strong></div>
                  <div><span>Target</span><strong>{l.target_type || '-'}{l.target_id ? `: ${l.target_id}` : ''}</strong></div>
                  <div><span>Role</span><strong>{l.actor_role || '-'}</strong></div>
                  <div><span>IP</span><strong>{l.ip || '-'}</strong></div>
                </div>

                <div className="audit-detail">
                  <span>รายละเอียด</span>
                  <code>{shortDetail(l.detail_json || l.detail || l.metadata)}</code>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
