'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
export default function Manager(){ const {data}=useApi<any>('/api/manager/dashboard'); const s=data?.summary||{}; return <AppShell area="manager"><h1>Dashboard HUB / Manager</h1><div className="grid grid-3"><div className="card"><div className="label">พนักงานทั้งหมด</div><div className="kpi">{s.employees||0}</div></div><div className="card"><div className="label">รออนุมัติเปิดใช้งาน</div><div className="kpi">{s.pendingActivation||0}</div></div><div className="card"><div className="label">คำร้องรอตรวจสอบ</div><div className="kpi">{s.pendingIssues||0}</div></div></div></AppShell>}
