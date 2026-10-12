import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
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
  let inProgressBatchRef: FirebaseFirestore.DocumentReference | null = null;
  let published = false;
  try {
    const user = requireAuth(req, ['super_admin', 'admin']);
    const sessionUser = user as any;
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) return fail('กรุณาเลือกไฟล์ Excel');

    const fileType = String(form.get('fileType') || 'incentive');
    const periodMonth = Number(form.get('periodMonth') || 0);
    const periodYear = Number(form.get('periodYear') || 0);
    const hub = String(form.get('hub') || '').trim().toUpperCase();
    const mappings = JSON.parse(String(form.get('mappings') || '[]')) as FieldMapping[];
    const updateCurrentHub = String(form.get('updateCurrentHub') || '') === 'true';

    if (!periodMonth || !periodYear || periodMonth < 1 || periodMonth > 12 || !Number.isInteger(periodYear)) return fail('กรุณาเลือกเดือน/ปีที่ถูกต้อง');
    if (!hub || hub.length > 80) return fail('กรุณาระบุ HUB / Area ไม่เกิน 80 ตัวอักษร');
    if (!['incentive', 'diligence', 'ot', 'attendance', 'bonus', 'fine', 'other'].includes(fileType)) return fail('ประเภทไฟล์ไม่ถูกต้อง');

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseWorkbook(buffer);
    const shiftDetection = detectShiftColumn(parsed.headers, mappings);
    if (!parsed.rows.length) return fail('ไฟล์ Excel ไม่มีแถวข้อมูลที่นำเข้าได้');

    const required = fileType === 'incentive'
      ? ['employee_code', 'employee_name', 'start_date', 'net_amount']
      : ['employee_code', 'employee_name', 'start_date'];
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

    let versionNo = 0;
    const highestExistingVersion = Math.max(0, ...existing.docs.map((doc) => Number(doc.data().version_no || 0)));
    const importTimestamp = ts();
    const importerCode = String(sessionUser.employeeCode || '').trim();
    const importerName = String(sessionUser.employeeName || sessionUser.name || '').trim();
    const importerRole = String(sessionUser.role || '').trim();
    const importerEmail = String(sessionUser.email || '').trim();
    const importerDisplay = importerName
      ? `${importerName}${importerCode ? ` (${importerCode})` : ''}`
      : importerCode || importerRole || '';

    const batchRef = db().collection('import_batches').doc();
    inProgressBatchRef = batchRef;
    // Reserve a unique monotonic version under a per-HUB/per-period transaction.
    const streamId = createHash('sha256').update([fileType, periodKey, hub].join('|')).digest('hex');
    const streamRef = db().collection('import_streams').doc(streamId);
    await db().runTransaction(async (transaction) => {
      const state = await transaction.get(streamRef);
      versionNo = Math.max(highestExistingVersion, Number(state.data()?.version_no || 0)) + 1;
      transaction.set(streamRef, {
        file_type: fileType, period_key: periodKey, hub,
        version_no: versionNo, updated_at: ts()
      }, { merge: true });
      transaction.set(batchRef, {
      file_name: file.name,
      file_type: fileType,
      period_month: periodMonth,
      period_year: periodYear,
      period_key: periodKey,
      hub,
      template_id: `${fileType}-default`,
      version_no: versionNo,
      is_active: false,
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
    });

    let success = 0;
    let failed = 0;
    let shiftRecordsCount = 0;
    let employeeMasterShiftCount = 0;
    let unknownShiftCount = 0;
    let inactiveEmployeeRowsCount = 0;

    const writer = db().bulkWriter();
    let firestoreWriteFailures = 0;
    writer.onWriteError(() => false);
    const queueWrite = (reference: FirebaseFirestore.DocumentReference, data: Record<string, any>, options?: FirebaseFirestore.SetOptions) => {
      const promise = options ? writer.set(reference, data, options) : writer.set(reference, data);
      promise.catch(() => { firestoreWriteFailures++; });
    };
    const employeeShiftCache = new Map<string, any>();
    const employeeUpserts = new Map<string, Record<string, any>>();
    const employeeCodesSeen = new Set<string>();

    for (let i = 0; i < parsed.rows.length; i++) {
      try {
        const { standard, details, raw } = transformRow(parsed.rows[i], mappings);
        const employeeCode = standard.employee_code;

        if (!employeeCode) {
          failed++;
          continue;
        }

        if (employeeCodesSeen.has(employeeCode)) {
          // One row per employee per HUB/period. Never silently overwrite
          // a second row with the same document ID.
          failed++;
          continue;
        }
        employeeCodesSeen.add(employeeCode);
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

        queueWrite(db().collection('raw_import_rows').doc(`${batchRef.id}_${i + 1}`), {
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

        // Updating the roster from a historical incentive file must be an
        // explicit administrator choice. New employees can still be created.
        const masterPeriod = String(employeeMaster.current_hub_import_period_key || '');
        const canUpdateMaster = Object.keys(employeeMaster).length === 0 ||
          (updateCurrentHub && (!masterPeriod || periodKey >= masterPeriod));
        if (canUpdateMaster) employeeUpserts.set(employeeCode, {
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
          is_deleted: employeeMaster.is_deleted === true,
          hidden_from_current_count: employeeIsInactiveInMaster ? true : employeeMaster.hidden_from_current_count ?? false,
          inactive_reason: employeeMaster.inactive_reason || '',
          ...(canFillEmployeeShift ? {
            shift_code: shift.shift_code,
            shift_name: shift.shift_name,
            shift_group: shift.shift_group,
            shift_start: shift.shift_start,
            shift_end: shift.shift_end
          } : {}),
          current_hub_import_period_key: periodKey,
          updated_at: ts()
        });

        if (fileType === 'incentive') {
          queueWrite(db().collection('incentive_records').doc(`${periodYear}_${String(periodMonth).padStart(2, '0')}_${employeeCode}_${batchRef.id}`), {
            import_batch_id: batchRef.id,
            import_hub: hub,
            area: standard.area || '',
            import_version: versionNo,
            imported_at: importTimestamp,
            confirmed_at: importTimestamp,
            source_file_name: file.name,
            import_status: 'IMPORTED',
            period_month: periodMonth,
            period_year: periodYear,
            month: periodMonth,
            year: periodYear,
            period_key: periodKey,
            employee_code: employeeCode,
            employee_name: standard.employee_name || '',
            hub_id: standard.hub_id || '',
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
          queueWrite(db().collection('income_records').doc(`${fileType}_${periodYear}_${String(periodMonth).padStart(2, '0')}_${employeeCode}_${batchRef.id}`), {
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
    if (failed || firestoreWriteFailures || success === 0) {
      await batchRef.set({
        success_rows: success, failed_rows: failed + firestoreWriteFailures,
        status: 'FAILED', is_active: false,
        error_code: firestoreWriteFailures ? 'FIRESTORE_WRITE_FAILED' : 'ROW_VALIDATION_FAILED',
        updated_at: ts()
      }, { merge: true });
      return fail('นำเข้าไม่ครบทุกแถว จึงยังไม่เผยแพร่ข้อมูลใหม่ ประวัติเวอร์ชันเก่ายังคงอยู่', 422, {
        batchId: batchRef.id, success, failed: failed + firestoreWriteFailures
      });
    }

    // Only publish a fully written batch. A slower earlier version cannot
    // deactivate a successfully published newer version.
    await db().runTransaction(async (transaction) => {
      const state = await transaction.get(streamRef);
      const latestPublished = Number(state.data()?.latest_published_version || 0);
      const activate = versionNo >= latestPublished;
      if (activate) {
        transaction.set(streamRef, {
          latest_published_version: versionNo,
          latest_published_batch_id: batchRef.id,
          updated_at: ts()
        }, { merge: true });
        for (const doc of existing.docs) {
          if (doc.id !== batchRef.id && Number(doc.data().version_no || 0) < versionNo && doc.data().is_active === true) {
            transaction.set(doc.ref, { is_active: false }, { merge: true });
          }
        }
      }
      transaction.set(batchRef, {
        is_active: activate,
        status: 'IMPORTED',
        success_rows: success,
        failed_rows: 0,
        shift_records_count: shiftRecordsCount,
        shift_fallback_employee_count: employeeMasterShiftCount,
        shift_unknown_count: unknownShiftCount,
        inactive_employee_rows_count: inactiveEmployeeRowsCount,
        published_at: ts(),
        updated_at: ts()
      }, { merge: true });
    });
    published = true;

    // Roster sync happens only after publish, so failed imports cannot
    // silently replace the current HUB of an existing employee.
    let employeeSyncErrors = 0;
    if (employeeUpserts.size) {
      const rosterWriter = db().bulkWriter();
      rosterWriter.onWriteError(() => false);
      for (const [code, employee] of employeeUpserts) {
        rosterWriter.set(db().collection('employees').doc(code), employee, { merge: true })
          .catch(() => { employeeSyncErrors++; });
      }
      await rosterWriter.close();
    }
    if (employeeSyncErrors) {
      await batchRef.set({ employee_sync_status: 'PARTIAL', employee_sync_error_count: employeeSyncErrors, updated_at: ts() }, { merge: true });
    }

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
      inactiveEmployeeRowsCount,
      updateCurrentHub,
      employeeSyncErrors
    }, req);

    return ok({
      message: 'นำเข้าข้อมูลสำเร็จ',
      batchId: batchRef.id,
      success,
      failed,
      versionNo,
      employeeSyncErrors,
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
    if (inProgressBatchRef && !published) {
      try {
        await inProgressBatchRef.set({
          status: 'FAILED', is_active: false,
          error_code: 'IMPORT_EXCEPTION', updated_at: ts()
        }, { merge: true });
      } catch { /* Preserve original error if Firestore is unavailable. */ }
    }
    return handleError(e);
  }
}
