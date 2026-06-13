'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
export default function Batches() {
  const { data, loading, error } = useApi<any>('/api/admin/import/batches');
  const batches = data?.batches || [];
  return <AppShell area="admin"><div className="page-head"><div><p className="eyebrow">Import History</p><h1>ประวัตินำเข้าไฟล์</h1><p className="muted">ตรวจสอบไฟล์ที่เคยนำเข้าและสถานะการ Import</p></div></div>{loading && <div className="notice">กำลังโหลดประวัตินำเข้า...</div>}{error && <div className="notice danger">{error}</div>}{!loading && !error && batches.length === 0 && <div className="card empty-state-card"><h2>ยังไม่มีประวัตินำเข้า</h2><p className="muted">เมื่ออัปโหลดไฟล์แล้ว รายการจะแสดงที่หน้านี้</p></div>}<div className="data-card-list">{batches.map((b:any) => <div className="card data-card" key={b.id}><div className="data-card-top"><div><span className="data-kicker">ไฟล์</span><h3>{b.file_name || '-'}</h3></div><span className="pill">{b.status || '-'}</span></div><div className="data-grid"><div><span>ประเภท</span><strong>{b.file_type || '-'}</strong></div><div><span>รอบเดือน</span><strong>{b.period_month || '-'}/{b.period_year || '-'}</strong></div><div><span>HUB</span><strong>{b.hub || '-'}</strong></div><div><span>Version</span><strong>v{b.version_no || '-'}</strong></div><div><span>สำเร็จ</span><strong>{b.success_rows ?? 0}</strong></div><div><span>ผิดพลาด</span><strong>{b.failed_rows ?? 0}</strong></div></div></div>)}</div></AppShell>;
}
