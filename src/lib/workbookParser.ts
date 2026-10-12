import * as XLSX from 'xlsx';

export function parseWorkbook(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false });
    const headers = rows.length ? Object.keys(rows[0]).filter((header) => !header.startsWith('__EMPTY')) : [];
    return { name, headers, rows, rowCount: rows.length };
  });

  // Do not silently ignore another non-empty worksheet: this previously
  // lost the full hub_manager tab while reporting a successful import.
  const unsupported = sheets.filter((sheet) => sheet.rowCount > 0 &&
    !sheet.headers.some((header) => ['员工编号', 'employee_code', 'รหัสพนักงาน'].includes(header.trim())));
  if (unsupported.length) {
    throw new Error(`พบชีตที่มีข้อมูลแต่ไม่มีคอลัมน์รหัสพนักงาน: ${unsupported.map((sheet) => sheet.name).join(', ')} กรุณาตรวจสอบก่อนนำเข้า`);
  }

  const included = sheets.filter((sheet) => sheet.rowCount > 0);
  if (!included.length) throw new Error('ไฟล์ Excel ไม่มีข้อมูลพนักงานในชีตใดเลย');

  const headers = [...new Set(included.flatMap((sheet) => sheet.headers))];
  const rows = included.flatMap((sheet) => sheet.rows.map((row, index) => ({
    ...row,
    __source_sheet: sheet.name,
    __sheet_row_number: index + 2
  })));
  return {
    sheetName: included[0].name,
    headers,
    rows,
    sheets: included.map((sheet) => ({ name: sheet.name, headers: sheet.headers, rowCount: sheet.rowCount })),
    totalRows: rows.length
  };
}
