'use client';

import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';

const quickLinks = [
  {
    href: '/admin/import',
    title: 'อัปโหลด Excel',
    desc: 'นำเข้าไฟล์ Incentive และตรวจ Mapping ก่อนยืนยันข้อมูล'
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

  return (
    <AppShell area="admin">
      <div className="page-head">
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

      <div className="grid grid-3">
        <div className="card kpi-card">
          <div className="label">พนักงานทั้งหมด</div>
          <div className="kpi">{s.employees || 0}</div>
          <p className="muted small">จำนวนพนักงานในระบบ</p>
        </div>

        <div className="card kpi-card">
          <div className="label">บัญชีทั้งหมด</div>
          <div className="kpi">{s.accounts || 0}</div>
          <p className="muted small">บัญชีที่เปิดใช้งานหรือรอจัดการ</p>
        </div>

        <div className="card kpi-card">
          <div className="label">รออนุมัติ</div>
          <div className="kpi">{s.pendingActivation || 0}</div>
          <p className="muted small">คำขอเปิดใช้งานที่รอตรวจสอบ</p>
        </div>
      </div>

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
            <span>เห็นข้อมูลตาม HUB เช่น 26NAK_BHUB</span>
          </div>
          <div>
            <strong>supervisor</strong>
            <span>ใช้ดูแลทีม/กะ/กลุ่มงาน ตาม scope ที่ Admin กำหนด</span>
          </div>
          <div>
            <strong>staff</strong>
            <span>เห็นเฉพาะข้อมูลของตัวเอง</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
