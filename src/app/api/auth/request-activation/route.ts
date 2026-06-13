import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok } from '@/lib/http';
import { normalizeCode, normalizeDate } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  const { employeeCode: rawCode, startDate, deviceId, deviceInfo } = await req.json();
  const employeeCode = normalizeCode(rawCode);
  const normalizedStart = normalizeDate(startDate);
  const empSnap = await db().collection('employees').doc(employeeCode).get();
  if (!empSnap.exists) return fail('ไม่พบข้อมูลพนักงาน กรุณาตรวจสอบรหัสพนักงาน หรือติดต่อหัวหน้า');
  const emp = empSnap.data()!;
  if (normalizeDate(emp.start_date || '') !== normalizedStart) return fail('วันเริ่มงานไม่ตรงกับข้อมูลในระบบ');
  const existing = await db().collection('activation_requests').where('employee_code', '==', employeeCode).where('status', '==', 'PENDING').limit(1).get();
  if (!existing.empty) return ok({ message: 'มีคำขอรออนุมัติอยู่แล้ว', requestId: existing.docs[0].id });
  const ref = await db().collection('activation_requests').add({
    employee_code: employeeCode,
    employee_name: emp.employee_name || '',
    hub_name: emp.hub_name || '',
    start_date_input: normalizedStart,
    device_fingerprint: deviceId || '',
    device_info: deviceInfo || req.headers.get('user-agent') || '',
    status: 'PENDING',
    requested_at: ts()
  });
  return ok({ message: 'ส่งคำขอเปิดใช้งานเรียบร้อย กรุณารอหัวหน้า/Admin อนุมัติ', requestId: ref.id });
}
