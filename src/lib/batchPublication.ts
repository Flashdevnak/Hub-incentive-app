/** Resolve the publication state without querying Firestore (testable). */
export function resolvePublishedRecords(records: any[], batchById: Map<string, any>) {
  const allowed = new Set(['IMPORTED', 'IMPORTED_WITH_ERRORS']);
  let unpublishedHidden = 0;
  let missingBatchHidden = 0;

  const published = records.flatMap((record) => {
    const id = String(record.import_batch_id || '').trim();
    if (!id) return [record]; // Historic records created before batch tracking.
    const batch = batchById.get(id);
    if (!batch) {
      missingBatchHidden++;
      return [];
    }
    const status = String(batch.status || '').trim().toUpperCase();
    if (!allowed.has(status)) {
      unpublishedHidden++;
      return [];
    }
    return [{
      ...record,
      import_hub: String(record.import_hub || batch.hub || '').trim().toUpperCase(),
      import_batch_status: status
    }];
  });
  return { records: published, unpublishedHidden, missingBatchHidden };
}
