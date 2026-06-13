import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { parseWorkbook, transformRow } from '@/lib/importer';
import { audit } from '@/lib/audit';
import type { FieldMapping } from '@/types';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, ['super_admin', 'admin']);
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return fail('กรุณาเลือกไฟล์ Excel');
    const fileType = String(form.get('fileType') || 'incentive');
    const periodMonth = Number(form.get('periodMonth') || 0);
    const periodYear = Number(form.get('periodYear') || 0);
    const hub = String(form.get('hub') || '');
    const mappings = JSON.parse(String(form.get('mappings') || '[]')) as FieldMapping[];
    if (!periodMonth || !periodYear) return fail('กรุณาเลือกเดือน/ปี');
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseWorkbook(buffer);
    const required = ['employee_code', 'employee_name', 'start_date'];
    for (const r of required) if (!mappings.some(m => m.system_field === r)) return fail(`Mapping ขาดฟิลด์สำคัญ: ${r}`);
    const existing = await db().collection('import_batches').where('file_type', '==', fileType).where('period_month', '==', periodMonth).where('period_year', '==', periodYear).where('hub', '==', hub).get();
    const versionNo = existing.size + 1;
    const batchRef = await db().collection('import_batches').add({ file_name: file.name, file_type: fileType, period_month: periodMonth, period_year: periodYear, period_key: `${periodYear}${String(periodMonth).padStart(2,'0')}`, hub, template_id: `${fileType}-default`, version_no: versionNo, is_active: true, uploaded_by: user.employeeCode, uploaded_at: ts(), total_rows: parsed.rows.length, success_rows: 0, failed_rows: 0, status: 'PROCESSING' });
    // Deactivate previous versions for same period/type/hub
    for (const d of existing.docs) await d.ref.set({ is_active: false, status: d.data().status || 'IMPORTED' }, { merge: true });
    let success = 0, failed = 0;
    const writer = db().bulkWriter();
    for (let i = 0; i < parsed.rows.length; i++) {
      try {
        const { standard, details, raw } = transformRow(parsed.rows[i], mappings);
        const employeeCode = standard.employee_code;
        if (!employeeCode) { failed++; continue; }
        writer.set(db().collection('raw_import_rows').doc(`${batchRef.id}_${i+1}`), { import_batch_id: batchRef.id, row_number: i+1, employee_code: employeeCode, raw_json: raw, created_at: ts() });
        writer.set(db().collection('employees').doc(employeeCode), { employee_code: employeeCode, employee_name: standard.employee_name || '', hub_id: standard.hub_id || '', hub_name: standard.hub_name || hub, area: standard.area || '', position: standard.position || '', position_category: standard.position_category || '', start_date: standard.start_date || '', employment_status: standard.employment_status || '', updated_at: ts() }, { merge: true });
        if (fileType === 'incentive') {
          writer.set(db().collection('incentive_records').doc(`${periodYear}_${String(periodMonth).padStart(2,'0')}_${employeeCode}_${batchRef.id}`), { import_batch_id: batchRef.id, period_month: periodMonth, period_year: periodYear, period_key: `${periodYear}${String(periodMonth).padStart(2,'0')}`, employee_code: employeeCode, employee_name: standard.employee_name || '', hub_name: standard.hub_name || hub, gross_amount: Number(standard.base_incentive || 0) + Number(standard.process_reward || 0) + Number(standard.performance_incentive || 0) + Number(standard.special_incentive || 0) + Number(standard.special_group_incentive || 0), reward_amount: Number(standard.process_reward || 0) + Number(standard.performance_incentive || 0) + Number(standard.special_incentive || 0) + Number(standard.special_group_incentive || 0), deduction_amount: Number(standard.deduction_total || 0), net_amount: Number(standard.net_amount || 0), detail_json: details, is_active: true, created_at: ts() });
        } else {
          writer.set(db().collection('income_records').doc(`${fileType}_${periodYear}_${String(periodMonth).padStart(2,'0')}_${employeeCode}_${batchRef.id}`), { import_batch_id: batchRef.id, file_type: fileType, period_month: periodMonth, period_year: periodYear, period_key: `${periodYear}${String(periodMonth).padStart(2,'0')}`, employee_code: employeeCode, amount: Number(standard.amount || standard.net_amount || 0), detail_json: details, created_at: ts() });
        }
        success++;
      } catch { failed++; }
    }
    await writer.close();
    await batchRef.set({ success_rows: success, failed_rows: failed, status: failed ? 'IMPORTED_WITH_ERRORS' : 'IMPORTED', updated_at: ts() }, { merge: true });
    await audit(user.employeeCode, user.role, 'IMPORT_EXCEL', 'import_batch', batchRef.id, { fileName: file.name, fileType, periodMonth, periodYear, success, failed }, req);
    return ok({ message: 'นำเข้าข้อมูลสำเร็จ', batchId: batchRef.id, success, failed, versionNo });
  } catch (e) { return handleError(e); }
}
