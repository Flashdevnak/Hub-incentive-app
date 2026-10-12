'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money, periodLabel } from '@/lib/uiData';
import { formatShiftGroup } from '@/lib/shiftDisplay';

export default function History() {
  const [hub, setHub] = useState('');
  const { data, error } = useApi<any>('/api/me/history');
  const hubs: string[] = data?.hubs || [];
  const rows = (data?.records || []).filter((r: any) => !hub || String(r.import_hub || r.hub_name || r.hub_id || '').trim().toUpperCase() === hub);

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
      <div className="card"><label>เลือกดูประวัติตาม HUB / Area <select value={hub} onChange={(event) => setHub(event.target.value)}><option value="">ทุก HUB</option>{hubs.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div>

      <div className="responsive-desktop-table">
        <div className="table-wrap desktop-table-card">
          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>รอบเดือน</th>
                <th>HUB ณ วันที่นำเข้า</th>
                <th>กะ</th>
                <th>ยอด Incentive</th>
                <th>ยอดหัก</th>
                <th>ยอดสุทธิจาก Incentive</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td>{periodLabel({ month: r.period_month, year: r.period_year })}</td>
                  <td>{r.import_hub || r.hub_name || r.hub_id || '-'}</td>
                  <td>{r.shift_name || r.shift_code || formatShiftGroup(r.shift_group)}</td>
                  <td className="amount-text-gross">{money(r.gross_amount)}</td>
                  <td className="amount-text-deduction">{money(r.deduction_amount)}</td>
                  <td className="amount-text-net"><b>{money(r.net_amount)}</b></td>
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
                <h3>{periodLabel({ month: r.period_month, year: r.period_year })}</h3>
              </div>
              <span className="pill">{r.shift_name || r.shift_code || formatShiftGroup(r.shift_group)}</span>
            </div>
            <div className="mobile-info-grid data-grid">
              <div><span>HUB ณ วันที่นำเข้า</span><strong>{r.import_hub || r.hub_name || r.hub_id || '-'}</strong></div>
              <div className="history-amount-gross"><span>ยอด Incentive</span><strong>{money(r.gross_amount)}</strong></div>
              <div className="history-amount-deduction"><span>ยอดหัก</span><strong>{money(r.deduction_amount)}</strong></div>
              <div className="history-amount-net"><span>ยอดสุทธิ</span><strong>{money(r.net_amount)}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
