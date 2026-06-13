import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError, fail } from '@/lib/http';
import { audit } from '@/lib/audit';
import { detectShiftColumn, normalizeShift, parseWorkbook, transformRow } from '@/lib/importer';
import type { FieldMapping } from '@/types';

export const runtime = 'nodejs';

const inactiveStatuses = new Set(['RESIGNED', 'INACTIVE', 'SUSPENDED']);

function normalizeEmploymentStatus(status?: string) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'RESIGNED' || normalized === 'INACTIVE' || normalized === 'SUSPENDED') return normalized;
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, ['super_admin', 'admin']);
    const sessionUser = user as any;
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
    const shiftDetection = detectShiftColumn(parsed.headers, mappings);

    const required = ['employee_code', 'employee_name', 'start_date'];
    for (const field of required) {
      if (!mappings.some((m) => m.system_field === field)) {
        return fail(`Mapping ขาดฟิลด์สำคัญ: ${field}`);
      }
    }

    const periodKey = `${periodYear}${String(periodMonth).padStart(2, '0')}`;
    const existing = await db()
      .collection('import_batches')
      .where('file_type', '==', fileType)
      .where('period_month', '==', periodMonth)
      .where('period_year', '==', periodYear)
      .where('hub', '==', hub)
      .get();

    const versionNo = existing.size + 1;
    const importTimestamp = ts();
    const importerCode = String(sessionUser.employeeCode || '').trim();
    const importerName = String(sessionUser.employeeName || sessionUser.name || '').trim();
    const importerRole = String(sessionUser.role || '').trim();
    const importerEmail = String(sessionUser.email || '').trim();
    const importerDisplay = importerName
      ? `${importerName}${importerCode ? ` (${importerCode})` : ''}`
      : importerCode || importerRole || '';

    const batchRef = await db().collection('import_batches').add({
      file_name: file.name,
      file_type: fileType,
      period_month: periodMonth,
      period_year: periodYear,
      period_key: periodKey,
      hub,
      template_id: `${fileType}-default`,
      version_no: versionNo,
      is_active: true,
      uploaded_by: importerCode,
      uploaded_at: importTimestamp,
      imported_at: importTimestamp,
      confirmed_at: importTimestamp,
      created_at: importTimestamp,
      updated_at: importTimestamp,
      imported_by: importerDisplay,
      imported_by_name: importerName,
      imported_by_employee_code: importerCode,
      imported_by_role: importerRole,
      imported_by_email: importerEmail,
      created_by: importerDisplay,
      total_rows: parsed.rows.length,
      success_rows: 0,
      failed_rows: 0,
      status: 'PROCESSING',
      shift_column_detected: shiftDetection.detected,
      shift_column_name: shiftDetection.columnName || '',
      shift_records_count: 0,
      inactive_employee_rows_count: 0
    });

    for (const doc of existing.docs) {
      await doc.ref.set({ is_active: false, status: doc.data().status || 'IMPORTED' }, { merge: true });
    }

    let success = 0;
    let failed = 0;
    let shiftRecordsCount = 0;
    let employeeMasterShiftCount = 0;
    let unknownShiftCount = 0;
    let inactiveEmployeeRowsCount = 0;

    const writer = db().bulkWriter();
    const employeeShiftCache = new Map<string, any>();

    for (let i = 0; i < parsed.rows.length; i++) {
      try {
        const { standard, details, raw } = transformRow(parsed.rows[i], mappings);
        const employeeCode = standard.employee_code;

        if (!employeeCode) {
          failed++;
          continue;
        }

        let employeeMaster = employeeShiftCache.get(employeeCode);

        if (!employeeShiftCache.has(employeeCode)) {
          const employeeSnap = await db().collection('employees').doc(employeeCode).get();
          employeeMaster = employeeSnap.exists ? employeeSnap.data() || {} : {};
          employeeShiftCache.set(employeeCode, employeeMaster);
        }

        let shift = normalizeShift(standard.shift_code || standard.shift_name || standard.shift_group);
        let shiftSource: 'EXCEL' | 'EMPLOYEE_MASTER' | 'UNKNOWN' = shift.shift_code ? 'EXCEL' : 'UNKNOWN';

        if (!shift.shift_code) {
          shift = normalizeShift(employeeMaster.shift_code || employeeMaster.shift_name || employeeMaster.shift_group);

          if (shift.shift_code) {
            shiftSource = 'EMPLOYEE_MASTER';
            employeeMasterShiftCount++;
          } else {
            unknownShiftCount++;
          }
        }

        if (shift.shift_code) shiftRecordsCount++;
        const existingEmploymentStatus = normalizeEmploymentStatus(employeeMaster.employment_status);
        const importedEmploymentStatus = normalizeEmploymentStatus(standard.employment_status);
        const employeeIsInactiveInMaster = inactiveStatuses.has(existingEmploymentStatus);

        if (employeeIsInactiveInMaster) inactiveEmployeeRowsCount++;

        writer.set(db().collection('raw_import_rows').doc(`${batchRef.id}_${i + 1}`), {
          import_batch_id: batchRef.id,
          row_number: i + 1,
          employee_code: employeeCode,
          raw_json: raw,
          created_at: ts()
        });

        const canFillEmployeeShift = shiftDetection.detected && shift.shift_code && !(
          employeeMaster.shift_code ||
          employeeMaster.shift_name ||
          employeeMaster.shift_group
        );

        writer.set(db().collection('employees').doc(employeeCode), {
          employee_code: employeeCode,
          employee_name: standard.employee_name || '',
          hub_id: standard.hub_id || '',
          hub_name: standard.hub_name || hub,
          area: standard.area || '',
          position: standard.position || '',
          position_category: standard.position_category || '',
          start_date: standard.start_date || '',
          employment_status: employeeIsInactiveInMaster
            ? existingEmploymentStatus
            : importedEmploymentStatus || existingEmploymentStatus || 'ACTIVE',
          is_active: employeeIsInactiveInMaster ? false : employeeMaster.is_active ?? true,
          hidden_from_current_count: employeeIsInactiveInMaster ? true : employeeMaster.hidden_from_current_count ?? false,
          inactive_reason: employeeMaster.inactive_reason || '',
          ...(canFillEmployeeShift ? {
            shift_code: shift.shift_code,
            shift_name: shift.shift_name,
            shift_group: shift.shift_group,
            shift_start: shift.shift_start,
            shift_end: shift.shift_end
          } : {}),
          updated_at: ts()
        }, { merge: true });

        if (fileType === 'incentive') {
          writer.set(db().collection('incentive_records').doc(`${periodYear}_${String(periodMonth).padStart(2, '0')}_${employeeCode}_${batchRef.id}`), {
            import_batch_id: batchRef.id,
            period_month: periodMonth,
            period_year: periodYear,
            period_key: periodKey,
            employee_code: employeeCode,
            employee_name: standard.employee_name || '',
            hub_name: standard.hub_name || hub,
            gross_amount:
              Number(standard.base_incentive || 0) +
              Number(standard.process_reward || 0) +
              Number(standard.performance_incentive || 0) +
              Number(standard.special_incentive || 0) +
              Number(standard.special_group_incentive || 0),
            reward_amount:
              Number(standard.process_reward || 0) +
              Number(standard.performance_incentive || 0) +
              Number(standard.special_incentive || 0) +
              Number(standard.special_group_incentive || 0),
            deduction_amount: Number(standard.deduction_total || 0),
            net_amount: Number(standard.net_amount || 0),
            shift_code: shift.shift_code || '',
            shift_name: shift.shift_name || '',
            shift_group: shift.shift_group || '',
            shift_source: shiftSource,
            detail_json: details,
            is_active: true,
            created_at: ts()
          });
        } else {
          writer.set(db().collection('income_records').doc(`${fileType}_${periodYear}_${String(periodMonth).padStart(2, '0')}_${employeeCode}_${batchRef.id}`), {
            import_batch_id: batchRef.id,
            file_type: fileType,
            period_month: periodMonth,
            period_year: periodYear,
            period_key: periodKey,
            employee_code: employeeCode,
            amount: Number(standard.amount || standard.net_amount || 0),
            detail_json: details,
            created_at: ts()
          });
        }

        success++;
      } catch {
        failed++;
      }
    }

    await writer.close();

    await batchRef.set({
      success_rows: success,
      failed_rows: failed,
      status: failed ? 'IMPORTED_WITH_ERRORS' : 'IMPORTED',
      shift_records_count: shiftRecordsCount,
      shift_fallback_employee_count: employeeMasterShiftCount,
      shift_unknown_count: unknownShiftCount,
      inactive_employee_rows_count: inactiveEmployeeRowsCount,
      updated_at: ts()
    }, { merge: true });

    await audit(user.employeeCode, user.role, 'IMPORT_EXCEL', 'import_batch', batchRef.id, {
      fileName: file.name,
      fileType,
      periodMonth,
      periodYear,
      success,
      failed,
      shiftColumnDetected: shiftDetection.detected,
      shiftColumnName: shiftDetection.columnName || '',
      shiftRecordsCount,
      employeeMasterShiftCount,
      unknownShiftCount,
      inactiveEmployeeRowsCount
    }, req);

    return ok({
      message: 'นำเข้าข้อมูลสำเร็จ',
      batchId: batchRef.id,
      success,
      failed,
      versionNo,
      shiftColumnDetected: shiftDetection.detected,
      shiftColumnName: shiftDetection.columnName || '',
      shiftRecordsCount,
      inactiveEmployeeRowsCount,
      inactiveEmployeeWarning:
        inactiveEmployeeRowsCount > 0
          ? 'พบพนักงานที่เคยถูกตั้งเป็นลาออก/ไม่ใช้งาน แต่มีในไฟล์ใหม่ กรุณาตรวจสอบก่อนเปิดใช้งานอีกครั้ง'
          : ''
    });
  } catch (e) {
    return handleError(e);
  }
}
