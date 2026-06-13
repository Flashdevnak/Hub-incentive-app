import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['super_admin','admin','area_manager','hub_manager','supervisor']);
    const snap = await db().collection('employees').limit(500).get();
    return ok({ employees: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch(e) { return handleError(e); }
}
