import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeIncentiveRecordsByMonth,
  getHistoryDedupeKey,
  isValidIncentiveRecord
} from '../src/lib/incentiveRecords.ts';
import { recordScopeMatches } from '../src/lib/hubScope.ts';
import { resolvePublishedRecords } from '../src/lib/batchPublication.ts';

const record = (hub, month, batch, net, timestamp) => ({
  employee_code: 'EMP001', period_year: 2569, period_month: month,
  period_key: `2569${String(month).padStart(2, '0')}`,
  hub_id: 'PHYSICAL_BRANCH_ID', hub_name: 'Original Excel Physical Hub',
  import_hub: hub, import_batch_id: batch,
  net_amount: net, imported_at: timestamp, import_status: 'IMPORTED'
});

test('current NE1 and historical NAK remain separate', () => {
  const nak = record('NAK', 9, 'nak-v7', 100, '2026-09-12T10:00:00Z');
  const ne1 = record('NE1', 10, 'ne1-v6', 200, '2026-10-12T10:00:00Z');
  const result = dedupeIncentiveRecordsByMonth([nak, ne1]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((r) => r.import_hub), ['NE1', 'NAK']);
});

test('same employee/period across different HUBs must not be merged', () => {
  const nak = record('NAK', 10, 'nak-v1', 100, '2026-10-10T10:00:00Z');
  const ne1 = record('NE1', 10, 'ne1-v1', 200, '2026-10-11T10:00:00Z');
  assert.notEqual(getHistoryDedupeKey(nak), getHistoryDedupeKey(ne1));
  assert.equal(dedupeIncentiveRecordsByMonth([nak, ne1]).length, 2);
});

test('versions in one HUB/period dedupe to latest successful record', () => {
  const v1 = record('NE1', 10, 'ne1-v1', 111, '2026-10-10T10:00:00Z');
  const v2 = record('NE1', 10, 'ne1-v2', 222, '2026-10-11T10:00:00Z');
  const result = dedupeIncentiveRecordsByMonth([v1, v2]);
  assert.equal(result.length, 1);
  assert.equal(result[0].net_amount, 222);
});

test('PROCESSING and FAILED batches cannot overwrite published incentive views', () => {
  const old = record('', 10, 'old-success', 123, '2026-10-10T10:00:00Z');
  const failed = record('', 10, 'new-failed', 999, '2026-10-12T10:00:00Z');
  const processing = record('', 10, 'new-processing', 888, '2026-10-13T10:00:00Z');
  const batches = new Map([
    ['old-success', { status: 'IMPORTED', hub: 'NAK' }],
    ['new-failed', { status: 'FAILED', hub: 'NE1' }],
    ['new-processing', { status: 'PROCESSING', hub: 'NE1' }]
  ]);
  const result = resolvePublishedRecords([old, failed, processing], batches);
  assert.equal(result.unpublishedHidden, 2);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].import_hub, 'NAK');
  assert.equal(result.records[0].net_amount, 123);
});

test('unreferenced and unpublished rows do not masquerade as successful batches', () => {
  const orphan = record('NE1', 10, 'missing', 99, '2026-10-12T10:00:00Z');
  const result = resolvePublishedRecords([orphan], new Map());
  assert.equal(result.missingBatchHidden, 1);
  assert.equal(result.records.length, 0);
  assert.equal(isValidIncentiveRecord({ import_status: 'PROCESSING' }), false);
});

test('HUB and AREA access respects import scope, not the current employee HUB', () => {
  const previous = record('NAK', 9, 'nak', 100, '2026-09-10T10:00:00Z');
  const current = record('NE1', 10, 'ne1', 200, '2026-10-10T10:00:00Z');
  assert.equal(recordScopeMatches(previous, 'HUB', 'NAK'), true);
  assert.equal(recordScopeMatches(previous, 'HUB', 'NE1'), false);
  assert.equal(recordScopeMatches(current, 'HUB', 'NE1'), true);
  assert.equal(recordScopeMatches(current, 'AREA', 'NE1'), true);
  assert.equal(recordScopeMatches(current, 'HUB', 'PHYSICAL_BRANCH_ID'), false);
});
