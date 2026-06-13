import * as XLSX from 'xlsx';
import { FieldMapping } from '@/types';
import { normalizeCode, normalizeDate } from './crypto';

const shiftHeaderAliases = new Set([
  'กะ',
  'กะงาน',
  'รอบกะ',
  'เวรกะ',
  'รอบงาน',
  'รอบ',
  'ทีม',
  'ทีม/กะ',
  'shift',
  'shift code',
  'shift name',
  'shift group',
  'team',
  'work shift',
  'schedule'
]);

export const defaultMappings: FieldMapping[] = [
  { excel_header: '网点ID', system_field: 'hub_id', thai_label: 'รหัส HUB', data_type: 'text', category: 'identity', is_visible_to_staff: true, display_order: 10 },
  { excel_header: '网点名称', system_field: 'hub_name', thai_label: 'ชื่อ HUB', data_type: 'text', category: 'identity', is_visible_to_staff: true, display_order: 20 },
  { excel_header: '员工编号', system_field: 'employee_code', thai_label: 'รหัสพนักงาน', data_type: 'text', category: 'identity', is_required: true, is_visible_to_staff: true, display_order: 30 },
  { excel_header: '员工名称', system_field: 'employee_name', thai_label: 'ชื่อพนักงาน', data_type: 'text', category: 'identity', is_required: true, is_visible_to_staff: true, display_order: 40 },
  { excel_header: '在职状态', system_field: 'employment_status', thai_label: 'สถานะพนักงาน', data_type: 'text', category: 'identity', display_order: 50 },
  { excel_header: '职位', system_field: 'position', thai_label: 'ตำแหน่ง', data_type: 'text', category: 'identity', is_visible_to_staff: true, display_order: 60 },
  { excel_header: '职位分类', system_field: 'position_category', thai_label: 'ประเภทตำแหน่ง', data_type: 'text', category: 'identity', is_visible_to_staff: true, display_order: 70 },
  { excel_header: '入职日期', system_field: 'start_date', thai_label: 'วันเริ่มงาน', data_type: 'date', category: 'identity', is_required: true, is_visible_to_staff: true, display_order: 80 },
  { excel_header: '应发提成', system_field: 'base_incentive', thai_label: 'ยอด Incentive พื้นฐาน', data_type: 'money', category: 'income', is_visible_to_staff: true, display_order: 100 },
  { excel_header: '流程优化奖励', system_field: 'process_reward', thai_label: 'รางวัลปรับปรุงกระบวนการ', data_type: 'money', category: 'income', is_visible_to_staff: true, display_order: 110 },
  { excel_header: '破损无头件激励', system_field: 'special_incentive', thai_label: 'Incentive รายการพิเศษ', data_type: 'money', category: 'income', is_visible_to_staff: true, display_order: 120 },
  { excel_header: '当月实际出勤天数', system_field: 'actual_attendance_days', thai_label: 'จำนวนวันเข้างานจริงในเดือน', data_type: 'number', category: 'attendance', is_visible_to_staff: true, display_order: 130 },
  { excel_header: '人效激励', system_field: 'performance_incentive', thai_label: 'Incentive ประสิทธิภาพ', data_type: 'money', category: 'income', is_visible_to_staff: true, display_order: 140 },
  { excel_header: '固定人群特殊激励', system_field: 'special_group_incentive', thai_label: 'Incentive พิเศษเฉพาะกลุ่ม', data_type: 'money', category: 'income', is_visible_to_staff: true, display_order: 150 },
  { excel_header: '包裹丢失罚款', system_field: 'lost_parcel_fine', thai_label: 'ค่าปรับพัสดุสูญหาย', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 200 },
  { excel_header: '包裹破损罚款', system_field: 'damaged_parcel_fine', thai_label: 'ค่าปรับพัสดุเสียหาย', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 210 },
  { excel_header: '迟到罚款', system_field: 'late_fine', thai_label: 'ค่าปรับมาสาย', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 220 },
  { excel_header: '早退罚款', system_field: 'early_leave_fine', thai_label: 'ค่าปรับกลับก่อนเวลา', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 230 },
  { excel_header: '班车晚点罚款', system_field: 'shuttle_late_fine', thai_label: 'ค่าปรับรถ/รอบงานล่าช้า', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 240 },
  { excel_header: '系统罚款合计', system_field: 'system_fine_total', thai_label: 'ค่าปรับรวมจากระบบ', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 250 },
  { excel_header: '平摊维修费用_拆分', system_field: 'shared_maintenance_fee', thai_label: 'ค่า维修/ซ่อมบำรุงที่เฉลี่ย', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 260 },
  { excel_header: '平摊错分罚款_拆分', system_field: 'shared_missort_fine', thai_label: 'ค่าปรับคัดแยกผิดที่เฉลี่ย', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 270 },
  { excel_header: '个人复称处罚', system_field: 'personal_reweigh_fine', thai_label: 'ค่าปรับชั่งซ้ำรายบุคคล', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 280 },
  { excel_header: '个人标准化罚款', system_field: 'personal_standard_fine', thai_label: 'ค่าปรับมาตรฐานรายบุคคล', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 290 },
  { excel_header: '个人维修费用', system_field: 'personal_maintenance_fee', thai_label: 'ค่า维修/ซ่อมบำรุงรายบุคคล', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 300 },
  { excel_header: '个人错分罚款', system_field: 'personal_missort_fine', thai_label: 'ค่าปรับคัดแยกผิดรายบุคคล', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 310 },
  { excel_header: '扣话费', system_field: 'phone_deduction', thai_label: 'หักค่าโทรศัพท์', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 320 },
  { excel_header: '补扣工资', system_field: 'salary_adjust_deduction', thai_label: 'หัก/ปรับเงินเดือนเพิ่มเติม', data_type: 'money', category: 'deduction', is_visible_to_staff: true, display_order: 330 },
  { excel_header: '扣款合计', system_field: 'deduction_total', thai_label: 'ยอดหักรวม', data_type: 'money', category: 'summary', is_visible_to_staff: true, display_order: 400 },
  { excel_header: '当月应发金额总计', system_field: 'net_amount', thai_label: 'ยอดสุทธิจาก Incentive', data_type: 'money', category: 'summary', is_required: true, is_visible_to_staff: true, display_order: 410 }
];

defaultMappings.push({
  excel_header: 'Shift',
  system_field: 'shift_code',
  thai_label: 'กะ / Shift',
  data_type: 'text',
  category: 'identity',
  is_visible_to_staff: true,
  display_order: 90
});

export function parseWorkbook(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '', raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { sheetName, headers, rows };
}

export function autoMap(headers: string[], existing: FieldMapping[] = defaultMappings) {
  return headers.map((h, idx) => {
    const found = existing.find(m => m.excel_header === h || m.system_field === h || m.thai_label === h) ||
      (shiftHeaderAliases.has(normalizeShiftHeader(h))
        ? { excel_header: h, system_field: 'shift_code', thai_label: 'กะ / Shift', data_type: 'text', category: 'identity', is_visible_to_staff: true, display_order: 90 } as FieldMapping
        : null);
    return found || { excel_header: h, system_field: `extra_${idx + 1}`, thai_label: h, data_type: 'text', category: 'extra', is_visible_to_staff: true, display_order: 1000 + idx } as FieldMapping;
  });
}

function normalizeShiftHeader(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function detectShiftColumn(headers: string[], mappings?: FieldMapping[]) {
  const mapped = mappings?.find((m) => (
    m.system_field === 'shift_code' ||
    m.system_field === 'shift_name' ||
    m.system_field === 'shift_group'
  ));

  if (mapped) {
    return { detected: true, columnName: mapped.excel_header, systemField: mapped.system_field };
  }

  const header = headers.find((h) => shiftHeaderAliases.has(normalizeShiftHeader(h)));
  return header
    ? { detected: true, columnName: header, systemField: 'shift_code' }
    : { detected: false, columnName: '', systemField: '' };
}

export function normalizeShift(rawValue: any) {
  const raw = String(rawValue || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { shift_code: '', shift_name: '', shift_group: '', shift_start: '', shift_end: '' };

  const lower = raw.toLowerCase();
  let shift_code = raw;
  let shift_name = raw;
  let shift_group = '';

  if (/เช้า|day|morning/.test(lower)) {
    shift_code = 'DAY';
    shift_name = 'กะเช้า';
    shift_group = 'DAY';
  } else if (/บ่าย|afternoon/.test(lower)) {
    shift_code = 'AFTERNOON';
    shift_name = 'กะบ่าย';
    shift_group = 'AFTERNOON';
  } else if (/ดึก|night/.test(lower)) {
    shift_code = 'NIGHT';
    shift_name = 'กะดึก';
    shift_group = 'NIGHT';
  } else {
    const timeRange = raw.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/);
    const startOnly = raw.match(/(\d{1,2}[:.]\d{2})/);

    if (timeRange) {
      shift_code = `${timeRange[1].replace('.', ':')}-${timeRange[2].replace('.', ':')}`;
      shift_name = shift_code;
      shift_group = shift_code;
    } else if (startOnly) {
      shift_code = startOnly[1].replace('.', ':');
      shift_name = raw;
      shift_group = shift_code;
    } else if (/^[a-z0-9_-]+$/i.test(raw)) {
      shift_code = raw.toUpperCase();
      shift_name = raw.toUpperCase();
      shift_group = raw.toUpperCase();
    }
  }

  const range = shift_code.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);

  return {
    shift_code,
    shift_name,
    shift_group,
    shift_start: range?.[1] || '',
    shift_end: range?.[2] || ''
  };
}

export function toNumber(v: any) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function transformRow(row: Record<string, any>, mappings: FieldMapping[]) {
  const standard: Record<string, any> = {};
  const details: any[] = [];
  for (const m of mappings) {
    const rawValue = row[m.excel_header];
    let value: any = rawValue;
    if (m.data_type === 'money' || m.data_type === 'number') value = toNumber(rawValue);
    if (m.data_type === 'date') value = normalizeDate(String(rawValue));
    if (m.system_field === 'employee_code') value = normalizeCode(String(rawValue));
    standard[m.system_field] = value;
    details.push({
      excel_header: m.excel_header,
      system_field: m.system_field,
      thai_label: m.thai_label,
      data_type: m.data_type,
      category: m.category,
      value,
      visible_to_staff: m.is_visible_to_staff !== false,
      display_order: m.display_order || 999
    });
  }
  const shift = normalizeShift(standard.shift_code || standard.shift_name || standard.shift_group);
  if (shift.shift_code) {
    standard.shift_code = standard.shift_code || shift.shift_code;
    standard.shift_name = standard.shift_name || shift.shift_name;
    standard.shift_group = standard.shift_group || shift.shift_group;
    standard.shift_start = standard.shift_start || shift.shift_start;
    standard.shift_end = standard.shift_end || shift.shift_end;
  }

  return { standard, details, raw: row };
}
