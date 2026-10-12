import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseWorkbook } from '../src/lib/workbookParser.ts';

const base = (code, hub = '02 NE1_HUB-นครราชสีมา') => ({
  '网点ID': 'TH27011602', '网点名称': hub, '员工编号': code,
  '员工名称': 'Test User', '入职日期': '2023-01-01',
  '当月应发金额总计': '100'
});

const makeFile = (sheets) => {
  const book = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name);
  }
  return XLSX.write(book, { bookType: 'xlsx', type: 'buffer' });
};

test('reads staff and manager worksheets without hiding 2nd sheet', () => {
  const file = makeFile([
    { name: 'hub_staff', rows: [base('S01'), base('S02')] },
    { name: 'hub_manager', rows: [{ ...base('M01'), '其他罚款(暂不罚)': '50' }] }
  ]);
  const parsed = parseWorkbook(file);
  assert.equal(parsed.totalRows, 3);
  assert.deepEqual(parsed.sheets.map((sheet) => [sheet.name, sheet.rowCount]), [
    ['hub_staff', 2], ['hub_manager', 1]
  ]);
  assert.equal(new Set(parsed.rows.map((row) => row['员工编号'])).size, 3);
  assert.deepEqual(parsed.rows.map((row) => row.__source_sheet), [
    'hub_staff','hub_staff','hub_manager'
  ]);
  assert.equal(parsed.rows[2].__sheet_row_number, 2);
  assert.ok(parsed.headers.includes('其他罚款(暂不罚)'));
});

test('rejects unsupported nonempty worksheet instead of silent omission', () => {
  const file = makeFile([
    { name: 'hub_staff', rows: [base('S01')] },
    { name: 'unexpected', rows: [{ 'หมายเหตุ': 'Data omitted previously' }] }
  ]);
  assert.throws(() => parseWorkbook(file), /unexpected/);
});

test('empty extra sheets do not change row totals', () => {
  const file = makeFile([{ name: 'hub_staff', rows: [base('S01')] }]);
  const parsed = parseWorkbook(file);
  assert.equal(parsed.totalRows, 1);
  assert.equal(parsed.sheets.length, 1);
});
