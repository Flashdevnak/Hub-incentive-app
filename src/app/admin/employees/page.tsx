'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
export default function Employees(){ const {data}=useApi<any>('/api/admin/employees'); return <AppShell area="admin"><h1>ข้อมูลพนักงาน</h1><div className="table-wrap"><table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>HUB</th><th>ตำแหน่ง</th><th>วันเริ่มงาน</th><th>สถานะ</th></tr></thead><tbody>{(data?.employees||[]).map((e:any)=><tr key={e.id}><td>{e.employee_code}</td><td>{e.employee_name}</td><td>{e.hub_name}</td><td>{e.position}</td><td>{e.start_date}</td><td>{e.employment_status}</td></tr>)}</tbody></table></div></AppShell>}
