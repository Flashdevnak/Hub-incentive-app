'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import NotificationBell from '@/components/NotificationBell';
import type { Role, SessionUser } from '@/types';

const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  area_manager: 'ผู้จัดการ Area',
  hub_manager: 'ผู้จัดการ HUB',
  supervisor: 'Supervisor',
  staff: 'พนักงาน',
  viewer: 'ผู้ดูข้อมูล'
};

type IconName =
  | 'home'
  | 'file'
  | 'history'
  | 'message'
  | 'user'
  | 'shield'
  | 'upload'
  | 'archive'
  | 'users'
  | 'inbox'
  | 'audit'
  | 'chart'
  | 'check'
  | 'device'
  | 'logout';

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const staffNav: NavItem[] = [
  { href: '/dashboard', label: 'หน้าแรก', icon: 'home' },
  { href: '/incentive', label: 'รายละเอียด', icon: 'file' },
  { href: '/history', label: 'ย้อนหลัง', icon: 'history' },
  { href: '/notifications', label: 'แจ้งเตือน', icon: 'inbox' },
  { href: '/issues', label: 'แจ้งปัญหา', icon: 'message' },
  { href: '/account', label: 'บัญชี', icon: 'user' }
];

const adminNav: NavItem[] = [
  { href: '/admin', label: 'ภาพรวมระบบ', icon: 'home' },
  { href: '/admin/import', label: 'อัปโหลด Excel', icon: 'upload' },
  { href: '/manager/approvals', label: 'อนุมัติเปิดใช้งาน', icon: 'check' },
  { href: '/manager/devices', label: 'อนุมัติอุปกรณ์', icon: 'device' },
  { href: '/notifications', label: 'แจ้งเตือน', icon: 'inbox' },
  { href: '/admin/batches', label: 'ประวัตินำเข้า', icon: 'archive' },
  { href: '/admin/employees', label: 'ข้อมูลพนักงาน', icon: 'users' },
  { href: '/admin/issues', label: 'คำร้องตรวจสอบ', icon: 'inbox' },
  { href: '/admin/logs', label: 'Audit Log', icon: 'audit' }
];

const managerNav: NavItem[] = [
  { href: '/manager', label: 'ภาพรวมหัวหน้า', icon: 'home' },
  { href: '/manager/approvals', label: 'อนุมัติเปิดใช้งาน', icon: 'check' },
  { href: '/manager/devices', label: 'อนุมัติอุปกรณ์', icon: 'device' },
  { href: '/notifications', label: 'แจ้งเตือน', icon: 'inbox' },
  { href: '/manager/employees', label: 'รายชื่อพนักงาน', icon: 'users' },
  { href: '/manager/issues', label: 'คำร้องตรวจสอบ', icon: 'inbox' }
];

const adminRoles: Role[] = ['super_admin', 'admin'];
const managerRoles: Role[] = ['area_manager', 'hub_manager', 'supervisor'];

function isAdmin(role?: Role) {
  return !!role && adminRoles.includes(role);
}

function isManager(role?: Role) {
  return !!role && (adminRoles.includes(role) || managerRoles.includes(role));
}

function modeFromUser(user: SessionUser | null, fallback: 'staff' | 'admin' | 'manager') {
  if (isAdmin(user?.role)) return 'admin';
  if (isManager(user?.role)) return 'manager';
  return fallback;
}

function sectionsForMode(mode: 'staff' | 'admin' | 'manager'): NavSection[] {
  if (mode === 'admin') {
    return [
      { title: 'ระบบผู้ดูแล', items: adminNav },
      { title: 'มุมมองพนักงาน', items: staffNav }
    ];
  }

  if (mode === 'manager') {
    return [
      { title: 'ระบบหัวหน้า', items: managerNav },
      { title: 'มุมมองพนักงาน', items: staffNav }
    ];
  }

  return [{ title: 'เมนูหลัก', items: staffNav }];
}

function mobileNavForMode(mode: 'staff' | 'admin' | 'manager'): NavItem[] {
  if (mode === 'admin') {
    return [
      { href: '/admin', label: 'หน้าแรก', icon: 'home' },
      { href: '/admin/import', label: 'อัปโหลด', icon: 'upload' },
      { href: '/manager/approvals', label: 'อนุมัติ', icon: 'check' },
      { href: '/account', label: 'บัญชี', icon: 'user' }
    ];
  }

  if (mode === 'manager') {
    return [
      { href: '/manager', label: 'หน้าแรก', icon: 'home' },
      { href: '/manager/approvals', label: 'อนุมัติ', icon: 'check' },
      { href: '/manager/devices', label: 'อุปกรณ์', icon: 'device' },
      { href: '/account', label: 'บัญชี', icon: 'user' }
    ];
  }

  return [
    { href: '/dashboard', label: 'หน้าแรก', icon: 'home' },
    { href: '/incentive', label: 'รายละเอียด', icon: 'file' },
    { href: '/history', label: 'ย้อนหลัง', icon: 'history' },
    { href: '/account', label: 'บัญชี', icon: 'user' }
  ];
}

function homeHrefForMode(mode: 'staff' | 'admin' | 'manager') {
  if (mode === 'admin') return '/admin';
  if (mode === 'manager') return '/manager';
  return '/dashboard';
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
  if (href === '/admin') return pathname === '/admin';
  if (href === '/manager') return pathname === '/manager';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AppIcon({ name }: { name: IconName }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 10v10h13V10" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
      );

    case 'file':
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5" />
          <path d="M9.5 13h5" />
          <path d="M9.5 17h5" />
        </svg>
      );

    case 'history':
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 1 0 2.34-5.66" />
          <path d="M4 5v5h5" />
          <path d="M12 8v5l3 2" />
        </svg>
      );

    case 'message':
      return (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      );

    case 'user':
      return (
        <svg {...common}>
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
      );

    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
          <path d="M9 12l2 2 4-5" />
        </svg>
      );

    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      );

    case 'archive':
      return (
        <svg {...common}>
          <path d="M4 5h16v4H4z" />
          <path d="M6 9v10h12V9" />
          <path d="M10 13h4" />
        </svg>
      );

    case 'users':
      return (
        <svg {...common}>
          <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 11a3 3 0 0 0 0-6" />
          <path d="M18 20a5 5 0 0 0-3-4.5" />
        </svg>
      );

    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4z" />
          <path d="M4 14h4l2 3h4l2-3h4" />
        </svg>
      );

    case 'audit':
      return (
        <svg {...common}>
          <path d="M5 4h10l4 4v12H5z" />
          <path d="M15 4v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      );

    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-4" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <path d="M4 12.5 9 17l11-11" />
        </svg>
      );

    case 'device':
      return (
        <svg {...common}>
          <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M10 18h4" />
        </svg>
      );

    case 'logout':
      return (
        <svg {...common}>
          <path d="M10 6H6v12h4" />
          <path d="M14 8l4 4-4 4" />
          <path d="M8 12h10" />
        </svg>
      );
  }
}

export default function AppShell({
  children,
  area = 'staff'
}: {
  children: ReactNode;
  area?: 'staff' | 'admin' | 'manager';
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadMe() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json().catch(() => null);

        if (!alive) return;

        if (res.ok && json?.user) {
          setUser(json.user);
          return;
        }

        router.replace('/login');
      } catch {
        if (alive) router.replace('/login');
      } finally {
        if (alive) setLoadingUser(false);
      }
    }

    loadMe();

    return () => {
      alive = false;
    };
  }, [router]);

  const mode = modeFromUser(user, area);
  const sections = useMemo(() => sectionsForMode(mode), [mode]);
  const mobileNav = useMemo(() => mobileNavForMode(mode), [mode]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  const displayName = user?.employeeName || user?.employeeCode || (loadingUser ? 'กำลังโหลด...' : '-');
  const displayCode = user?.employeeCode || '-';
  const displayRole = user?.role ? roleLabels[user.role] : '-';

  return (
    <div className="layout app-layout">
      <aside className="side side-modern">
        <div className="brand-block">
          <div className="brand-monogram">NAK</div>

          <div>
            <h2>NAK Incentive</h2>
            <p>Employee Incentive System</p>
          </div>
        </div>

        <div className="user-panel">
          <span className="user-kicker">เข้าสู่ระบบโดย</span>
          <strong>{displayName}</strong>
          <span>รหัส: {displayCode}</span>
          <span className="role-badge">{displayRole}</span>
        </div>

        <nav className="nav nav-modern">
          {sections.map((section) => (
            <div className="nav-section" key={section.title}>
              <div className="nav-title">{section.title}</div>

              {section.items.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  className={isActive(pathname, item.href) ? 'active' : ''}
                >
                  <span className="nav-symbol">
                    <AppIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}

          <button className="logout-btn" onClick={logout}>
            <span className="nav-symbol">
              <AppIcon name="logout" />
            </span>
            <span>ออกจากระบบ</span>
          </button>
        </nav>
      </aside>

      <header className="desktop-topbar">
        <div className="desktop-topbar-title">
          <span>NAK Incentive</span>
          <strong>{displayName}</strong>
        </div>

        <div className="desktop-topbar-actions">
          {user && <NotificationBell />}
          <span className="role-badge">{displayRole}</span>
          <Link href="/account" className="desktop-account-btn">
            บัญชี
          </Link>
        </div>
      </header>

      <header className="mobile-topbar">
        <Link href={homeHrefForMode(mode)} className="mobile-brand mobile-brand-link">
          <div className="brand-monogram small">NAK</div>

          <div>
            <strong>NAK Incentive</strong>
            <span>{displayName}</span>
          </div>
        </Link>

        <div className="mobile-topbar-actions">
          {user && <NotificationBell compact />}
          <span className="role-badge">{displayRole}</span>
        </div>
      </header>

      <main className="main main-modern">{children}</main>

      <nav className="mobile-tabs mobile-tabs-modern">
        {mobileNav.map((item) => (
          <Link
            href={item.href}
            key={item.href}
            className={isActive(pathname, item.href) ? 'active' : ''}
          >
            <span className="mobile-tab-icon">
              <AppIcon name={item.icon} />
            </span>
            <b>{item.label}</b>
          </Link>
        ))}
      </nav>
    </div>
  );
}