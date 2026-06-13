import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const empSnap = await db().collection('employees').doc(user.employeeCode).get();
    const latestSnap = await db().collection('incentive_records').where('employee_code', '==', user.employeeCode).orderBy('period_key', 'desc').limit(1).get();
    const latest = latestSnap.empty ? null : { id: latestSnap.docs[0].id, ...latestSnap.docs[0].data() };
    return ok({ employee: empSnap.data() || {}, latest, notice: 'หมายเหตุ: ยอดที่แสดงเป็นข้อมูลจากไฟล์ Incentive เท่านั้น ยังไม่รวมรายได้จากเบี้ยขยัน และอาจยังไม่ใช่ยอดรายได้สุทธิทั้งหมดของพนักงาน' });
  } catch (e) { return handleError(e); }
}
