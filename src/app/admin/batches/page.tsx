'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
export default function Batches(){ const {data}=useApi<any>('/api/admin/import/batches'); return <AppShell area="admin"><h1>ประวัตินำเข้าไฟล์</h1><div className="table-wrap"><table><thead><tr><th>ไฟล์</th><th>ประเภท</th><th>รอบเดือน</th><th>HUB</th><th>Version</th><th>สถานะ</th><th>สำเร็จ/ผิดพลาด</th></tr></thead><tbody>{(data?.batches||[]).map((b:any)=><tr key={b.id}><td>{b.file_name}</td><td>{b.file_type}</td><td>{b.period_month}/{b.period_year}</td><td>{b.hub}</td><td>v{b.version_no}</td><td>{b.status}</td><td>{b.success_rows}/{b.failed_rows}</td></tr>)}</tbody></table></div></AppShell>}
