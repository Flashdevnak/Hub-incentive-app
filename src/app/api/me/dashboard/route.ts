import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const empSnap = await db().collection('employees').doc(user.employeeCode).get();
    const latestSnap = await db()
      .collection('incentive_records')
      .where('employee_code', '==', user.employeeCode)
      .orderBy('period_key', 'desc')
      .limit(1)
      .get();

    const employee = (empSnap.data() || {}) as any;
    const latest = latestSnap.empty ? null : ({ id: latestSnap.docs[0].id, ...latestSnap.docs[0].data() } as any);
    const shift = (latest || employee) as any;

    return ok({
      employee,
      latest,
      shiftInfo: {
        shift_code: shift?.shift_code || '',
        shift_name: shift?.shift_name || '',
        shift_group: shift?.shift_group || '',
        shift_source: shift?.shift_source || (employee?.shift_code ? 'EMPLOYEE_MASTER' : 'UNKNOWN')
      },
      notice: 'หมายเหตุ: ยอดที่แสดงเป็นข้อมูลจากไฟล์ Incentive เท่านั้น ยังไม่รวมรายได้จากเบี้ยขยัน และอาจยังไม่ใช่ยอดรายได้สุทธิทั้งหมดของพนักงาน'
    });
  } catch (e) {
    return handleError(e);
  }
}
