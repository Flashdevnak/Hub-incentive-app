'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const staffNav = [
  ['/dashboard','หน้าแรก'],['/incentive','รายละเอียด'],['/history','ย้อนหลัง'],['/issues','แจ้งปัญหา'],['/account','บัญชี']
];
const adminNav = [
  ['/admin','Dashboard รวม'],['/admin/import','อัปโหลด Excel'],['/admin/batches','ประวัตินำเข้า'],['/admin/employees','พนักงาน'],['/admin/issues','คำร้อง'],['/admin/logs','Audit Log']
];
const managerNav = [
  ['/manager','Dashboard HUB'],['/manager/approvals','อนุมัติเปิดใช้งาน'],['/manager/devices','อนุมัติอุปกรณ์'],['/manager/employees','รายชื่อพนักงาน'],['/manager/issues','คำร้อง']
];

export default function AppShell({ children, area='staff' }: { children: React.ReactNode; area?: 'staff'|'admin'|'manager' }) {
  const router = useRouter();
  const nav = area === 'admin' ? adminNav : area === 'manager' ? managerNav : staffNav;
  async function logout(){ await fetch('/api/auth/logout',{method:'POST'}); router.push('/login'); }
  return <div className="layout">
    <aside className="side"><h2>NAK Incentive</h2><p className="muted">เว็บแอปภาษาไทย</p><nav className="nav">{nav.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}<button onClick={logout}>ออกจากระบบ</button></nav></aside>
    <main className="main">{children}</main>
    <nav className="mobile-tabs">{staffNav.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav>
  </div>
}
