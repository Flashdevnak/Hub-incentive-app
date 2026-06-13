function toMs(value: any) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return 0;
}

export function getHistoryDedupeKey(record: any) {
  const employeeCode = String(record.employee_code || '').trim().toUpperCase();
  const year = String(record.period_year || record.year || '').trim();
  const month = String(record.period_month || record.month || '').trim().padStart(2, '0');
  const hub = String(record.hub_id || record.hub_name || '').trim().toUpperCase();

  return [employeeCode, year, month, hub].join('|');
}

function latestScore(record: any) {
  return [
    toMs(record.imported_at),
    toMs(record.confirmed_at),
    toMs(record.created_at),
    Number(record.import_version || record.version_no || record.version || 0),
    toMs(record.updated_at),
    String(record.id || '')
  ] as const;
}

export function pickLatestIncentiveRecord(records: any[]) {
  return [...records].sort((a, b) => {
    const left = latestScore(a);
    const right = latestScore(b);

    for (let i = 0; i < left.length; i++) {
      if (typeof left[i] === 'number' && typeof right[i] === 'number') {
        if (right[i] !== left[i]) return (right[i] as number) - (left[i] as number);
      } else {
        const compared = String(right[i]).localeCompare(String(left[i]));
        if (compared) return compared;
      }
    }

    return 0;
  })[0] || null;
}

export function dedupeIncentiveRecordsByMonth(records: any[]) {
  const groups = new Map<string, any[]>();

  for (const record of records) {
    const key = getHistoryDedupeKey(record);
    groups.set(key, [...(groups.get(key) || []), record]);
  }

  return Array.from(groups.values())
    .map((group) => pickLatestIncentiveRecord(group))
    .filter(Boolean)
    .sort((a, b) => {
      const periodDiff = String(b.period_key || '').localeCompare(String(a.period_key || ''));
      if (periodDiff) return periodDiff;
      return toMs(b.imported_at || b.confirmed_at || b.created_at) - toMs(a.imported_at || a.confirmed_at || a.created_at);
    });
}
