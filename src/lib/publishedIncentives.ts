import { db } from '@/lib/firebaseAdmin';

const publishedStatuses = new Set(['IMPORTED', 'IMPORTED_WITH_ERRORS']);

/**
 * Batch status is authoritative. A partially written/abandoned PROCESSING batch
 * must not appear on employee history or in manager financial summaries.
 * Keep legacy records without an import_batch_id readable.
 *
 * Do not filter out old published batches by is_active: they are immutable
 * historical versions, even after a later version supersedes them.
 */
export async function publishedIncentiveRecords(records: any[]) {
  const ids = [...new Set(records.map((r) => String(r.import_batch_id || '').trim()).filter(Boolean))];
  const batchEntries = await Promise.all(ids.map(async (id) => {
    const doc = await db().collection('import_batches').doc(id).get();
    return [id, doc.exists ? doc.data() : null] as const;
  }));
  const batchById = new Map(batchEntries);
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
    if (!publishedStatuses.has(status)) {
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
