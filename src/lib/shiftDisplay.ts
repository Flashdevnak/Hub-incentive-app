export function formatShiftSource(source: any) {
  const value = String(source || '').trim().toUpperCase();
  if (!value) return '-';
  if (value === 'EXCEL') return 'จากระบบ HCM';
  if (value === 'EMPLOYEE_MASTER') return 'จากข้อมูลพนักงาน';
  if (value === 'MANUAL') return 'ตั้งค่าเอง';
  if (value === 'UNKNOWN') return 'ไม่ระบุ';
  return value;
}

export function formatShiftSourceFull(source: any) {
  const value = String(source || '').trim().toUpperCase();
  if (!value) return '-';
  if (value === 'EXCEL') return 'ข้อมูลกะจากระบบ HCM';
  if (value === 'EMPLOYEE_MASTER') return 'ใช้ข้อมูลกะจากข้อมูลพนักงานในระบบ';
  if (value === 'MANUAL') return 'กะถูกตั้งค่าเองโดยผู้ดูแลระบบ';
  if (value === 'UNKNOWN') return 'ยังไม่มีข้อมูลกะ';
  return formatShiftSource(value);
}

export function formatShiftGroup(group: any) {
  const value = String(group || '').trim().toUpperCase();
  if (!value || value === 'UNKNOWN') return '-';
  if (value === 'DAY') return 'กะกลางวัน';
  if (value === 'EARLY') return 'กะเช้า';
  if (value === 'AFTERNOON' || value === 'EVENING') return 'กะเย็น';
  if (value === 'NIGHT') return 'กะกลางคืน';
  return String(group);
}
