'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money, monthName, periodLabel } from '@/lib/uiData';

export default function Manager() {
  const [period, setPeriod] = useState('');
  const dashboardUrl = period ? `/api/manager/dashboard?period=${period}` : '/api/manager/dashboard';
  const { data } = useApi<any>(dashboardUrl);
  const s = data?.summary || {};
  const shiftSummary = data?.shiftSummary || [];
  const periodOptions = data?.periodOptions || [];
  const selectedPeriod = data?.selectedPeriod;
  const selectedPeriodLabel = periodLabel(selectedPeriod, periodOptions);

  return (
    <AppShell area="manager">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Manager Dashboard</p>
          <h1>Dashboard HUB / Manager</h1>
          <p className="muted">ติดตามพนักงาน คำขอ และภาพรวม Incentive ตามกะ</p>
        </div>
      </div>

      <div className="grid grid-3 dashboard-count-grid">
        <div className="card kpi-card">
          <div className="label">พนักงานใช้งานอยู่</div>
          <div className="kpi">{s.active_employee_count ?? s.employees ?? 0}</div>
          <p className="muted small">นับจาก employee master ที่ยังทำงานอยู่</p>
        </div>
        <div className="card kpi-card">
          <div className="label">พนักงานทั้งหมดในระบบ</div>
          <div className="kpi">{s.total_employee_count ?? 0}</div>
          <p className="muted small">รวมข้อมูลพนักงานทั้งหมดที่ยังเก็บไว้</p>
        </div>
        <div className="card kpi-card">
          <div className="label">ลาออก/ไม่ใช้งาน</div>
          <div className="kpi">{s.inactive_employee_count ?? 0}</div>
          <p className="muted small">ไม่อยู่ในสถานะทำงานแล้ว</p>
        </div>
        <div className="card kpi-card">
          <div className="label">บัญชีใช้งานได้</div>
          <div className="kpi">{s.active_account_count ?? 0}</div>
          <p className="muted small">บัญชี ACTIVE ที่เข้าใช้ระบบได้</p>
        </div>
        <div className="card kpi-card">
          <div className="label">ยังไม่มีบัญชี</div>
          <div className="kpi">{s.missing_account_count ?? 0}</div>
          <p className="muted small">พนักงานที่ยังทำงานอยู่แต่ไม่มีบัญชี</p>
        </div>
        <div className="card kpi-card">
          <div className="label">รออนุมัติเปิดใช้งาน</div>
          <div className="kpi">{s.pending_activation_count ?? s.pendingActivation ?? 0}</div>
          <p className="muted small">คำขอเปิดใช้งานที่รอตรวจสอบ</p>
        </div>
        <div className="card kpi-card">
          <div className="label">รอรีเซ็ต PIN</div>
          <div className="kpi">{s.pending_pin_reset_count ?? s.pendingPinReset ?? 0}</div>
          <p className="muted small">คำขอรีเซ็ต PIN ที่รอตรวจสอบ</p>
        </div>
        <div className="card kpi-card">
          <div className="label">คำร้องรอตรวจสอบ</div>
          <div className="kpi">{s.pendingIssues || 0}</div>
          <p className="muted small">รายการแจ้งปัญหาที่ยังเปิดอยู่</p>
        </div>
      </div>

      <div className="section-title-row shift-period-row">
        <div>
          <h2 className="section-title">สรุปตามกะ</h2>
          <p className="muted small">รอบข้อมูลล่าสุด: {selectedPeriodLabel}</p>
        </div>
        {periodOptions.length > 0 && (
          <label className="period-select-label">
            <span>เลือกรอบข้อมูล</span>
            <select value={period || selectedPeriod?.key || ''} onChange={(event) => setPeriod(event.target.value)}>
              {periodOptions.map((option: any) => (
                <option key={option.key} value={option.key}>
                  {monthName(option.month) || option.label || option.key} {option.year || ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {shiftSummary.length === 0 ? (
        <div className="card empty-state-card">
          <h2>ยังไม่มีข้อมูลกะ</h2>
          <p className="muted">ยังไม่มีข้อมูลกะจากไฟล์หรือข้อมูลพนักงาน</p>
        </div>
      ) : (
        <>
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table">
                <thead>
                  <tr>
                    <th>กะ</th>
                    <th>กลุ่ม</th>
                    <th>พนักงาน</th>
                    <th>Incentive รวม</th>
                    <th>ยอดหักรวม</th>
                    <th>สุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftSummary.map((row: any) => (
                    <tr key={row.shift_code || row.shift_name}>
                      <td><strong>{row.shift_name || row.shift_code || '-'}</strong></td>
                      <td>{row.shift_group || '-'}</td>
                      <td>{row.employees || 0}</td>
                      <td>{money(row.gross_amount || 0)}</td>
                      <td>{money(row.deduction_amount || 0)}</td>
                      <td><strong>{money(row.net_amount || 0)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="responsive-mobile-cards mobile-card-list data-card-list">
            {shiftSummary.map((row: any) => (
              <div className="card mobile-data-card data-card" key={row.shift_code || row.shift_name}>
                <div className="mobile-data-card-head">
                  <div>
                    <span className="data-kicker">กะ</span>
                    <h3>{row.shift_name || row.shift_code || '-'}</h3>
                  </div>
                  <span className="pill">{row.employees || 0} คน</span>
                </div>
                <div className="mobile-info-grid data-grid">
                  <div><span>กลุ่ม</span><strong>{row.shift_group || '-'}</strong></div>
                  <div><span>Incentive รวม</span><strong>{money(row.gross_amount || 0)}</strong></div>
                  <div><span>ยอดหักรวม</span><strong>{money(row.deduction_amount || 0)}</strong></div>
                  <div><span>สุทธิ</span><strong>{money(row.net_amount || 0)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
