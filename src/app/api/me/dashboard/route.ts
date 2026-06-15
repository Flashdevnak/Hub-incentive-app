import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { dedupeIncentiveRecordsByMonth } from '@/lib/incentiveRecords';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const empSnap = await db().collection('employees').doc(user.employeeCode).get();
    const latestSnap = await db()
      .collection('incentive_records')
      .where('employee_code', '==', user.employeeCode)
      .orderBy('period_key', 'desc')
      .limit(20)
      .get();

    const employee = (empSnap.data() || {}) as any;
    const latestRecords = latestSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    const latest = dedupeIncentiveRecordsByMonth(latestRecords)[0] || null;
    const shift = (latest || employee) as any;

    return ok({
      employee,
      latest,
      shiftInfo: {
        shift_code: shift?.shift_code || '',
        shift_name: shift?.shift_name || '',
        shift_group: shift?.shift_group || ''
      },
      notice: 'ยอดที่แสดงเป็นข้อมูลจากไฟล์นำเข้าล่าสุด ยังไม่รวมรายได้อื่น เช่น เบี้ยขยันหรือรายการนอกระบบ'
    });
  } catch (e) {
    return handleError(e);
  }
}
