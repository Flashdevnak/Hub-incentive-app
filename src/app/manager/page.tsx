'use client';

import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money } from '@/lib/uiData';

export default function Manager() {
  const { data } = useApi<any>('/api/manager/dashboard');
  const s = data?.summary || {};
  const shiftSummary = data?.shiftSummary || [];

  return (
    <AppShell area="manager">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Manager Dashboard</p>
          <h1>Dashboard HUB / Manager</h1>
          <p className="muted">ติดตามพนักงาน คำขอ และภาพรวม Incentive ตามกะ</p>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <div className="label">พนักงานทั้งหมด</div>
          <div className="kpi">{s.employees || 0}</div>
        </div>
        <div className="card">
          <div className="label">รออนุมัติเปิดใช้งาน</div>
          <div className="kpi">{s.pendingActivation || 0}</div>
        </div>
        <div className="card">
          <div className="label">คำร้องรอตรวจสอบ</div>
          <div className="kpi">{s.pendingIssues || 0}</div>
        </div>
      </div>

      <h2 className="section-title">สรุปตามกะ</h2>

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
