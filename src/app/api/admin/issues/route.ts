import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { assertCanApprove, filterRequestsByScope } from '@/lib/approvalScope';

const issueRoles = ['super_admin', 'admin', 'area_manager', 'hub_manager', 'supervisor'] as const;

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, [...issueRoles]);
    const snap = await db().collection('issue_tickets').orderBy('created_at', 'desc').limit(200).get();
    const issues = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

    return ok({ issues: await filterRequestsByScope(user, issues, 'issue') });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, [...issueRoles]);
    const { id, status, resolutionNote } = await req.json();
    if (!id) return fail('ไม่พบรหัสคำร้อง');

    const ref = db().collection('issue_tickets').doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return fail('ไม่พบคำร้อง');

    const issue = snap.data() || {};
    const denied = await assertCanApprove(user, issue.employee_code || '', 'issue');
    if (denied) return denied;

    await ref.set(
      {
        status,
        resolution_note: resolutionNote || '',
        resolved_by: user.employeeCode,
        resolved_at: ts()
      },
      { merge: true }
    );

    return ok({ message: 'อัปเดตคำร้องแล้ว' });
  } catch (e) {
    return handleError(e);
  }
}
