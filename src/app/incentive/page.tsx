'use client';

import AppShell from '@/components/AppShell';
import { useApi } from '@/components/ClientTools';
import { money } from '@/lib/uiData';

type DetailItem = {
  thai_label?: string;
  value?: any;
  data_type?: string;
  category?: string;
  display_order?: number;
  visible_to_staff?: boolean;
};

function parseNumber(value: any) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isEmptyValue(value: any) {
  return value === undefined || value === null || String(value).trim() === '';
}

function formatValue(item: DetailItem) {
  if (isEmptyValue(item.value)) return '';

  if (item.data_type === 'money') {
    const n = parseNumber(item.value);
    return n === null ? String(item.value) : money(n);
  }

  return String(item.value);
}

function sortItems(items: DetailItem[]) {
  return [...items].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

function itemTone(item: DetailItem) {
  if (item.data_type !== 'money') return '';

  const n = parseNumber(item.value);
  if (n === null) return '';
  if (n < 0) return 'is-negative';
  if (n > 0) return 'is-positive';

  return '';
}

function CompactSection({
  title,
  items,
  defaultOpen = true
}: {
  title: string;
  items: DetailItem[];
  defaultOpen?: boolean;
}) {
  const rows = sortItems(items).filter((item) => {
    if (item.visible_to_staff === false) return false;
    return !isEmptyValue(item.value);
  });

  if (!rows.length) return null;

  return (
    <section className="incentive-section">
      <details className="incentive-details" open={defaultOpen}>
        <summary>
          <span>{title}</span>
          <b>{rows.length} รายการ</b>
        </summary>

        <div className="incentive-row-list">
          {rows.map((item, index) => (
            <div className="incentive-row" key={`${item.thai_label}-${index}`}>
              <span className="incentive-row-label">{item.thai_label || '-'}</span>
              <strong className={`incentive-row-value ${itemTone(item)}`}>
                {formatValue(item)}
              </strong>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function KpiCard({
  label,
  value,
  tone
}: {
  label: string;
  value: any;
  tone?: 'gross' | 'deduction' | 'net';
}) {
  const n = parseNumber(value) ?? 0;

  return (
    <div className={`card incentive-kpi-card ${tone ? `tone-${tone}` : ''}`}>
      <div className="label">{label}</div>
      <div className="kpi">{money(n)}</div>
    </div>
  );
}

export default function Incentive() {
  const { data, loading, error } = useApi<any>('/api/me/incentive');

  const record = data?.record;
  const details: DetailItem[] = record?.detail_json || [];

  const by = (category: string) =>
    details.filter((x: DetailItem) => x.category === category && x.visible_to_staff !== false);

  return (
    <AppShell>
      <div className="incentive-page">
        <div className="incentive-head">
          <div>
            <p className="eyebrow">Incentive Detail</p>
            <h1>รายละเอียด Incentive</h1>
          </div>
        </div>

        <div className="notice incentive-note">
          ยอดที่แสดงเป็นข้อมูลจากไฟล์ Incentive เท่านั้น ยังไม่รวมรายได้จากเบี้ยขยัน
        </div>

        {loading && <div className="notice">กำลังโหลดข้อมูล Incentive...</div>}
        {error && <div className="notice danger">{error}</div>}

        {!loading && !record && (
          <div className="card empty-state-card">
            <h2>ยังไม่พบข้อมูล</h2>
            <p className="muted">
              ยังไม่มีข้อมูล Incentive ของรหัสพนักงานนี้ หรือยังไม่ได้ Import ไฟล์รอบล่าสุด
            </p>
          </div>
        )}

        {record && (
          <>
            <div className="incentive-kpi-grid">
              <KpiCard label="ยอดรวมก่อนหัก" value={record.gross_amount} tone="gross" />
              <KpiCard label="ยอดหักรวม" value={record.deduction_amount} tone="deduction" />
              <KpiCard label="ยอดสุทธิ" value={record.net_amount} tone="net" />
            </div>

            <CompactSection
              title="ข้อมูลพนักงาน"
              items={by('identity').concat(by('attendance'))}
              defaultOpen
            />

            <CompactSection
              title="รายได้ / Incentive"
              items={by('income')}
              defaultOpen
            />

            <CompactSection
              title="รายการหัก / ค่าปรับ"
              items={by('deduction')}
              defaultOpen={false}
            />

            <CompactSection
              title="ยอดสรุป"
              items={by('summary')}
              defaultOpen
            />

            <CompactSection
              title="ข้อมูลเพิ่มเติมจากไฟล์"
              items={by('extra').concat(by('note'))}
              defaultOpen={false}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}