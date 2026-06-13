import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return 0;
}

function importerDisplay(batch: any) {
  const name = String(batch.imported_by_name || batch.uploader_name || batch.created_by_name || '').trim();
  const code = String(
    batch.imported_by_employee_code ||
    batch.uploaded_by ||
    batch.created_by_employee_code ||
    batch.user_id ||
    batch.admin_id ||
    ''
  ).trim();
  const role = String(batch.imported_by_role || batch.role || '').trim();
  const direct = String(batch.imported_by || batch.created_by || batch.importer || '').trim();

  if (name) return `${name}${code ? ` (${code})` : ''}`;
  return direct || code || role || '';
}

function normalizeBatch(id: string, data: any) {
  const importedAt = data.imported_at || data.uploaded_at || data.confirmed_at || data.created_at || data.updated_at || '';
  const importer = importerDisplay(data);

  return {
    id,
    ...data,
    imported_at: importedAt,
    created_at: data.created_at || importedAt,
    uploaded_at: data.uploaded_at || importedAt,
    confirmed_at: data.confirmed_at || importedAt,
    imported_by: importer,
    imported_by_name: data.imported_by_name || '',
    imported_by_employee_code: data.imported_by_employee_code || data.uploaded_by || '',
    imported_by_role: data.imported_by_role || '',
    imported_by_email: data.imported_by_email || ''
  };
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['super_admin', 'admin']);

    const shiftCode = String(req.nextUrl.searchParams.get('shiftCode') || '').trim();
    const shiftName = String(req.nextUrl.searchParams.get('shiftName') || '').trim();
    const shiftGroup = String(req.nextUrl.searchParams.get('shiftGroup') || '').trim();

    const snap = await db().collection('import_batches').limit(200).get();
    const batches = snap.docs
      .map((doc) => normalizeBatch(doc.id, doc.data()))
      .filter((batch) => !shiftCode || String(batch.shift_code || '').trim() === shiftCode)
      .filter((batch) => !shiftName || String(batch.shift_name || '').trim() === shiftName)
      .filter((batch) => !shiftGroup || String(batch.shift_group || '').trim() === shiftGroup)
      .sort((a, b) => toMs(b.imported_at) - toMs(a.imported_at))
      .slice(0, 100);

    return ok({ batches });
  } catch (e) {
    return handleError(e);
  }
}
