import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { fail, ok } from '@/lib/http';
import { normalizeCode, normalizeDate } from '@/lib/crypto';

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const { employeeCode: rawCode, startDate } = await req.json();
    const employeeCode = normalizeCode(rawCode || '');
    const normalizedStart = normalizeDate(startDate || '');

    if (!employeeCode) return fail('กรุณากรอกรหัสพนักงาน');
    if (!normalizedStart) return fail('กรุณาเลือกวันเริ่มงาน');

    const empSnap = await db().collection('employees').doc(employeeCode).get();
    if (!empSnap.exists) return fail('ไม่พบข้อมูลพนักงาน');

    const emp = empSnap.data() || {};
    if (normalizeDate(emp.start_date || '') !== normalizedStart) {
      return fail('วันเริ่มงานไม่ตรงกับข้อมูลในระบบ');
    }

    const accountSnap = await db().collection('user_accounts').doc(employeeCode).get();
    const account = accountSnap.exists ? accountSnap.data() || {} : null;

    if (account?.status === 'ACTIVE') {
      return ok({
        status: 'ACTIVE',
        title: 'เปิดใช้งานแล้ว',
        message: 'บัญชีของคุณเปิดใช้งานแล้ว สามารถเข้าสู่ระบบได้',
        actionUrl: '/login'
      });
    }

    if (account?.status === 'PIN_REQUIRED') {
      return ok({
        status: 'APPROVED',
        title: 'อนุมัติแล้ว',
        message: 'คำขอของคุณได้รับอนุมัติแล้ว กรุณาตั้ง PIN เพื่อเข้าใช้งาน',
        actionUrl: '/set-pin'
      });
    }

    const reqSnap = await db()
      .collection('activation_requests')
      .where('employee_code', '==', employeeCode)
      .limit(20)
      .get();

    const requests = reqSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => toMs(b.requested_at || b.approved_at) - toMs(a.requested_at || a.approved_at));

    const latest: any = requests[0];

    if (!latest) {
      return ok({
        status: 'NONE',
        title: 'ยังไม่พบคำขอ',
        message: 'ยังไม่พบคำขอเปิดใช้งานของรหัสนี้ กรุณากดส่งคำขอเปิดใช้งานครั้งแรก',
        actionUrl: '/activate'
      });
    }

    if (latest.status === 'APPROVED') {
      return ok({
        status: 'APPROVED',
        title: 'อนุมัติแล้ว',
        message: 'คำขอของคุณได้รับอนุมัติแล้ว กรุณาตั้ง PIN เพื่อเข้าใช้งาน',
        actionUrl: '/set-pin'
      });
    }

    if (latest.status === 'REJECTED') {
      return ok({
        status: 'REJECTED',
        title: 'ไม่ผ่านการอนุมัติ',
        message: latest.rejected_reason ? `เหตุผล: ${latest.rejected_reason}` : 'คำขอของคุณไม่ผ่าน กรุณาติดต่อหัวหน้าหรือ Admin',
        actionUrl: '/activate'
      });
    }

    return ok({
      status: 'PENDING',
      title: 'รออนุมัติ',
      message: 'ส่งคำขอแล้ว กรุณารอหัวหน้าหรือ Admin ตรวจสอบ',
      actionUrl: ''
    });
  } catch (e: any) {
    return fail(String(e?.message || e || 'ตรวจสถานะไม่สำเร็จ'), 500);
  }
}
