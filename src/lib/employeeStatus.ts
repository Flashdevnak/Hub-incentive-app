const activeLikeStatuses = new Set([
  'ACTIVE',
  'ENABLED',
  'APPROVED',
  'IMPORTED_ACTIVE',
  'ใช้งานอยู่',
  'ใช้งานได้',
  'ทำงานอยู่',
  '在職',
  '在职'
]);

const inactiveLikeStatuses = new Set([
  'RESIGNED',
  'INACTIVE',
  'SUSPENDED',
  'DISABLED',
  'DELETED',
  'ลาออก',
  'ไม่ใช้งาน',
  'ระงับใช้งาน',
  '离職',
  '离职'
]);

export function normalizeStatusValue(value: any) {
  return String(value || '').trim().toUpperCase();
}

export function isInactiveLikeStatus(value: any) {
  const raw = String(value || '').trim();
  return inactiveLikeStatuses.has(raw.toUpperCase()) || inactiveLikeStatuses.has(raw);
}

export function isActiveLikeStatus(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return activeLikeStatuses.has(raw.toUpperCase()) || activeLikeStatuses.has(raw);
}

export function normalizedEmploymentStatus(employee: any) {
  const status = employee?.employment_status;
  if (isInactiveLikeStatus(status)) return normalizeStatusValue(status);
  if (!String(status || '').trim() || isActiveLikeStatus(status)) return 'ACTIVE';
  return normalizeStatusValue(status);
}

export function isActiveEmployeeRecord(employee: any) {
  if (
    !employee ||
    employee.is_deleted === true ||
    employee.is_active === false
  ) {
    return false;
  }

  const employmentStatus = employee.employment_status;
  if (isInactiveLikeStatus(employmentStatus)) return false;

  if (!String(employmentStatus || '').trim()) return true;
  return isActiveLikeStatus(employmentStatus);
}

export function isExplicitInactiveEmployeeRecord(employee: any) {
  if (!employee || employee.is_deleted === true) return false;

  return [
    employee.employment_status
  ].some(isInactiveLikeStatus);
}

export function isUsableAccountRecord(account: any) {
  return String(account?.status || '').trim().toUpperCase() === 'ACTIVE';
}
