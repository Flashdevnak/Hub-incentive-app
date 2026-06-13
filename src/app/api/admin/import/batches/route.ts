import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['super_admin', 'admin']);
    const snap = await db().collection('import_batches').orderBy('uploaded_at', 'desc').limit(100).get();
    const shiftCode = String(req.nextUrl.searchParams.get('shiftCode') || '').trim();
    const shiftName = String(req.nextUrl.searchParams.get('shiftName') || '').trim();
    const shiftGroup = String(req.nextUrl.searchParams.get('shiftGroup') || '').trim();
    const batches = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter((batch) => !shiftCode || String(batch.shift_code || '').trim() === shiftCode)
      .filter((batch) => !shiftName || String(batch.shift_name || '').trim() === shiftName)
      .filter((batch) => !shiftGroup || String(batch.shift_group || '').trim() === shiftGroup);

    return ok({ batches });
  } catch(e) { return handleError(e); }
}
