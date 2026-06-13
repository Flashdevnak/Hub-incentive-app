'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

export default function Issues() {
  const { data } = useApi<any>('/api/issues/my');
  const [topic, setTopic] = useState('ยอดเงินไม่ถูกต้อง');
  const [detail, setDetail] = useState('');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/issues/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, detail })
    });
    const json = await res.json();
    setMsg(json.message || (json.ok ? 'ส่งคำร้องเรียบร้อย' : 'ส่งคำร้องไม่สำเร็จ'));
    if (json.ok) setDetail('');
  }

  return (
    <AppShell>
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Support</p>
          <h1>แจ้งปัญหาข้อมูล</h1>
        </div>
      </div>

      <Message text={msg} type={msg.includes('เรียบร้อย') ? 'ok' : 'notice'} />

      <div className="split">
        <form className="card form" onSubmit={submit}>
          <label>
            หัวข้อ
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option>ยอดเงินไม่ถูกต้อง</option>
              <option>จำนวนวันเข้างานไม่ตรง</option>
              <option>มีค่าปรับที่ไม่เข้าใจ</option>
              <option>ข้อมูลส่วนตัวไม่ถูกต้อง</option>
              <option>ยังไม่พบข้อมูลของฉัน</option>
              <option>อื่น ๆ</option>
            </select>
          </label>

          <label>
            รายละเอียด
            <textarea rows={5} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </label>

          <button>ส่งคำร้อง</button>
        </form>

        <div className="card">
          <h2>ประวัติคำร้อง</h2>
          {(data?.issues || []).map((it: any) => (
            <p key={it.id}>
              <b>{it.topic}</b>
              <br />
              <span className="pill">{it.status}</span>
              <br />
              <span className="muted small">{formatThaiDateTime(it.created_at)}</span>
            </p>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
