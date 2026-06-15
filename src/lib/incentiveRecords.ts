export function toMs(value: any) {
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

export function isValidIncentiveRecord(record: any) {
  const status = String(record?.import_status || record?.status || '').trim().toUpperCase();

  if (!record || record.is_deleted === true) return false;
  if (status === 'FAILED' || status === 'ERROR' || status === 'DELETED') return false;
  return true;
}

export function getPeriodKey(record: any) {
  const year = Number(record.period_year || record.year || 0);
  const month = Number(record.period_month || record.month || 0);

  if (!year || !month) return '';
  return `${year}${String(month).padStart(2, '0')}`;
}

export function periodFromKey(periodKey: string) {
  const key = String(periodKey || '').trim();
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(4, 6));

  if (!year || !month) return null;
  return { key, year, month };
}

export function importedPeriods(records: any[]) {
  const periods = new Map<string, { key: string; year: number; month: number }>();

  for (const record of records.filter(isValidIncentiveRecord)) {
    const key = getPeriodKey(record);
    const period = periodFromKey(key);
    if (period) periods.set(key, period);
  }

  return Array.from(periods.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export function dedupeIncentiveRecordsByMonth(records: any[]) {
  const groups = new Map<string, any[]>();

  for (const record of records.filter(isValidIncentiveRecord)) {
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

function shiftKey(data: any) {
  return String(data.shift_code || data.shift_name || data.shift_group || '').trim();
}

export function buildShiftSummaryForPeriod(records: any[], selectedPeriodKey?: string) {
  const periods = importedPeriods(records);
  const periodKey = selectedPeriodKey && periods.some((period) => period.key === selectedPeriodKey)
    ? selectedPeriodKey
    : periods[0]?.key || '';

  const latestRecords = dedupeIncentiveRecordsByMonth(records)
    .filter((record) => getPeriodKey(record) === periodKey);
  const shiftMap = new Map<string, any>();

  for (const record of latestRecords) {
    const key = shiftKey(record);
    if (!key) continue;

    const row = shiftMap.get(key) || {
      shift_code: record.shift_code || key,
      shift_name: record.shift_name || record.shift_code || key,
      shift_group: record.shift_group || '',
      employees: 0,
      gross_amount: 0,
      deduction_amount: 0,
      net_amount: 0
    };

    row.employees++;
    row.gross_amount += Number(record.gross_amount || 0);
    row.deduction_amount += Number(record.deduction_amount || 0);
    row.net_amount += Number(record.net_amount || 0);
    shiftMap.set(key, row);
  }

  return {
    selectedPeriod: periodFromKey(periodKey),
    periodOptions: periods,
    shiftSummary: Array.from(shiftMap.values()).sort((a, b) =>
      String(a.shift_name).localeCompare(String(b.shift_name), 'th')
    )
  };
}
