import { NextRequest, NextResponse } from 'next/server';
import { verifySigned } from './crypto';
import type { SessionUser, Role } from '@/types';

export function ok(data: any = {}) { return NextResponse.json({ ok: true, ...data }); }
export function fail(message: string, status = 400, extra: any = {}) { return NextResponse.json({ ok: false, message, ...extra }, { status }); }

export function getSession(req: NextRequest): SessionUser | null {
  const token = req.cookies.get('nak_session')?.value;
  return verifySigned<SessionUser>(token);
}

export function requireAuth(req: NextRequest, roles?: Role[]) {
  const session = getSession(req);
  if (!session) throw new Error('UNAUTHORIZED');
  if (roles && !roles.includes(session.role)) throw new Error('FORBIDDEN');
  return session;
}

export function handleError(e: any) {
  const msg = String(e?.message || e || 'Unexpected error');
  if (msg === 'UNAUTHORIZED') return fail('กรุณาเข้าสู่ระบบใหม่', 401);
  if (msg === 'FORBIDDEN') return fail('ไม่มีสิทธิ์ใช้งานเมนูนี้', 403);
  return fail(msg, 500);
}
