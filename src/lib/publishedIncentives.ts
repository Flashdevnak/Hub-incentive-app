import { db } from '@/lib/firebaseAdmin';
import { resolvePublishedRecords } from '@/lib/batchPublication';

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
  return resolvePublishedRecords(records, batchById);
}
