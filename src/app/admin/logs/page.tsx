'use client';

import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';

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
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString('th-TH');
  return String(value);
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

      <div className="mobile-card-list data-card-list">
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
    </AppShell>
  );
}
