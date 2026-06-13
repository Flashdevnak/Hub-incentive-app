import { db } from '@/lib/firebaseAdmin';
import { fail } from '@/lib/http';
import {
  approvalDeniedMessage,
  canApproveActivation,
  canApprovePinReset,
  canHandleIssue
} from '@/lib/rbac';
import type { Employee, SessionUser } from '@/types';

export async function employeeForCode(employeeCode?: string) {
  const code = String(employeeCode || '').trim().toUpperCase();
  if (!code) return null;

  const snap = await db().collection('employees').doc(code).get();
  if (!snap.exists) return { employee_code: code } as Employee;
  return { employee_code: code, ...snap.data() } as Employee;
}

export async function canSeeRequest(actor: SessionUser, request: any, kind: 'activation' | 'pin' | 'issue') {
  const employee = await employeeForCode(request.employee_code);
  if (kind === 'activation') return canApproveActivation(actor, employee);
  if (kind === 'pin') return canApprovePinReset(actor, employee);
  return canHandleIssue(actor, employee);
}

export async function filterRequestsByScope<T extends { employee_code?: string }>(
  actor: SessionUser,
  requests: T[],
  kind: 'activation' | 'pin' | 'issue'
) {
  const checked = await Promise.all(
    requests.map(async (request) => ({
      request,
      allowed: await canSeeRequest(actor, request, kind)
    }))
  );

  return checked.filter((item) => item.allowed).map((item) => item.request);
}

export async function assertCanApprove(actor: SessionUser, employeeCode: string, kind: 'activation' | 'pin' | 'issue') {
  const employee = await employeeForCode(employeeCode);
  const allowed =
    kind === 'activation'
      ? canApproveActivation(actor, employee)
      : kind === 'pin'
        ? canApprovePinReset(actor, employee)
        : canHandleIssue(actor, employee);

  if (!allowed) {
    return fail(approvalDeniedMessage, 403, {
      reason: 'คุณไม่มีสิทธิ์อนุมัติรายการนี้ เนื่องจากอยู่นอก Scope'
    });
  }

  return null;
}
