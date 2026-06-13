import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { dedupeIncentiveRecordsByMonth } from '@/lib/incentiveRecords';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const shiftCode = String(req.nextUrl.searchParams.get('shiftCode') || '').trim();
    const shiftName = String(req.nextUrl.searchParams.get('shiftName') || '').trim();
    const shiftGroup = String(req.nextUrl.searchParams.get('shiftGroup') || '').trim();

    const snap = await db()
      .collection('incentive_records')
      .where('employee_code', '==', user.employeeCode)
      .orderBy('period_key', 'desc')
      .limit(80)
      .get();

    const rawRecords = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((record) => !shiftCode || String(record.shift_code || '').trim() === shiftCode)
      .filter((record) => !shiftName || String(record.shift_name || '').trim() === shiftName)
      .filter((record) => !shiftGroup || String(record.shift_group || '').trim() === shiftGroup);
    const records = dedupeIncentiveRecordsByMonth(rawRecords).slice(0, 24);

    return ok({ records, duplicateRecordsHidden: Math.max(0, rawRecords.length - records.length) });
  } catch (e) {
    return handleError(e);
  }
}
