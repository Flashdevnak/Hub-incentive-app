import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const snap = await db().collection('issue_tickets').where('employee_code', '==', user.employeeCode).orderBy('created_at', 'desc').limit(50).get();
    return ok({ issues: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) { return handleError(e); }
}
