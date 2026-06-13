import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const month = Number(req.nextUrl.searchParams.get('month') || 0);
    const year = Number(req.nextUrl.searchParams.get('year') || 0);
    const shiftCode = String(req.nextUrl.searchParams.get('shiftCode') || '').trim();
    const shiftName = String(req.nextUrl.searchParams.get('shiftName') || '').trim();
    const shiftGroup = String(req.nextUrl.searchParams.get('shiftGroup') || '').trim();

    let q: FirebaseFirestore.Query = db()
      .collection('incentive_records')
      .where('employee_code', '==', user.employeeCode);

    if (month && year) {
      q = q.where('period_month', '==', month).where('period_year', '==', year);
    } else {
      q = q.orderBy('period_key', 'desc').limit(5);
    }

    const snap = await q.get();
    if (snap.empty) return ok({ record: null, message: 'ยังไม่พบข้อมูลรอบเดือนนี้' });

    const records = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((record) => !shiftCode || String(record.shift_code || '').trim() === shiftCode)
      .filter((record) => !shiftName || String(record.shift_name || '').trim() === shiftName)
      .filter((record) => !shiftGroup || String(record.shift_group || '').trim() === shiftGroup);

    return ok({ record: records[0] || null });
  } catch (e) {
    return handleError(e);
  }
}
