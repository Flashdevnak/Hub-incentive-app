import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const snap = await db().collection('incentive_records').where('employee_code', '==', user.employeeCode).orderBy('period_key', 'desc').limit(24).get();
    return ok({ records: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) { return handleError(e); }
}
