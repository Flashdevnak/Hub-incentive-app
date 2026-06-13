'use client';

import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money } from '@/lib/uiData';

const quickLinks = [
  {
    href: '/admin/import',
    title: 'อัปโหลด Excel',
    desc: 'นำเข้าไฟล์ Incentive และตรวจ Mapping ก่อนยืนยันข้อมูล'
  },
  {
    href: '/manager/approvals',
    title: 'อนุมัติเปิดใช้งาน',
    desc: 'ตรวจและอนุมัติคำขอเปิดใช้งานครั้งแรกของพนักงาน'
  },
  {
    href: '/manager/pin-resets',
    title: 'อนุมัติรีเซ็ต PIN',
    desc: 'ตรวจคำขอลืม PIN และอนุมัติให้พนักงานตั้ง PIN ใหม่'
  },
  {
    href: '/admin/batches',
    title: 'ประวัตินำเข้า',
    desc: 'ตรวจรอบข้อมูลย้อนหลัง ดูไฟล์ที่เคยนำเข้า และสถานะการ Import'
  },
  {
    href: '/admin/employees',
    title: 'ข้อมูลพนักงาน / สิทธิ์',
    desc: 'จัดการบัญชีพนักงาน, Admin, Manager, Supervisor และ Scope การมองเห็น'
  },
  {
    href: '/admin/issues',
    title: 'คำร้องตรวจสอบ',
    desc: 'ติดตามปัญหาที่พนักงานแจ้งเกี่ยวกับข้อมูล Incentive'
  },
  {
    href: '/admin/logs',
    title: 'Audit Log',
    desc: 'ตรวจประวัติการเข้าใช้งานและการกระทำสำคัญในระบบ'
  }
];

export default function Admin() {
  const { data, loading, error } = useApi<any>('/api/manager/dashboard');
  const s = data?.summary || {};
  const shiftSummary = data?.shiftSummary || [];

  return (
    <AppShell area="admin">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>ภาพรวมระบบ</h1>
          <p className="muted">จัดการข้อมูล Incentive, พนักงาน, สิทธิ์, คำร้อง และประวัติระบบ</p>
        </div>

        <Link className="btn" href="/admin/import">
          อัปโหลด Excel
        </Link>
      </div>

      {loading && <div className="notice">กำลังโหลดข้อมูล...</div>}
      {error && <div className="notice danger">{error}</div>}

      <div className="grid grid-3 admin-stats-grid">
        <Link className="card kpi-card" href="/admin/employees">
          <div className="label">พนักงานทั้งหมด</div>
          <div className="kpi">{s.employees || 0}</div>
          <p className="muted small">จำนวนพนักงานในระบบ</p>
        </Link>

        <Link className="card kpi-card" href="/admin/employees">
          <div className="label">บัญชีทั้งหมด</div>
          <div className="kpi">{s.accounts || 0}</div>
          <p className="muted small">บัญชีที่เปิดใช้งานหรือรอจัดการ</p>
        </Link>

        <Link className="card kpi-card approval-kpi-card" href="/manager/approvals">
          <div className="label">รออนุมัติ</div>
          <div className="kpi">{s.pendingActivation || 0}</div>
          <p className="muted small">คำขอเปิดใช้งานที่รอตรวจสอบ</p>
        </Link>
      </div>

      {Number(s.pendingActivation || 0) > 0 && (
        <div className="notice approval-notice">
          มีคำขอเปิดใช้งานรออนุมัติ {s.pendingActivation} รายการ
          <Link className="btn btn-secondary" href="/manager/approvals">
            ไปหน้าอนุมัติ
          </Link>
        </div>
      )}

      <h2 className="section-title">เมนูจัดการระบบ</h2>

      <div className="grid admin-menu-grid">
        {quickLinks.map((item) => (
          <Link className="card menu-card" href={item.href} key={item.href}>
            <strong>{item.title}</strong>
            <span>{item.desc}</span>
          </Link>
        ))}
      </div>

      <div className="card role-guide-card">
        <h3>การใช้สิทธิ์ Manager / Supervisor</h3>
        <p className="muted">
          สิทธิ์ของผู้ใช้ไม่ได้อิงจากชื่อไฟล์ แต่กำหนดจากบัญชีใน Firestore collection
          <b> user_accounts.role </b>
          โดย Admin สามารถตั้งค่าได้ที่เมนู “ข้อมูลพนักงาน / สิทธิ์”
        </p>

        <div className="role-guide-grid">
          <div>
            <strong>area_manager</strong>
            <span>เห็นข้อมูลตาม Area เช่น NE1 / NE4</span>
          </div>
          <div>
            <strong>hub_manager</strong>
            <span>เห็นข้อมูลตาม HUB เช่น TH27101500 หรือ 26NAK_BHUB</span>
          </div>
          <div>
            <strong>supervisor</strong>
            <span>แนะนำใช้ Scope Type = HUB ถ้าเป็น Hub Supervisor</span>
          </div>
          <div>
            <strong>staff</strong>
            <span>เห็นเฉพาะข้อมูลของตัวเอง</span>
          </div>
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
