import './globals.css';
import { appName } from '@/lib/uiData';
export const metadata = { title: appName, description: 'ระบบตรวจสอบ Incentive พนักงาน' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th"><body>{children}</body></html>;
}
