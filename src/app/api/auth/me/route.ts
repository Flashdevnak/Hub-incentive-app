import { NextRequest } from 'next/server';
import { getSession, ok, fail } from '@/lib/http';
export async function GET(req: NextRequest) {
  const user = getSession(req);
  if (!user) return fail('ยังไม่ได้เข้าสู่ระบบ', 401);
  return ok({ user });
}
