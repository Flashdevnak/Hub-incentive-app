import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, [...managerRoles]);
    const snap = await db().collection('activation_requests').where('status', '==', 'PENDING').orderBy('requested_at', 'desc').limit(100).get();
    return ok({ requests: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch(e) { return handleError(e); }
}
