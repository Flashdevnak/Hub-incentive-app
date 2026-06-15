export function formatShiftSource(source: any) {
  const value = String(source || '').trim().toUpperCase();
  if (!value || value === 'UNKNOWN') return '-';
  return 'กะ';
}

export function formatShiftSourceFull(source: any) {
  return formatShiftSource(source);
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
