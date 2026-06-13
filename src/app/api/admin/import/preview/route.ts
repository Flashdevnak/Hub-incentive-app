import { NextRequest } from 'next/server';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { parseWorkbook, autoMap, defaultMappings, detectShiftColumn } from '@/lib/importer';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    requireAuth(req, ['super_admin', 'admin']);
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return fail('กรุณาเลือกไฟล์ Excel');
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseWorkbook(buffer);
    const mappings = autoMap(parsed.headers, defaultMappings);
    const shiftDetection = detectShiftColumn(parsed.headers, mappings);
    return ok({
      fileName: file.name,
      sheetName: parsed.sheetName,
      headers: parsed.headers,
      previewRows: parsed.rows.slice(0, 10),
      mappings,
      shiftDetection,
      shift_column_detected: shiftDetection.detected,
      shift_column_name: shiftDetection.columnName,
      shiftMessage: shiftDetection.detected
        ? `พบคอลัมน์กะ: ${shiftDetection.columnName}`
        : 'ไม่พบคอลัมน์กะ ใช้ข้อมูลกะจากพนักงานถ้ามี'
    });
  } catch (e) { return handleError(e); }
}
