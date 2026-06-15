const THAI_MONTHS = [
  '',
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม'
];

const NO_DATA_LABEL = 'ยังไม่มีข้อมูล';

export const money = (v: any) =>
  Number(v || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

export function monthName(m: any) {
  const n = Number(m);
  if (Number.isInteger(n) && n >= 1 && n <= 12) {
    return THAI_MONTHS[n];
  }
  return '';
}

function parsePeriodKey(key: any) {
  const raw = String(key || '').trim();

  const dashed = raw.match(/^(\d{4})[-_/](\d{1,2})$/);
  if (dashed) {
    return { year: Number(dashed[1]), month: Number(dashed[2]) };
  }

  const compact = raw.match(/^(\d{4})(\d{2})$/);
  if (compact) {
    return { year: Number(compact[1]), month: Number(compact[2]) };
  }

  return null;
}

function hasMojibake(value: any) {
  const text = String(value || '');
  return /[\uFFFD\u00C3\u00C2]|\u00C3\u00A0\u00C2[\u00B8\u00B9\u00BA]|\u00C3\u00A1\u00C2\u00B8/.test(text);
}

export function periodLabel(period: any, periodOptions: any[] = []) {
  if (!period) return NO_DATA_LABEL;

  const selectedKey = period?.key || period?.period || '';
  const matchedOption = selectedKey
    ? periodOptions.find((item) => String(item?.key || '') === String(selectedKey))
    : null;

  const source = matchedOption || period;
  const parsed = parsePeriodKey(source?.key || selectedKey);

  const month = Number(source?.month || parsed?.month || 0);
  const year = Number(source?.year || parsed?.year || 0);
  const monthText = monthName(month);

  if (monthText && year) return `${monthText} ${year}`;
  if (monthText) return monthText;
  if (year) return String(year);

  const fallbackLabel = source?.label || source?.name || '';
  if (fallbackLabel && !hasMojibake(fallbackLabel)) return String(fallbackLabel);

  return NO_DATA_LABEL;
}

export const appName = process.env.NEXT_PUBLIC_APP_NAME || 'NAK Incentive';
