'use client';

import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money, monthName } from '@/lib/uiData';
import { formatShiftGroup } from '@/lib/shiftDisplay';

export default function Dashboard() {
  const { data, error } = useApi<any>('/api/me/dashboard');
  const emp = data?.employee || {};
  const latest = data?.latest || {};
  const shift = data?.shiftInfo || {};
  const latestPeriod = latest.period_month
    ? `${monthName(latest.period_month)} ${latest.period_year || ''}`.trim()
    : 'ยังไม่มีข้อมูล';

  return (
    <AppShell>
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">My Incentive</p>
          <h1>ข้อมูล Incentive ของฉัน</h1>
          <p className="muted">แสดงข้อมูลที่นำเข้าจากไฟล์ล่าสุด</p>
        </div>
      </div>

      {error && <div className="notice danger">{error}</div>}
      {data?.notice && <div className="notice">{data.notice}</div>}

      <div className="grid grid-3 amount-card-grid">
        <div className="card amount-card amount-gross">
          <div className="label">ยอด Incentive รวม</div>
          <div className="kpi money">{money(latest.gross_amount)}</div>
        </div>
        <div className="card amount-card amount-deduction">
          <div className="label">ยอดหักรวม</div>
          <div className="kpi money">{money(latest.deduction_amount)}</div>
        </div>
        <div className="card amount-card amount-net">
          <div className="label">ยอดสุทธิจาก Incentive</div>
          <div className="kpi money">{money(latest.net_amount)}</div>
        </div>
      </div>

      <h2 className="section-title">ข้อมูลพนักงาน</h2>
      <div className="card grid grid-3 employee-profile-summary">
        <p><b>ชื่อ:</b> {emp.employee_name || '-'}</p>
        <p><b>รหัส:</b> {emp.employee_code || '-'}</p>
        <p><b>HUB:</b> {emp.hub_name || '-'}</p>
        <p><b>ตำแหน่ง:</b> {emp.position || '-'}</p>
        <p><b>กะ:</b> {shift.shift_name || shift.shift_code || emp.shift_name || emp.shift_code || '-'}</p>
        <p><b>กลุ่มกะ:</b> {formatShiftGroup(shift.shift_group || emp.shift_group)}</p>
        <p><b>วันเริ่มงาน:</b> {emp.start_date || '-'}</p>
        <p><b>รอบข้อมูลล่าสุด:</b> {latestPeriod}</p>
      </div>
    </AppShell>
  );
}
