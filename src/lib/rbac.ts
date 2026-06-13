import type { SessionUser, Employee } from '@/types';

export function canAccessEmployee(user: SessionUser, employee?: Employee | null, employeeCode?: string) {
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (!employee && employeeCode && user.scopeType === 'SELF') return user.employeeCode === employeeCode;
  if (!employee) return false;
  if (user.scopeType === 'SELF') return user.employeeCode === employee.employee_code;
  if (user.scopeType === 'HUB') return employee.hub_name === user.scopeValue || employee.hub_id === user.scopeValue;
  if (user.scopeType === 'AREA') return employee.area === user.scopeValue;
  if (user.scopeType === 'SHIFT') return employee.shift_code === user.scopeValue || employee.shift_name === user.scopeValue || employee.shift_group === user.scopeValue;
  if (user.scopeType === 'TEAM') return employee.team === user.scopeValue || employee.team_name === user.scopeValue || employee.shift_code === user.scopeValue || employee.shift_group === user.scopeValue;
  return false;
}

export const approvalDeniedMessage = 'ไม่มีสิทธิ์อนุมัติรายการนี้';

export function canApproveActivation(user: SessionUser, employee?: Employee | null) {
  if (user.role === 'staff') return false;
  return canAccessEmployee(user, employee);
}

export function canApprovePinReset(user: SessionUser, employee?: Employee | null) {
  if (user.role === 'staff') return false;
  return canAccessEmployee(user, employee);
}

export function canManageEmployee(user: SessionUser, employee?: Employee | null) {
  if (user.role === 'staff') return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  return canAccessEmployee(user, employee);
}

export function canHandleIssue(user: SessionUser, employee?: Employee | null) {
  if (user.role === 'staff') return false;
  return canAccessEmployee(user, employee);
}

export function canConfirmImport(user: SessionUser, target?: Partial<Employee> | null) {
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (!target) return false;
  return canAccessEmployee(user, target as Employee);
}

export const managerRoles = ['super_admin', 'admin', 'area_manager', 'hub_manager', 'supervisor'] as const;
export const adminRoles = ['super_admin', 'admin'] as const;
