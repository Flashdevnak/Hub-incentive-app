'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message, useApi } from '@/components/ClientTools';
import { formatThaiDateTime } from '@/lib/date';

type RequestType = 'activation' | 'pin' | 'issue';
type ModalMode = 'detail' | 'approve' | 'reject';
type TabKey = 'all' | RequestType;

type ApprovalItem = {
  id: string;
  type: RequestType;
  typeLabel: string;
  employee_code?: string;
  employee_name?: string;
  hub_name?: string;
  position?: string;
  submitted_at?: string;
  status?: string;
  title?: string;
  detail?: string;
  note?: string;
};

type ActionModal = {
  mode: ModalMode;
  item: ApprovalItem;
} | null;

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'activation', label: 'เปิดใช้งาน' },
  { key: 'pin', label: 'รีเซ็ต PIN' },
  { key: 'issue', label: 'คำร้องตรวจสอบ' }
];

function pendingStatus(value?: string) {
  const status = String(value || '').trim().toUpperCase();
  return !status || ['PENDING', 'OPEN', 'รอตรวจสอบ', 'กำลังดำเนินการ', 'IN_PROGRESS'].includes(status);
}

function typeClass(type: RequestType) {
  if (type === 'activation') return 'type-activation';
  if (type === 'pin') return 'type-pin';
  return 'type-issue';
}

function emptyCounts() {
  return {
    activation: 0,
    pin: 0,
    issue: 0,
    all: 0
  };
}

export default function ApprovalCenter() {
  const activation = useApi<{ requests: any[] }>('/api/manager/activation-requests');
  const pin = useApi<{ requests: any[] }>('/api/manager/pin-reset-requests');
  const issue = useApi<{ issues: any[] }>('/api/admin/issues');

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ActionModal>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'notice' | 'ok' | 'danger'>('notice');

  const loading = activation.loading || pin.loading || issue.loading;
  const error = activation.error || pin.error || issue.error;

  const items = useMemo<ApprovalItem[]>(() => {
    const activationItems = (activation.data?.requests || []).map((r: any) => ({
      id: r.id,
      type: 'activation' as const,
      typeLabel: 'เปิดใช้งาน',
      employee_code: r.employee_code,
      employee_name: r.employee_name,
      hub_name: r.hub_name,
      position: r.position,
      submitted_at: r.requested_at,
      status: r.status || 'PENDING',
      title: 'คำขอเปิดใช้งานครั้งแรก',
      detail: `วันเริ่มงาน: ${r.start_date_input || '-'}`
    }));

    const pinItems = (pin.data?.requests || []).map((r: any) => ({
      id: r.id,
      type: 'pin' as const,
      typeLabel: 'รีเซ็ต PIN',
      employee_code: r.employee_code,
      employee_name: r.employee_name,
      hub_name: r.hub_name,
      position: r.position,
      submitted_at: r.requested_at,
      status: r.status || 'PENDING',
      title: 'คำขอรีเซ็ต PIN',
      detail: r.reason || '-'
    }));

    const issueItems = (issue.data?.issues || [])
      .filter((r: any) => pendingStatus(r.status))
      .map((r: any) => ({
        id: r.id,
        type: 'issue' as const,
        typeLabel: 'คำร้องตรวจสอบ',
        employee_code: r.employee_code,
        employee_name: r.employee_name,
        hub_name: r.hub_name,
        position: r.position,
        submitted_at: r.created_at,
        status: r.status || 'OPEN',
        title: r.topic || 'คำร้องตรวจสอบ',
        detail: r.detail || '-',
        note: r.resolution_note || ''
      }));

    return [...activationItems, ...pinItems, ...issueItems].sort((a, b) => (
      new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
    ));
  }, [activation.data, pin.data, issue.data]);

  const counts = useMemo(() => {
    const next = emptyCounts();
    for (const item of items) {
      next[item.type]++;
      next.all++;
    }
    return next;
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      if (tab !== 'all' && item.type !== tab) return false;
      if (!needle) return true;

      return [
        item.typeLabel,
        item.employee_code,
        item.employee_name,
        item.hub_name,
        item.position,
        item.title,
        item.detail,
        item.status
      ].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [items, query, tab]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setModal(null);
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openModal(mode: ModalMode, item: ApprovalItem) {
    setRejectReason('');
    setModal({ mode, item });
  }

  async function submitAction() {
    if (!modal || modal.mode === 'detail') return;

    if (modal.mode === 'reject' && !rejectReason.trim()) {
      setMessageType('danger');
      setMessage('กรุณาระบุเหตุผลก่อนปฏิเสธคำขอ');
      return;
    }

    const { item, mode } = modal;
    const approve = mode === 'approve';
    const reason = approve
      ? item.type === 'pin'
        ? 'อนุมัติรีเซ็ต PIN'
        : item.type === 'activation'
          ? 'อนุมัติเปิดใช้งาน'
          : 'ตรวจสอบและดำเนินการเรียบร้อยแล้ว'
      : rejectReason.trim();

    const endpoint =
      item.type === 'activation'
        ? approve ? '/api/manager/approve-activation' : '/api/manager/reject-activation'
        : item.type === 'pin'
          ? approve ? '/api/manager/approve-pin-reset' : '/api/manager/reject-pin-reset'
          : '/api/admin/issues';

    const body =
      item.type === 'issue'
        ? { id: item.id, status: approve ? 'RESOLVED' : 'REJECTED', resolutionNote: reason }
        : { requestId: item.id, reason };

    setBusyId(item.id);
    setMessage('');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setMessageType('danger');
        setMessage(json?.message || 'ดำเนินการไม่สำเร็จ');
        return;
      }

      setMessageType('ok');
      setMessage(approve ? 'อนุมัติคำขอสำเร็จ' : 'ไม่อนุมัติคำขอแล้ว');
      setModal(null);
      setTimeout(() => location.reload(), 600);
    } catch {
      setMessageType('danger');
      setMessage('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell area="manager">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Approval Center</p>
          <h1>ศูนย์อนุมัติ</h1>
          <p className="muted">รวมคำขอที่รอการตรวจสอบและอนุมัติ</p>
        </div>
      </div>

      <Message text={message} type={messageType} />

      <div className="grid grid-3 approval-summary-grid">
        <div className="card kpi-card approval-stat-card">
          <div className="label">รอเปิดใช้งาน</div>
          <div className="kpi">{counts.activation}</div>
          <p className="muted small">คำขอเปิดใช้งานครั้งแรก</p>
        </div>
        <div className="card kpi-card approval-stat-card">
          <div className="label">รอรีเซ็ต PIN</div>
          <div className="kpi">{counts.pin}</div>
          <p className="muted small">คำขอให้ตั้ง PIN ใหม่</p>
        </div>
        <div className="card kpi-card approval-stat-card">
          <div className="label">คำร้องตรวจสอบ</div>
          <div className="kpi">{counts.issue}</div>
          <p className="muted small">คำร้องที่ยังต้องดำเนินการ</p>
        </div>
        <div className="card kpi-card approval-stat-card total">
          <div className="label">รวมทั้งหมด</div>
          <div className="kpi">{counts.all}</div>
          <p className="muted small">รายการที่อยู่ในขอบเขตสิทธิ์ของคุณ</p>
        </div>
      </div>

      <div className="card approval-toolbar">
        <div className="approval-tabs">
          {tabs.map((item) => (
            <button
              type="button"
              className={tab === item.key ? 'active' : ''}
              onClick={() => setTab(item.key)}
              key={item.key}
            >
              {item.label}
              {counts[item.key] > 0 && <span>{counts[item.key] > 99 ? '99+' : counts[item.key]}</span>}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหารหัส ชื่อ HUB หรือประเภทคำขอ"
        />
      </div>

      {loading && <div className="notice">กำลังโหลดคำขออนุมัติ...</div>}
      {error && <div className="notice danger">{error}</div>}

      {!loading && !error && filteredItems.length === 0 && (
        <div className="card empty-state-card">
          <h2>ไม่มีคำขอรออนุมัติ</h2>
          <p className="muted">เมื่อมีคำขอที่อยู่ในขอบเขตสิทธิ์ของคุณ รายการจะแสดงที่ศูนย์อนุมัตินี้</p>
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <>
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table approval-center-table">
                <thead>
                  <tr>
                    <th>ประเภท</th>
                    <th>พนักงาน</th>
                    <th>HUB</th>
                    <th>รายละเอียด</th>
                    <th>สถานะ</th>
                    <th>วันที่ส่ง</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={`${item.type}-${item.id}`}>
                      <td><span className={`request-type-badge ${typeClass(item.type)}`}>{item.typeLabel}</span></td>
                      <td><strong>{item.employee_name || '-'}</strong><br /><span className="muted small">{item.employee_code || '-'}</span></td>
                      <td>{item.hub_name || '-'}</td>
                      <td className="desktop-detail-cell">{item.title || '-'}<br /><span className="muted small">{item.detail || '-'}</span></td>
                      <td><span className="pill">{item.status || 'PENDING'}</span></td>
                      <td>{formatThaiDateTime(item.submitted_at)}</td>
                      <td>
                        <div className="desktop-table-actions">
                          <button className="btn-secondary small-button" onClick={() => openModal('detail', item)}>ดูรายละเอียด</button>
                          <button className="small-button" disabled={busyId === item.id} onClick={() => openModal('approve', item)}>อนุมัติ</button>
                          <button className="btn-danger small-button" disabled={busyId === item.id} onClick={() => openModal('reject', item)}>ไม่อนุมัติ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="responsive-mobile-cards mobile-card-list data-card-list approval-card-list">
            {filteredItems.map((item) => (
              <div className="card mobile-data-card data-card approval-request-card" key={`${item.type}-${item.id}`}>
                <div className="mobile-data-card-head">
                  <div>
                    <span className={`request-type-badge ${typeClass(item.type)}`}>{item.typeLabel}</span>
                    <h3>{item.employee_name || '-'}</h3>
                    <p className="data-subtitle">{item.employee_code || '-'}</p>
                  </div>
                  <span className="pill">{item.status || 'PENDING'}</span>
                </div>
                <div className="mobile-info-grid data-grid">
                  <div><span>HUB</span><strong>{item.hub_name || '-'}</strong></div>
                  <div><span>ตำแหน่ง</span><strong>{item.position || '-'}</strong></div>
                  <div><span>วันที่ส่ง</span><strong>{formatThaiDateTime(item.submitted_at)}</strong></div>
                  <div><span>หัวข้อ</span><strong>{item.title || '-'}</strong></div>
                </div>
                <div className="data-note">
                  <span>รายละเอียด</span>
                  <p>{item.detail || '-'}</p>
                </div>
                <div className="data-card-actions three">
                  <button className="btn-secondary" onClick={() => openModal('detail', item)}>ดูรายละเอียด</button>
                  <button disabled={busyId === item.id} onClick={() => openModal('approve', item)}>อนุมัติ</button>
                  <button className="btn-danger" disabled={busyId === item.id} onClick={() => openModal('reject', item)}>ไม่อนุมัติ</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modal && (
        <div className="approval-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModal(null);
        }}>
          <div className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-modal-title">
            <button className="approval-modal-close" type="button" onClick={() => setModal(null)} aria-label="ปิด">×</button>
            <div className="approval-modal-head">
              <span className={`request-type-badge ${typeClass(modal.item.type)}`}>{modal.item.typeLabel}</span>
              <span className="pill">{modal.item.status || 'PENDING'}</span>
              <h2 id="approval-modal-title">
                {modal.mode === 'approve' ? 'ยืนยันการอนุมัติ' : modal.mode === 'reject' ? 'ไม่อนุมัติคำขอ' : 'รายละเอียดคำขอ'}
              </h2>
              <p className="muted">
                {modal.mode === 'approve'
                  ? 'ตรวจสอบข้อมูลให้ครบถ้วนก่อนยืนยัน'
                  : modal.mode === 'reject'
                    ? 'กรุณาระบุเหตุผลเพื่อแจ้งผลกลับอย่างชัดเจน'
                    : 'ตรวจสอบรายละเอียดคำขอที่อยู่ในขอบเขตสิทธิ์ของคุณ'}
              </p>
            </div>

            <div className="approval-modal-body">
              <div><span>พนักงาน</span><strong>{modal.item.employee_name || '-'}</strong></div>
              <div><span>รหัส</span><strong>{modal.item.employee_code || '-'}</strong></div>
              <div><span>HUB</span><strong>{modal.item.hub_name || '-'}</strong></div>
              <div><span>ตำแหน่ง</span><strong>{modal.item.position || '-'}</strong></div>
              <div><span>วันที่ส่ง</span><strong>{formatThaiDateTime(modal.item.submitted_at)}</strong></div>
              <div><span>หัวข้อ</span><strong>{modal.item.title || '-'}</strong></div>
            </div>

            <div className="approval-modal-note">
              <span>รายละเอียดคำขอ</span>
              <p>{modal.item.detail || '-'}</p>
            </div>

            {modal.mode === 'reject' && (
              <label className="approval-reason-field">
                <span>เหตุผลที่ไม่อนุมัติ</span>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="ระบุเหตุผลให้พนักงานหรือผู้เกี่ยวข้องทราบ"
                  rows={4}
                />
              </label>
            )}

            <div className="approval-modal-actions">
              <button className="btn-secondary" type="button" onClick={() => setModal(null)}>ยกเลิก</button>
              {modal.mode === 'approve' && (
                <button type="button" disabled={busyId === modal.item.id} onClick={submitAction}>อนุมัติ</button>
              )}
              {modal.mode === 'reject' && (
                <button className="btn-danger" type="button" disabled={busyId === modal.item.id} onClick={submitAction}>ไม่อนุมัติ</button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
