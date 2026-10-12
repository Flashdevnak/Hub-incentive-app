'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [periodMonth, setMonth] = useState(String(new Date().getMonth() + 1));
  const [periodYear, setYear] = useState(String(new Date().getFullYear() + 543));
  const [hub, setHub] = useState('');
  const [updateCurrentHub, setUpdateCurrentHub] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: previousBatches } = useApi<any>('/api/admin/import/batches');
  const hubSuggestions = [...new Set((previousBatches?.batches || []).map((b: any) => String(b.hub || '').trim().toUpperCase()).filter(Boolean))] as string[];
  const [fileType, setFileType] = useState('incentive');

  async function doPreview() {
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/admin/import/preview', { method: 'POST', body: fd });
    const json = await res.json();

    if (json.ok) setPreview(json);
    setMsg(json.shiftMessage || json.message || 'อ่านไฟล์สำเร็จ');
  }

  async function confirm() {
    if (!file || !preview || submitting) return;
    if (!hub.trim()) { setMsg('กรุณาระบุ HUB / Area ก่อนนำเข้า'); return; }
    setSubmitting(true);
    try {

    const fd = new FormData();
    fd.append('file', file);
    fd.append('fileType', fileType);
    fd.append('periodMonth', periodMonth);
    fd.append('periodYear', periodYear);
    fd.append('hub', hub.trim().toUpperCase());
    fd.append('updateCurrentHub', String(updateCurrentHub));
    fd.append('mappings', JSON.stringify(preview.mappings));

    const res = await fetch('/api/admin/import/confirm', { method: 'POST', body: fd });
    const json = await res.json();
    const shiftText = json.ok
      ? ` | กะ: ${json.shiftColumnDetected ? `พบ ${json.shiftColumnName || '-'}` : 'ไม่พบคอลัมน์กะ'} / ${json.shiftRecordsCount || 0} รายการ`
      : '';

    setMsg(`${json.message || (json.ok ? 'นำเข้าสำเร็จ' : 'นำเข้าไม่สำเร็จ')}${shiftText}${json.ok ? ` | Version v${json.versionNo} · HUB ${hub.trim().toUpperCase()}` : ''}${json.employeeSyncErrors ? ` | ข้อมูลพนักงานอัปเดตไม่ครบ ${json.employeeSyncErrors} รายการ` : ''}`);
    } catch (error) {
      setMsg(`เชื่อมต่อการนำเข้าไม่สำเร็จ: ${String(error)} กรุณาตรวจประวัติ Batch ก่อนกดยืนยันซ้ำ`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell area="admin">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Excel Import</p>
          <h1>อัปโหลด Excel / Mapping</h1>
          <p className="muted">รองรับคอลัมน์เปลี่ยน เพิ่มคอลัมน์ใหม่ เก็บ Raw Data และตรวจจับกะจากไฟล์อัตโนมัติ</p>
        </div>
      </div>

      <div className="notice">
        ถ้าไฟล์ Incentive มีคอลัมน์กะ ระบบจะใช้กะจากไฟล์เป็นหลัก ถ้าไม่มี ระบบจะใช้กะจากข้อมูลพนักงานแทนถ้ามี
      </div>

      <Message text={msg} />

      <div className="card form">
        <div className="split">
          <label>
            ประเภทไฟล์
            <select value={fileType} onChange={(e) => setFileType(e.target.value)}>
              <option value="incentive">Incentive</option>
              <option value="diligence">เบี้ยขยัน</option>
              <option value="ot">OT</option>
              <option value="attendance">Attendance</option>
              <option value="bonus">Bonus</option>
              <option value="fine">ค่าปรับ</option>
              <option value="other">อื่น ๆ</option>
            </select>
          </label>

          <label>
            HUB / Area
            <input value={hub} onChange={(e) => setHub(e.target.value.toUpperCase())} list="known-hubs" placeholder="เช่น NE1 หรือ NAK" required />
            <datalist id="known-hubs">{hubSuggestions.map((name) => <option key={name} value={name} />)}</datalist>
          </label>

          <label>
            เดือน
            <input value={periodMonth} onChange={(e) => setMonth(e.target.value)} type="number" />
          </label>

          <label>
            ปี พ.ศ.
            <input value={periodYear} onChange={(e) => setYear(e.target.value)} type="number" />
          </label>
        </div>

        <label><input type="checkbox" checked={updateCurrentHub} onChange={(e) => setUpdateCurrentHub(e.target.checked)} /> อัปเดตสังกัดปัจจุบันของพนักงานจากไฟล์นี้ (ใช้เมื่อยืนยันการย้าย HUB จริงเท่านั้น)</label>
        <p className="muted">ถ้าไม่เลือก ระบบจะเก็บ Incentive ตาม HUB และรอบเดือนของไฟล์โดยไม่เขียนทับสังกัดปัจจุบันของพนักงานเดิม พนักงานใหม่ยังเพิ่มเข้า Master ได้</p>
        <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); }} />

        <div className="actions">
          <button onClick={doPreview} type="button" disabled={!file || submitting}>อ่านไฟล์ / Preview</button>
          {preview && (
            <button onClick={confirm} disabled={!hub.trim() || submitting} type="button" className="btn-blue">{submitting ? 'กำลังนำเข้า... ห้ามกดซ้ำ' : 'ยืนยันนำเข้า'}</button>
          )}
        </div>
      </div>

      {preview && (
        <>
          <div className="card">
            <h2 className="section-title">สรุปทุกชีตที่จะนำเข้า</h2>
            <p><strong>รวม {preview.totalRows || 0} แถว จาก {preview.sheets?.length || 0} ชีต</strong></p>
            {(preview.sheets || []).map((sheet: any) => (
              <p key={sheet.name}>{sheet.name}: {sheet.rowCount} แถว / {sheet.columnCount} คอลัมน์</p>
            ))}
            <p className="muted">ถ้าจำนวนแถวไม่ตรงกับไฟล์ต้นฉบับ ห้ามกดยืนยันนำเข้า</p>
          </div>
          <div className={`notice ${preview.shift_column_detected ? 'ok' : ''}`}>
            {preview.shiftMessage}
          </div>

          <h2 className="section-title">Mapping คอลัมน์</h2>
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table">
                <thead>
                  <tr>
                    <th>หัวตาราง Excel</th>
                    <th>ชื่อไทย</th>
                    <th>ฟิลด์ระบบ</th>
                    <th>หมวด</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.mappings.map((m: any, i: number) => (
                    <tr key={`${m.excel_header}-${i}`}>
                      <td>{m.excel_header}</td>
                      <td>{m.thai_label}</td>
                      <td>{m.system_field}</td>
                      <td>{m.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="responsive-mobile-cards mobile-card-list data-card-list">
            {preview.mappings.map((m: any, i: number) => (
              <div className="card mobile-data-card data-card" key={`${m.excel_header}-${i}`}>
                <div className="mobile-data-card-head">
                  <div>
                    <span className="data-kicker">Excel</span>
                    <h3>{m.excel_header}</h3>
                  </div>
                  <span className="pill">{m.category}</span>
                </div>
                <div className="mobile-info-grid data-grid">
                  <div><span>ชื่อไทย</span><strong>{m.thai_label}</strong></div>
                  <div><span>ฟิลด์ระบบ</span><strong>{m.system_field}</strong></div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="section-title">ตัวอย่างข้อมูลทุกชีต</h2>
          {(preview.sampleRowsBySheet || []).map((sheet: any) => (
            <div className="card" key={sheet.name}>
              <h3>{sheet.name}</h3>
              <pre className="pre">{JSON.stringify(sheet.rows, null, 2)}</pre>
            </div>
          ))}
        </>
      )}
    </AppShell>
  );
}
