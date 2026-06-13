'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
export default function Logs(){ const {data}=useApi<any>('/api/admin/audit-logs'); return <AppShell area="admin"><h1>Audit Log</h1><div className="table-wrap"><table><thead><tr><th>เวลา</th><th>ผู้ทำ</th><th>Action</th><th>Target</th><th>รายละเอียด</th></tr></thead><tbody>{(data?.logs||[]).map((l:any)=><tr key={l.id}><td>{l.created_at}</td><td>{l.actor_code}</td><td>{l.action}</td><td>{l.target_type}:{l.target_id}</td><td><code>{JSON.stringify(l.detail_json)}</code></td></tr>)}</tbody></table></div></AppShell>}
