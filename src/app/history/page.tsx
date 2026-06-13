'use client';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money, monthName } from '@/lib/uiData';
export default function History(){ const {data,error}=useApi<any>('/api/me/history'); const rows=data?.records||[]; return <AppShell><h1>ประวัติย้อนหลัง</h1><p className="muted">เลือกดูข้อมูล Incentive ย้อนหลังรายเดือน</p>{error&&<div className="notice danger">{error}</div>}<div className="table-wrap"><table><thead><tr><th>รอบเดือน</th><th>ยอด Incentive</th><th>ยอดหัก</th><th>ยอดสุทธิจาก Incentive</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td>{monthName(r.period_month)} {r.period_year}</td><td>{money(r.gross_amount)}</td><td>{money(r.deduction_amount)}</td><td><b>{money(r.net_amount)}</b></td></tr>)}</tbody></table></div></AppShell>}
