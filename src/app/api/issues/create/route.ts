import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { topic, detail, periodMonth, periodYear } = await req.json();
    if (!topic || !detail) return fail('กรุณากรอกหัวข้อและรายละเอียด');
    const ref = await db().collection('issue_tickets').add({ employee_code: user.employeeCode, period_month: Number(periodMonth || 0), period_year: Number(periodYear || 0), topic, detail, status: 'รอตรวจสอบ', created_at: ts() });
    await audit(user.employeeCode, user.role, 'CREATE_ISSUE', 'issue', ref.id, { topic }, req);
    return ok({ message: 'ส่งคำร้องเรียบร้อย', id: ref.id });
  } catch (e) { return handleError(e); }
}
