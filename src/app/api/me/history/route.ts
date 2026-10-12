import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { dedupeIncentiveRecordsByMonth } from '@/lib/incentiveRecords';
import { publishedIncentiveRecords } from '@/lib/publishedIncentives';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const hub = String(req.nextUrl.searchParams.get('hub') || '').trim().toUpperCase();
    const shiftCode = String(req.nextUrl.searchParams.get('shiftCode') || '').trim();
    const shiftName = String(req.nextUrl.searchParams.get('shiftName') || '').trim();
    const shiftGroup = String(req.nextUrl.searchParams.get('shiftGroup') || '').trim();

    const snap = await db()
      .collection('incentive_records')
      .where('employee_code', '==', user.employeeCode)
      .orderBy('period_key', 'desc')
      .limit(300)
      .get();

    const rawRecords = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((record) => !shiftCode || String(record.shift_code || '').trim() === shiftCode)
      .filter((record) => !shiftName || String(record.shift_name || '').trim() === shiftName)
      .filter((record) => !shiftGroup || String(record.shift_group || '').trim() === shiftGroup);
    const published = await publishedIncentiveRecords(rawRecords);
    const allRecords = dedupeIncentiveRecordsByMonth(published.records);
    const hubs = [...new Set(allRecords.map((r) => String(r.import_hub || r.hub_name || r.hub_id || '').trim().toUpperCase()).filter(Boolean))].sort();
    const records = allRecords.filter((r) => !hub || String(r.import_hub || r.hub_name || r.hub_id || '').trim().toUpperCase() === hub).slice(0, 100);

    return ok({ records, hubs, duplicateRecordsHidden: Math.max(0, published.records.length - allRecords.length), unpublishedRecordsHidden: published.unpublishedHidden, missingBatchHidden: published.missingBatchHidden });
  } catch (e) {
    return handleError(e);
  }
}
