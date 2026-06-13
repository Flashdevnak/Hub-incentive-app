import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
import { managerRoles } from '@/lib/rbac';
import { filterRequestsByScope } from '@/lib/approvalScope';

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, [...managerRoles]);

    const snap = await db()
      .collection('pin_reset_requests')
      .where('status', '==', 'PENDING')
      .limit(200)
      .get();

    const requests = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => toMs(b.requested_at) - toMs(a.requested_at));

    return ok({ requests: await filterRequestsByScope(user, requests as any[], 'pin') });
  } catch (e) {
    return handleError(e);
  }
}
