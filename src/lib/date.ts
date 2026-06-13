const bangkokTimeZone = 'Asia/Bangkok';

export function parseDateTime(value: any): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date: days since 1899-12-30.
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return parseDateTime(Number(raw));
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toBangkokDateTime(value: any) {
  return parseDateTime(value);
}

function parts(value: any) {
  const date = parseDateTime(value);
  if (!date) return null;

  const formatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    timeZone: bangkokTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const bag = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    day: bag.get('day') || '',
    month: bag.get('month') || '',
    year: bag.get('year') || '',
    hour: bag.get('hour') || '',
    minute: bag.get('minute') || ''
  };
}

export function formatThaiDate(value: any) {
  const p = parts(value);
  if (!p) return '-';
  return `${p.day}/${p.month}/${p.year}`;
}

export function formatThaiDateTime(value: any) {
  const p = parts(value);
  if (!p) return '-';
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute} น.`;
}
