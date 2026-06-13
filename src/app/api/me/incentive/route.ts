import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const month = Number(req.nextUrl.searchParams.get('month') || 0);
    const year = Number(req.nextUrl.searchParams.get('year') || 0);
    let q: FirebaseFirestore.Query = db().collection('incentive_records').where('employee_code', '==', user.employeeCode);
    if (month && year) q = q.where('period_month', '==', month).where('period_year', '==', year);
    else q = q.orderBy('period_key', 'desc').limit(1);
    const snap = await q.get();
    if (snap.empty) return ok({ record: null, message: 'ยังไม่พบข้อมูลรอบเดือนนี้' });
    return ok({ record: { id: snap.docs[0].id, ...snap.docs[0].data() } });
  } catch (e) { return handleError(e); }
}
