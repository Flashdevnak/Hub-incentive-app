import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['super_admin', 'admin']);
    const snap = await db().collection('import_batches').orderBy('uploaded_at', 'desc').limit(100).get();
    return ok({ batches: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch(e) { return handleError(e); }
}
