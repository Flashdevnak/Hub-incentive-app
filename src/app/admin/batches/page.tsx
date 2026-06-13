'use client';

import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';

function fmt(value: any) {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString('th-TH');
  return String(value);
}

export default function Batches() {
  const { data, loading, error } = useApi<any>('/api/admin/import/batches');
  const batches = data?.batches || [];

  return (
    <AppShell area="admin">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Import History</p>
          <h1>ประวัตินำเข้าไฟล์</h1>
          <p className="muted">ตรวจสอบไฟล์ที่เคยนำเข้า สถานะ และผลการ Import</p>
        </div>
      </div>

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
                    <th>สำเร็จ</th>
                    <th>ผิดพลาด</th>
                    <th>นำเข้าเมื่อ</th>
                    <th>ผู้นำเข้า</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b: any) => (
                    <tr key={b.id}>
                      <td><strong>{b.file_name || b.name || '-'}</strong></td>
                      <td><span className="pill">{b.status || '-'}</span></td>
                      <td>{b.file_type || b.type || '-'}</td>
                      <td>{b.period_month || '-'}/{b.period_year || '-'}</td>
                      <td>{b.hub || b.hub_name || '-'}</td>
                      <td>v{b.version_no || b.version || '-'}</td>
                      <td>{b.success_rows ?? b.success_count ?? 0}</td>
                      <td>{b.failed_rows ?? b.error_count ?? 0}</td>
                      <td>{fmt(b.created_at || b.imported_at)}</td>
                      <td>{b.created_by || b.imported_by || '-'}</td>
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
                  <div><span>สำเร็จ</span><strong>{b.success_rows ?? b.success_count ?? 0}</strong></div>
                  <div><span>ผิดพลาด</span><strong>{b.failed_rows ?? b.error_count ?? 0}</strong></div>
                  <div><span>นำเข้าเมื่อ</span><strong>{fmt(b.created_at || b.imported_at)}</strong></div>
                  <div><span>ผู้นำเข้า</span><strong>{b.created_by || b.imported_by || '-'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
