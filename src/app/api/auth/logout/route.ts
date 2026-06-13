import { NextRequest } from 'next/server';
import { ok } from '@/lib/http';
export async function POST(req: NextRequest) {
  const res = ok({ message: 'ออกจากระบบแล้ว' });
  res.cookies.set('nak_session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
