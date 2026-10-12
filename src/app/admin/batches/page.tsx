'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

function fmt(value: any) {
  return formatThaiDateTime(value);
}

function importedAt(batch: any) {
  return batch.imported_at || batch.uploaded_at || batch.confirmed_at || batch.created_at || batch.updated_at;
}

function importer(batch: any) {
  return batch.imported_by || batch.imported_by_employee_code || batch.created_by || batch.uploaded_by || batch.imported_by_role || '-';
}

export default function Batches() {
  const [hub, setHub] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error } = useApi<any>('/api/admin/import/batches');
  const allBatches: any[] = data?.batches || [];
  const hubs = [...new Set(allBatches.map((b) => String(b.hub || '').trim().toUpperCase()).filter(Boolean))].sort();
  const batches = allBatches.filter((b) => (!hub || String(b.hub || '').trim().toUpperCase() === hub) && (!status || String(b.display_status || b.status) === status));

  return (
    <AppShell area="admin">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Import History</p>
          <h1>ประวัตินำเข้าไฟล์</h1>
          <p className="muted">ตรวจสอบไฟล์ที่เคยนำเข้า สถานะ และผลการ Import</p>
        </div>
      </div>

      <div className="card"><div className="split"><label>เลือก HUB <select value={hub} onChange={(event) => setHub(event.target.value)}><option value="">ทุก HUB</option>{hubs.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label>สถานะ <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">ทุกสถานะ</option>{['IMPORTED','IMPORTED_WITH_ERRORS','PROCESSING','STALLED','FAILED'].map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div></div>
      {allBatches.some((b) => b.display_status === 'STALLED') && <div className="notice danger">มี Batch ที่ยังเป็น PROCESSING นานกว่า 20 นาที: อาจถูกขัดจังหวะ ต้องตรวจสอบก่อนนำเข้าใหม่ (ยังไม่ได้แก้สถานะในฐานข้อมูล)</div>}
      {loading && <div className="notice">กำลังโหลดประวัตินำเข้า...</div>}
      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && batches.length === 0 && (
        <div className="card empty-state-card">
          <h2>ยังไม่มีประวัตินำเข้า</h2>
          <p className="muted">เมื่ออัปโหลดไฟล์แล้ว รายการจะแสดงที่หน้านี้</p>
        </div>
      )}

      {!loading && !error && batches.length > 0 && (
        <>
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table">
                <thead>
                  <tr>
                    <th>ไฟล์</th>
                    <th>สถานะ</th>
                    <th>ประเภท</th>
                    <th>รอบเดือน</th>
                    <th>HUB</th>
                    <th>Version</th>
                    <th>กะ</th>
                    <th>สำเร็จ</th>
                    <th>ผิดพลาด</th>
                    <th>รหัสข้อผิดพลาด</th>
                    <th>นำเข้าเมื่อ</th>
                    <th>ผู้นำเข้า</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b: any) => (
                    <tr key={b.id}>
                      <td><strong>{b.file_name || b.name || '-'}</strong></td>
                      <td><span className="pill">{b.display_status || b.status || '-'}</span></td>
                      <td>{b.file_type || b.type || '-'}</td>
                      <td>{b.period_month || '-'}/{b.period_year || '-'}</td>
                      <td>{b.hub || b.hub_name || '-'}</td>
                      <td>v{b.version_no || b.version || '-'}</td>
                      <td>{b.shift_column_detected ? `${b.shift_column_name || '-'} (${b.shift_records_count || 0})` : '-'}</td>
                      <td>{b.success_rows ?? b.success_count ?? 0}</td>
                      <td>{b.failed_rows ?? b.error_count ?? 0}</td>
                      <td>{b.error_code || (b.display_status === 'STALLED' ? 'POSSIBLE_TIMEOUT' : '-')}</td>
                      <td>{fmt(importedAt(b))}</td>
                      <td>{importer(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="responsive-mobile-cards mobile-card-list data-card-list">
            {batches.map((b: any) => (
              <div className="card mobile-data-card data-card" key={b.id}>
                <div className="mobile-data-card-head">
                  <div>
                    <span className="data-kicker">ไฟล์</span>
                    <h3>{b.file_name || b.name || '-'}</h3>
                  </div>
                  <span className="pill">{b.status || '-'}</span>
                </div>

                <div className="mobile-info-grid data-grid">
                  <div><span>ประเภท</span><strong>{b.file_type || b.type || '-'}</strong></div>
                  <div><span>รอบเดือน</span><strong>{b.period_month || '-'}/{b.period_year || '-'}</strong></div>
                  <div><span>HUB</span><strong>{b.hub || b.hub_name || '-'}</strong></div>
                  <div><span>Version</span><strong>v{b.version_no || b.version || '-'}</strong></div>
                  <div><span>กะ</span><strong>{b.shift_column_detected ? `${b.shift_column_name || '-'} (${b.shift_records_count || 0})` : '-'}</strong></div>
                  <div><span>สำเร็จ</span><strong>{b.success_rows ?? b.success_count ?? 0}</strong></div>
                  <div><span>ผิดพลาด</span><strong>{b.failed_rows ?? b.error_count ?? 0}</strong></div>
                  <div><span>รหัสข้อผิดพลาด</span><strong>{b.error_code || (b.display_status === 'STALLED' ? 'POSSIBLE_TIMEOUT' : '-')}</strong></div>
                  <div><span>นำเข้าเมื่อ</span><strong>{fmt(importedAt(b))}</strong></div>
                  <div><span>ผู้นำเข้า</span><strong>{importer(b)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
