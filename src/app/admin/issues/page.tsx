'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
export default function AdminIssues(){ const {data}=useApi<any>('/api/admin/issues'); return <AppShell area="admin"><h1>จัดการคำร้อง</h1><div className="table-wrap"><table><thead><tr><th>รหัส</th><th>หัวข้อ</th><th>รายละเอียด</th><th>สถานะ</th><th>เวลา</th></tr></thead><tbody>{(data?.issues||[]).map((i:any)=><tr key={i.id}><td>{i.employee_code}</td><td>{i.topic}</td><td>{i.detail}</td><td>{i.status}</td><td>{i.created_at}</td></tr>)}</tbody></table></div></AppShell>}
