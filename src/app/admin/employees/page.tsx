'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message } from '@/components/ClientTools';
import type { Role, SessionUser, AccountStatus } from '@/types';

type ScopeType = SessionUser['scopeType'];

type EmployeeRow = {
  id?: string;
  employee_code: string;
  employee_name?: string;
  hub_id?: string;
  hub_name?: string;
  area?: string;
  position?: string;
  position_category?: string;
  start_date?: string;
  employment_status?: string;
  account_role?: Role;
  account_status?: AccountStatus;
  scope_type?: ScopeType;
  scope_value?: string;
  is_locked?: boolean;
};

type FormState = {
  employee_code: string;
  employee_name: string;
  hub_id: string;
  hub_name: string;
  area: string;
  position: string;
  start_date: string;
  employment_status: string;
  role: Role;
  scope_type: ScopeType;
  scope_value: string;
  status: AccountStatus;
  pin: string;
};

const emptyForm: FormState = {
  employee_code: '',
  employee_name: '',
  hub_id: '',
  hub_name: '',
  area: '',
  position: '',
  start_date: '',
  employment_status: 'ACTIVE',
  role: 'staff',
  scope_type: 'SELF',
  scope_value: '',
  status: 'PIN_REQUIRED',
  pin: ''
};

const roleOptions: { value: Role; label: string; desc: string }[] = [
  { value: 'staff', label: 'พนักงาน', desc: 'เห็นข้อมูลตัวเอง' },
  { value: 'supervisor', label: 'Supervisor', desc: 'หัวหน้าทีม/กะ' },
  { value: 'hub_manager', label: 'HUB Manager', desc: 'ดูแลตาม HUB' },
  { value: 'area_manager', label: 'Area Manager', desc: 'ดูแลตาม Area' },
  { value: 'admin', label: 'Admin', desc: 'จัดการระบบ' },
  { value: 'viewer', label: 'Viewer', desc: 'ดูข้อมูลแบบจำกัด' }
];

const scopeOptions: { value: ScopeType; label: string }[] = [
  { value: 'SELF', label: 'SELF - เฉพาะตัวเอง' },
  { value: 'TEAM', label: 'TEAM - ทีม/กะ' },
  { value: 'HUB', label: 'HUB - คลัง/สาขา' },
  { value: 'AREA', label: 'AREA - พื้นที่' },
  { value: 'ALL', label: 'ALL - ทั้งระบบ' }
];

const statusOptions: { value: AccountStatus; label: string }[] = [
  { value: 'PIN_REQUIRED', label: 'รอตั้ง PIN' },
  { value: 'ACTIVE', label: 'ใช้งานได้' },
  { value: 'LOCKED', label: 'ล็อก' },
  { value: 'DISABLED', label: 'ปิดใช้งาน' }
];

function deriveScopeByRole(role: Role): ScopeType {
  if (role === 'admin' || role === 'super_admin') return 'ALL';
  if (role === 'area_manager') return 'AREA';
  if (role === 'hub_manager') return 'HUB';
  if (role === 'supervisor') return 'TEAM';
  return 'SELF';
}

function statusClass(status?: string) {
  if (status === 'ACTIVE') return 'pill pill-ok';
  if (status === 'LOCKED' || status === 'DISABLED') return 'pill pill-danger';
  return 'pill';
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'notice' | 'ok' | 'danger'>('notice');

  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadEmployees() {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/employees');
      const json = await res.json();

      if (!json.ok) {
        setMessageType('danger');
        setMessage(json.message || 'โหลดข้อมูลไม่สำเร็จ');
        return;
      }

      setEmployees(json.employees || []);
    } catch (e) {
      setMessageType('danger');
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'role') {
        next.scope_type = deriveScopeByRole(value as Role);

        if (value === 'staff' || value === 'viewer') {
          next.scope_value = '';
        }
      }

      return next;
    });
  }

  function edit(row: EmployeeRow) {
    setForm({
      employee_code: row.employee_code || '',
      employee_name: row.employee_name || '',
      hub_id: row.hub_id || '',
      hub_name: row.hub_name || '',
      area: row.area || '',
      position: row.position || '',
      start_date: row.start_date || '',
      employment_status: row.employment_status || 'ACTIVE',
      role: row.account_role || 'staff',
      scope_type: row.scope_type || deriveScopeByRole(row.account_role || 'staff'),
      scope_value: row.scope_value || '',
      status: row.account_status || 'PIN_REQUIRED',
      pin: ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    if (!form.employee_code.trim()) {
      setMessageType('danger');
      setMessage('กรุณากรอกรหัสพนักงาน');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const json = await res.json();

      if (!json.ok) {
        setMessageType('danger');
        setMessage(json.message || 'บันทึกไม่สำเร็จ');
        return;
      }

      setMessageType('ok');
      setMessage('บันทึกข้อมูลสำเร็จ');
      setForm(emptyForm);
      await loadEmployees();
    } catch (e) {
      setMessageType('danger');
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  }

  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return [
      e.employee_code,
      e.employee_name,
      e.hub_id,
      e.hub_name,
      e.area,
      e.position,
      e.account_role,
      e.account_status
    ]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <AppShell area="admin">
      <div className="page-head">
        <div>
          <p className="eyebrow">Employees & Roles</p>
          <h1>ข้อมูลพนักงาน / สิทธิ์</h1>
          <p className="muted">
            ใช้หน้านี้สร้างบัญชีพนักงาน, Manager, Supervisor และกำหนด Scope การมองเห็นข้อมูล
          </p>
        </div>

        <button className="btn-secondary" onClick={() => setForm(emptyForm)}>
          ล้างฟอร์ม
        </button>
      </div>

      <Message text={message} type={messageType} />

      <div className="card section-card">
        <h2>สร้าง / แก้ไขบัญชี</h2>
        <p className="muted small">
          ถ้าต้องการสร้าง Manager หรือ Supervisor ให้กรอกรหัสพนักงาน, เลือกสิทธิ์, กำหนด Scope และตั้ง PIN เริ่มต้น
        </p>

        <form className="form employee-form" onSubmit={save}>
          <div className="split">
            <label>
              รหัสพนักงาน
              <input
                value={form.employee_code}
                onChange={(e) => updateForm('employee_code', e.target.value)}
                placeholder="เช่น 6600123"
              />
            </label>

            <label>
              ชื่อพนักงาน
              <input
                value={form.employee_name}
                onChange={(e) => updateForm('employee_name', e.target.value)}
                placeholder="ชื่อ-นามสกุล"
              />
            </label>
          </div>

          <div className="split">
            <label>
              Area
              <input
                value={form.area}
                onChange={(e) => updateForm('area', e.target.value)}
                placeholder="เช่น NE1"
              />
            </label>

            <label>
              HUB ID
              <input
                value={form.hub_id}
                onChange={(e) => updateForm('hub_id', e.target.value)}
                placeholder="เช่น 26NAK_BHUB"
              />
            </label>
          </div>

          <label>
            HUB Name
            <input
              value={form.hub_name}
              onChange={(e) => updateForm('hub_name', e.target.value)}
              placeholder="เช่น 26 NAK_BHUB-นครราชสีมา"
            />
          </label>

          <div className="split">
            <label>
              ตำแหน่ง
              <input
                value={form.position}
                onChange={(e) => updateForm('position', e.target.value)}
                placeholder="ตำแหน่งงาน"
              />
            </label>

            <label>
              วันเริ่มงาน
              <input
                value={form.start_date}
                onChange={(e) => updateForm('start_date', e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </label>
          </div>

          <div className="split">
            <label>
              สิทธิ์ใช้งาน
              <select value={form.role} onChange={(e) => updateForm('role', e.target.value as Role)}>
                {roleOptions.map((r) => (
                  <option value={r.value} key={r.value}>
                    {r.label} - {r.desc}
                  </option>
                ))}
              </select>
            </label>

            <label>
              สถานะบัญชี
              <select
                value={form.status}
                onChange={(e) => updateForm('status', e.target.value as AccountStatus)}
              >
                {statusOptions.map((s) => (
                  <option value={s.value} key={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="split">
            <label>
              Scope Type
              <select
                value={form.scope_type}
                onChange={(e) => updateForm('scope_type', e.target.value as ScopeType)}
              >
                {scopeOptions.map((s) => (
                  <option value={s.value} key={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Scope Value
              <input
                value={form.scope_value}
                onChange={(e) => updateForm('scope_value', e.target.value)}
                placeholder="เช่น NE1 หรือ 26NAK_BHUB"
              />
            </label>
          </div>

          <label>
            PIN เริ่มต้น / เปลี่ยน PIN
            <input
              value={form.pin}
              onChange={(e) => updateForm('pin', e.target.value)}
              type="password"
              inputMode="numeric"
              placeholder="เว้นว่างไว้ ถ้าไม่เปลี่ยน PIN"
            />
          </label>

          <div className="notice employee-scope-note">
            <strong>ตัวอย่างการใช้งาน</strong>
            <span><b>hub_manager</b> ให้ Scope Type = HUB และ Scope Value = รหัส HUB</span>
            <span><b>area_manager</b> ให้ Scope Type = AREA และ Scope Value = Area เช่น NE1</span>
            <span><b>supervisor</b> ให้ Scope Type = TEAM หรือ HUB ตามที่ต้องการให้ดูแล</span>
          </div>

          <button disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกบัญชี / สิทธิ์'}</button>
        </form>
      </div>

      <div className="section-title-row employee-list-head">
        <div>
          <h2 className="section-title">รายการพนักงาน</h2>
          <p className="muted small">
            แสดงแบบการ์ดเพื่อให้อ่านง่าย ไม่ต้องเลื่อนตารางไปทางขวา
          </p>
        </div>

        <input
          className="search-input employee-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหารหัส / ชื่อ / HUB / Role"
        />
      </div>

      {loading ? (
        <div className="notice">กำลังโหลดข้อมูล...</div>
      ) : (
        <div className="employee-card-list">
          {filtered.map((e) => (
            <div className="card employee-card" key={e.employee_code}>
              <div className="employee-card-top">
                <div className="employee-avatar">
                  {(e.employee_name || e.employee_code || '?').slice(0, 1)}
                </div>

                <div className="employee-main-info">
                  <div className="employee-code">{e.employee_code}</div>
                  <h3>{e.employee_name || '-'}</h3>
                  <p>{e.position || 'ไม่ระบุตำแหน่ง'}</p>
                </div>

                <span className={statusClass(e.account_status)}>
                  {e.account_status || 'NO_ACCOUNT'}
                </span>
              </div>

              <div className="employee-info-grid">
                <div>
                  <span>Area</span>
                  <strong>{e.area || '-'}</strong>
                </div>

                <div>
                  <span>HUB</span>
                  <strong>{e.hub_name || e.hub_id || '-'}</strong>
                </div>

                <div>
                  <span>Role</span>
                  <strong>{e.account_role || '-'}</strong>
                </div>

                <div>
                  <span>Scope</span>
                  <strong>
                    {e.scope_type || '-'}
                    {e.scope_value ? ` / ${e.scope_value}` : ''}
                  </strong>
                </div>
              </div>

              <div className="employee-card-actions">
                <button className="btn-secondary" onClick={() => edit(e)}>
                  แก้ไขข้อมูล / สิทธิ์
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card empty-state-card">
              <h2>ไม่พบข้อมูล</h2>
              <p className="muted">
                ไม่พบพนักงานตามคำค้นหา กรุณาลองค้นหาด้วยรหัส ชื่อ HUB หรือ Role อื่น
              </p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}