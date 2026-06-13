'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
export default function Admin(){ const {data}=useApi<any>('/api/manager/dashboard'); const s=data?.summary||{}; return <AppShell area="admin"><h1>Dashboard รวม</h1><div className="grid grid-3"><div className="card"><div className="label">พนักงานทั้งหมด</div><div className="kpi">{s.employees||0}</div></div><div className="card"><div className="label">บัญชีทั้งหมด</div><div className="kpi">{s.accounts||0}</div></div><div className="card"><div className="label">รออนุมัติ</div><div className="kpi">{s.pendingActivation||0}</div></div></div></AppShell>}
