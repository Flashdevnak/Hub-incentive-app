import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['super_admin','admin']);
    const snap = await db().collection('audit_logs').orderBy('created_at','desc').limit(200).get();
    return ok({ logs: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch(e) { return handleError(e); }
}
