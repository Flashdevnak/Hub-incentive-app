import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { fail, ok } from '@/lib/http';
import { normalizeCode } from '@/lib/crypto';
import { notifyPinResetPending } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const employeeCode = normalizeCode(body.employeeCode);
    const startDate = String(body.startDate || '').trim();
    const reason = String(body.reason || '').trim();

    if (!employeeCode) return fail('กรุณากรอกรหัสพนักงาน');
    if (!startDate) return fail('กรุณากรอกวันเริ่มงานเพื่อยืนยันตัวตน');

    const empRef = db().collection('employees').doc(employeeCode);
    const empSnap = await empRef.get();

    if (!empSnap.exists) return fail('ไม่พบข้อมูลพนักงาน', 404);

    const emp = empSnap.data() || {};
    const employeeStartDate = String(emp.start_date || '').trim();

    if (employeeStartDate && employeeStartDate !== startDate) {
      return fail('ข้อมูลวันเริ่มงานไม่ตรงกับระบบ กรุณาตรวจสอบอีกครั้ง', 403);
    }

    const accountSnap = await db().collection('user_accounts').doc(employeeCode).get();
    if (!accountSnap.exists) return fail('ยังไม่มีบัญชีใช้งาน กรุณาขอเปิดใช้งานครั้งแรกก่อน', 404);

    const pendingSnap = await db()
      .collection('pin_reset_requests')
      .where('employee_code', '==', employeeCode)
      .where('status', '==', 'PENDING')
      .limit(1)
      .get();

    if (!pendingSnap.empty) {
      return ok({ message: 'มีคำขอรีเซ็ต PIN ที่รออนุมัติอยู่แล้ว' });
    }

    const ref = await db().collection('pin_reset_requests').add({
      employee_code: employeeCode,
      employee_name: emp.employee_name || '',
      start_date_input: startDate,
      reason,
      status: 'PENDING',
      requested_at: ts(),
      updated_at: ts()
    });

    await notifyPinResetPending({
      employeeCode,
      employeeName: emp.employee_name || '',
      requestId: ref.id,
      reason
    });

    return ok({ message: 'ส่งคำขอรีเซ็ต PIN แล้ว กรุณารอการอนุมัติ' });
  } catch (e) {
    console.error(e);
    return fail('ส่งคำขอรีเซ็ต PIN ไม่สำเร็จ');
  }
}
