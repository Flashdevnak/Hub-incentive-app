import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';
import { filterRequestsByScope } from '@/lib/approvalScope';

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);

    // ไม่ใช้ orderBy ตรงนี้ เพื่อไม่ให้เอกสารเก่าที่ไม่มี requested_at หายจากรายการ
    const snap = await db()
      .collection('activation_requests')
      .where('status', '==', 'PENDING')
      .limit(200)
      .get();

    const requests = snap.docs
      .map((d) => {
        const data = d.data();

        return {
          id: d.id,
          employee_code: data.employee_code || '',
          employee_name: data.employee_name || '',
          hub_name: data.hub_name || data.hub_id || '',
          start_date_input: data.start_date_input || data.start_date || '',
          device_info: data.device_info || data.device_name || '',
          requested_at: data.requested_at || null,
          status: data.status || ''
        };
      })
      .sort((a, b) => toMs(b.requested_at) - toMs(a.requested_at));

    return ok({ requests: await filterRequestsByScope(user, requests, 'activation') });
  } catch (e) {
    return handleError(e);
  }
}
