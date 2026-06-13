'use client';

import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money, monthName } from '@/lib/uiData';

export default function History() {
  const { data, error } = useApi<any>('/api/me/history');
  const rows = data?.records || [];

  return (
    <AppShell>
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">History</p>
          <h1>ประวัติย้อนหลัง</h1>
          <p className="muted">เลือกดูข้อมูล Incentive ย้อนหลังรายเดือน</p>
        </div>
      </div>

      {error && <div className="notice danger">{error}</div>}

      <div className="responsive-desktop-table">
        <div className="table-wrap desktop-table-card">
          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>รอบเดือน</th>
                <th>กะ</th>
                <th>ยอด Incentive</th>
                <th>ยอดหัก</th>
                <th>ยอดสุทธิจาก Incentive</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td>{monthName(r.period_month)} {r.period_year}</td>
                  <td>{r.shift_name || r.shift_code || '-'}</td>
                  <td>{money(r.gross_amount)}</td>
                  <td>{money(r.deduction_amount)}</td>
                  <td><b>{money(r.net_amount)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="responsive-mobile-cards mobile-card-list data-card-list">
        {rows.map((r: any) => (
          <div className="card mobile-data-card data-card" key={r.id}>
            <div className="mobile-data-card-head">
              <div>
                <span className="data-kicker">รอบเดือน</span>
                <h3>{monthName(r.period_month)} {r.period_year}</h3>
              </div>
              <span className="pill">{r.shift_name || r.shift_code || '-'}</span>
            </div>
            <div className="mobile-info-grid data-grid">
              <div><span>ยอด Incentive</span><strong>{money(r.gross_amount)}</strong></div>
              <div><span>ยอดหัก</span><strong>{money(r.deduction_amount)}</strong></div>
              <div><span>ยอดสุทธิ</span><strong>{money(r.net_amount)}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
