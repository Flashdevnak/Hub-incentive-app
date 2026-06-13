'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Message } from '@/components/ClientTools';
import { isActiveEmployeeRecord, isExplicitInactiveEmployeeRecord } from '@/lib/employeeStatus';
import type { Role, SessionUser, AccountStatus, EmploymentStatus } from '@/types';

type ScopeType = SessionUser['scopeType'];
type StatusFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

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
  employment_status?: EmploymentStatus | string;
  is_active?: boolean;
  is_deleted?: boolean;
  resigned_at?: string;
  inactive_reason?: string;
  hidden_from_current_count?: boolean;
  shift_code?: string;
  shift_name?: string;
  shift_group?: string;
  shift_start?: string;
  shift_end?: string;
  account_role?: Role;
  account_status?: AccountStatus;
  scope_type?: ScopeType;
  scope_value?: string;
  permission_preset?: string;
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
  employment_status: EmploymentStatus;
  inactive_reason: string;
  shift_code: string;
  shift_name: string;
  shift_group: string;
  shift_start: string;
  shift_end: string;
  role: Role;
  scope_type: ScopeType;
  scope_value: string;
  permission_preset: string;
  status: AccountStatus;
  pin: string;
};

type PermissionPreset = {
  id: string;
  label: string;
  shortLabel: string;
  role: Role;
  scopeType: ScopeType;
  valueFrom: 'NONE' | 'HUB' | 'AREA' | 'SHIFT';
  explanation: string;
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
  inactive_reason: '',
  shift_code: '',
  shift_name: '',
  shift_group: '',
  shift_start: '',
  shift_end: '',
  role: 'staff',
  scope_type: 'SELF',
  scope_value: '',
  permission_preset: 'staff_self',
  status: 'PIN_REQUIRED',
  pin: ''
};

const roleOptions: { value: Role; label: string; desc: string }[] = [
  { value: 'staff', label: 'พนักงาน', desc: 'เห็นข้อมูลตัวเอง' },
  { value: 'supervisor', label: 'Supervisor', desc: 'ดูทีม/HUB ตาม Scope' },
  { value: 'hub_manager', label: 'HUB Manager', desc: 'ดูแลตาม HUB' },
  { value: 'area_manager', label: 'Area Manager', desc: 'ดูแลตาม Area' },
  { value: 'admin', label: 'Admin', desc: 'จัดการระบบ' },
  { value: 'super_admin', label: 'Super Admin', desc: 'จัดการทั้งระบบ' },
  { value: 'viewer', label: 'Viewer', desc: 'ดูข้อมูลแบบจำกัด' }
];

const scopeOptions: { value: ScopeType; label: string }[] = [
  { value: 'SELF', label: 'SELF - เฉพาะตัวเอง' },
  { value: 'TEAM', label: 'TEAM - ทีม/กะ' },
  { value: 'SHIFT', label: 'SHIFT - กะงาน' },
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

const employmentStatusOptions: { value: EmploymentStatus; label: string; desc: string }[] = [
  { value: 'ACTIVE', label: 'ใช้งานอยู่', desc: 'นับเป็นพนักงานปัจจุบัน' },
  { value: 'RESIGNED', label: 'ลาออก', desc: 'เก็บประวัติไว้ แต่ไม่รวมใน Headcount' },
  { value: 'INACTIVE', label: 'ไม่ใช้งาน', desc: 'พักใช้งานชั่วคราวหรือไม่ได้ทำงานปัจจุบัน' },
  { value: 'SUSPENDED', label: 'ระงับใช้งาน', desc: 'ไม่ให้นับใน Headcount และควรปิดบัญชี' }
];

const permissionPresets: PermissionPreset[] = [
  {
    id: 'staff_self',
    label: 'พนักงานทั่วไป',
    shortLabel: 'Staff / SELF',
    role: 'staff',
    scopeType: 'SELF',
    valueFrom: 'NONE',
    explanation: 'เห็นเฉพาะข้อมูลของตัวเอง'
  },
  {
    id: 'leader_hub',
    label: 'หัวหน้าทีม / Staff Leader ดูทั้ง HUB',
    shortLabel: 'Leader / HUB',
    role: 'supervisor',
    scopeType: 'HUB',
    valueFrom: 'HUB',
    explanation: 'เห็นข้อมูลพนักงานใน HUB นี้ เหมาะกับหัวหน้าทีมหรือ Staff Leader'
  },
  {
    id: 'supervisor_hub',
    label: 'HUB Supervisor ดูทั้ง HUB',
    shortLabel: 'Supervisor / HUB',
    role: 'supervisor',
    scopeType: 'HUB',
    valueFrom: 'HUB',
    explanation: 'แนะนำสำหรับ Supervisor ที่ดูหลายกะหรือดูทั้ง HUB'
  },
  {
    id: 'supervisor_shift',
    label: 'Supervisor จำกัดเฉพาะกะ',
    shortLabel: 'Supervisor / SHIFT',
    role: 'supervisor',
    scopeType: 'SHIFT',
    valueFrom: 'SHIFT',
    explanation: 'ใช้เฉพาะกรณีต้องจำกัดให้เห็นเฉพาะกะที่กำหนดจริง ๆ'
  },
  {
    id: 'hub_manager_hub',
    label: 'ผู้รับผิดชอบ HUB / Deputy Manager / Hub Manager',
    shortLabel: 'Hub Manager / HUB',
    role: 'hub_manager',
    scopeType: 'HUB',
    valueFrom: 'HUB',
    explanation: 'เหมาะสำหรับ Hub Deputy Manager หรือ Hub Manager ที่รับผิดชอบ HUB'
  },
  {
    id: 'area_manager_area',
    label: 'Area Manager',
    shortLabel: 'Area Manager / AREA',
    role: 'area_manager',
    scopeType: 'AREA',
    valueFrom: 'AREA',
    explanation: 'เห็นข้อมูลทั้ง Area ที่กำหนด'
  },
  {
    id: 'admin_all',
    label: 'Admin ระบบ',
    shortLabel: 'Admin / ALL',
    role: 'admin',
    scopeType: 'ALL',
    valueFrom: 'NONE',
    explanation: 'จัดการระบบตามสิทธิ์ Admin'
  },
  {
    id: 'super_admin_all',
    label: 'Super Admin',
    shortLabel: 'Super Admin / ALL',
    role: 'super_admin',
    scopeType: 'ALL',
    valueFrom: 'NONE',
    explanation: 'เห็นและจัดการทั้งระบบ'
  }
];

const customPreset: PermissionPreset = {
  id: 'custom_advanced',
  label: 'กำหนดเอง / Custom Advanced',
  shortLabel: 'Custom',
  role: 'viewer',
  scopeType: 'SELF',
  valueFrom: 'NONE',
  explanation: 'ตั้งค่า Role, Scope Type, Scope Value เองในขั้นสูง'
};

function deriveScopeByRole(role: Role): ScopeType {
  if (role === 'admin' || role === 'super_admin') return 'ALL';
  if (role === 'area_manager') return 'AREA';
  if (role === 'hub_manager') return 'HUB';
  if (role === 'supervisor') return 'HUB';
  return 'SELF';
}

function normalizeEmploymentStatus(status?: string): EmploymentStatus {
  if (status === 'RESIGNED' || status === 'INACTIVE' || status === 'SUSPENDED') return status;
  return 'ACTIVE';
}

function isCurrentActive(employee: EmployeeRow) {
  return isActiveEmployeeRecord(employee);
}

function statusClass(status?: string) {
  if (status === 'ACTIVE') return 'pill pill-ok';
  if (status === 'PIN_REQUIRED') return 'pill pill-warn';
  if (status === 'LOCKED' || status === 'DISABLED') return 'pill pill-danger';
  if (!status) return 'pill pill-muted';
  return 'pill';
}

function employmentStatusClass(status?: string) {
  const normalized = normalizeEmploymentStatus(status);
  if (normalized === 'ACTIVE') return 'pill pill-ok';
  if (normalized === 'RESIGNED') return 'pill pill-muted';
  if (normalized === 'SUSPENDED') return 'pill pill-danger';
  return 'pill';
}

function employmentStatusLabel(status?: string) {
  const normalized = normalizeEmploymentStatus(status);
  return employmentStatusOptions.find((s) => s.value === normalized)?.label || normalized;
}

function scopeMeaning(scopeType: ScopeType, scopeValue: string) {
  if (scopeType === 'SELF') return 'เห็นเฉพาะข้อมูลของตัวเอง';
  if (scopeType === 'HUB') return `เห็นข้อมูลพนักงานใน HUB นี้${scopeValue ? ` (${scopeValue})` : ''} ไม่จำกัดเฉพาะกะ`;
  if (scopeType === 'SHIFT') return `เห็นเฉพาะพนักงาน/ข้อมูลที่อยู่ในกะที่กำหนด${scopeValue ? ` (${scopeValue})` : ''}`;
  if (scopeType === 'AREA') return `เห็นข้อมูลทั้ง Area ที่กำหนด${scopeValue ? ` (${scopeValue})` : ''}`;
  if (scopeType === 'ALL') return 'เห็นข้อมูลทั้งระบบ';
  return 'เห็นตามทีม/กะที่กำหนด';
}

function presetValue(form: FormState, valueFrom: PermissionPreset['valueFrom']) {
  if (valueFrom === 'HUB') return form.hub_id.trim();
  if (valueFrom === 'AREA') return form.area.trim();
  if (valueFrom === 'SHIFT') return form.shift_code.trim() || form.shift_name.trim() || form.shift_group.trim();
  return '';
}

function presetForValues(role?: Role, scopeType?: ScopeType) {
  if (role === 'supervisor' && scopeType === 'HUB') {
    return permissionPresets.find((preset) => preset.id === 'supervisor_hub');
  }

  return permissionPresets.find((preset) => preset.role === role && preset.scopeType === scopeType);
}

function presetById(id?: string) {
  return permissionPresets.find((preset) => preset.id === id);
}

function presetForRow(row: EmployeeRow) {
  return presetById(row.permission_preset) || presetForValues(row.account_role, row.scope_type);
}

function suggestPermissionFromPosition(position: string) {
  const value = position.toLowerCase();
  if (!value) return permissionPresets[0];
  if (value.includes('area manager')) return permissionPresets.find((p) => p.id === 'area_manager_area');
  if (value.includes('deputy manager') || value.includes('hub manager')) return permissionPresets.find((p) => p.id === 'hub_manager_hub');
  if (value.includes('staff leader') || value.includes('leader')) return permissionPresets.find((p) => p.id === 'leader_hub');
  if (value.includes('supervisor')) return permissionPresets.find((p) => p.id === 'supervisor_hub');
  if (value.includes('staff')) return permissionPresets.find((p) => p.id === 'staff_self');
  return undefined;
}

function employeePayload(row: EmployeeRow, patch: Partial<FormState>) {
  const role = patch.role || row.account_role || 'staff';
  return {
    employee_code: row.employee_code,
    employee_name: row.employee_name || row.employee_code,
    hub_id: row.hub_id || '',
    hub_name: row.hub_name || '',
    area: row.area || '',
    position: row.position || '',
    start_date: row.start_date || '',
    employment_status: normalizeEmploymentStatus(row.employment_status),
    inactive_reason: row.inactive_reason || '',
    shift_code: row.shift_code || '',
    shift_name: row.shift_name || '',
    shift_group: row.shift_group || '',
    shift_start: row.shift_start || '',
    shift_end: row.shift_end || '',
    role,
    scope_type: row.scope_type || deriveScopeByRole(role),
    scope_value: row.scope_value || '',
    permission_preset: row.permission_preset || presetForValues(role, row.scope_type || deriveScopeByRole(role))?.id || 'custom_advanced',
    status: row.account_status || 'PIN_REQUIRED',
    pin: '',
    ...patch
  };
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [selectedPreset, setSelectedPreset] = useState(permissionPresets[0].id);
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

  const suggestedPreset = useMemo(() => suggestPermissionFromPosition(form.position), [form.position]);
  const currentPreset = presetById(form.permission_preset);
  const permissionMeaning = scopeMeaning(form.scope_type, form.scope_value);
  const warnings = useMemo(() => {
    const list: string[] = [];
    const position = form.position.toLowerCase();

    if (form.role === 'supervisor' && form.scope_type === 'SHIFT') {
      list.push('ใช้ SHIFT เฉพาะกรณีต้องการจำกัดให้เห็นเฉพาะกะนี้จริง ๆ ถ้า Supervisor ดูหลายกะ ให้ใช้ Scope Type = HUB');
    }

    if (position.includes('supervisor') && form.scope_type === 'SELF') {
      list.push('ตำแหน่ง Supervisor ไม่ควรใช้ SELF หากต้องดูข้อมูลทีม/HUB แนะนำ Scope Type = HUB');
    }

    if ((position.includes('deputy manager') || position.includes('hub manager')) && (form.role !== 'hub_manager' || form.scope_type !== 'HUB')) {
      list.push('ตำแหน่ง Deputy/Hub Manager แนะนำ role = hub_manager และ Scope Type = HUB');
    }

    if (position.includes('area manager') && (form.role !== 'area_manager' || form.scope_type !== 'AREA')) {
      list.push('ตำแหน่ง Area Manager แนะนำ role = area_manager และ Scope Type = AREA');
    }

    if (form.role === 'staff' && form.scope_type !== 'SELF') {
      list.push('พนักงานทั่วไปควรใช้ Scope Type = SELF ยกเว้นมีหน้าที่ดูแลข้อมูลระดับทีม/HUB');
    }

    if (form.employment_status === 'ACTIVE' && !form.hub_id.trim()) {
      list.push('พนักงานใช้งานอยู่ควรมี HUB ID เพื่อให้รายงานและ Scope ทำงานชัดเจน');
    }

    return list;
  }, [form]);

  const counts = useMemo(() => {
    const visibleEmployees = employees.filter((e) => e.is_deleted !== true);
    const active = visibleEmployees.filter(isCurrentActive).length;
    const inactive = visibleEmployees.filter(isExplicitInactiveEmployeeRecord).length;
    const activeAccounts = visibleEmployees.filter((e) => e.account_status === 'ACTIVE').length;
    const missingAccounts = visibleEmployees.filter((e) => isCurrentActive(e) && !e.account_status).length;
    const pending = visibleEmployees.filter((e) => e.account_status === 'PIN_REQUIRED').length;

    return {
      active,
      inactive,
      total: visibleEmployees.length,
      activeAccounts,
      missingAccounts,
      pending
    };
  }, [employees]);

  function applyPreset(id: string) {
    if (id === customPreset.id) {
      setSelectedPreset(customPreset.id);
      setForm((prev) => ({ ...prev, permission_preset: customPreset.id }));
      return;
    }

    const preset = permissionPresets.find((item) => item.id === id);
    if (!preset) return;

    const scopeValue = presetValue(form, preset.valueFrom);
    setSelectedPreset(id);
    setForm((prev) => ({
      ...prev,
      role: preset.role,
      scope_type: preset.scopeType,
      scope_value: scopeValue,
      permission_preset: preset.id
    }));

    if (preset.valueFrom !== 'NONE' && !scopeValue) {
      setMessageType('notice');
      setMessage(`Preset นี้ต้องใช้ค่า ${preset.valueFrom}. กรุณากรอก ${preset.valueFrom === 'HUB' ? 'HUB ID' : preset.valueFrom === 'AREA' ? 'Area' : 'Shift Code'} ก่อนบันทึก`);
    } else {
      setMessageType('ok');
      setMessage(`ใช้ preset: ${preset.label}`);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'role') {
        next.scope_type = deriveScopeByRole(value as Role);

        if (value === 'staff' || value === 'viewer') {
          next.scope_value = '';
        }
      }

      if (key === 'hub_id' && (next.scope_type === 'HUB') && !next.scope_value) next.scope_value = String(value);
      if (key === 'area' && (next.scope_type === 'AREA') && !next.scope_value) next.scope_value = String(value);
      if (key === 'shift_code' && (next.scope_type === 'SHIFT') && !next.scope_value) next.scope_value = String(value);

      if (key === 'role' || key === 'scope_type' || key === 'scope_value') {
        next.permission_preset = customPreset.id;
        setSelectedPreset(customPreset.id);
      }

      return next;
    });
  }

  function edit(row: EmployeeRow) {
    const role = row.account_role || 'staff';
    const scopeType = row.scope_type || deriveScopeByRole(role);
    const preset = presetForRow(row);

    setSelectedPreset(preset?.id || customPreset.id);
    setForm({
      employee_code: row.employee_code || '',
      employee_name: row.employee_name || '',
      hub_id: row.hub_id || '',
      hub_name: row.hub_name || '',
      area: row.area || '',
      position: row.position || '',
      start_date: row.start_date || '',
      employment_status: normalizeEmploymentStatus(row.employment_status),
      inactive_reason: row.inactive_reason || '',
      shift_code: row.shift_code || '',
      shift_name: row.shift_name || '',
      shift_group: row.shift_group || '',
      shift_start: row.shift_start || '',
      shift_end: row.shift_end || '',
      role,
      scope_type: scopeType,
      scope_value: row.scope_value || '',
      permission_preset: row.permission_preset || preset?.id || customPreset.id,
      status: row.account_status || 'PIN_REQUIRED',
      pin: ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateForm() {
    if (!form.employee_code.trim()) return 'กรุณากรอกรหัสพนักงาน';

    if ((form.scope_type === 'HUB' || form.scope_type === 'AREA' || form.scope_type === 'SHIFT') && !form.scope_value.trim()) {
      return `Scope Type = ${form.scope_type} ต้องมี Scope Value`;
    }

    if (form.scope_type === 'SHIFT' && !form.shift_code.trim() && !form.scope_value.trim()) {
      return 'Scope Type = SHIFT ต้องมี Shift Code หรือ Scope Value';
    }

    if (form.employment_status !== 'ACTIVE' && form.status === 'ACTIVE') {
      return 'พนักงานที่ลาออก/ไม่ใช้งานไม่ควรเปิดบัญชีเป็น ACTIVE กรุณาเปลี่ยนสถานะบัญชีเป็น DISABLED หรือ LOCKED ก่อนบันทึก';
    }

    return '';
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setMessageType('danger');
      setMessage(validationMessage);
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
      setSelectedPreset(permissionPresets[0].id);
      await loadEmployees();
    } catch (e) {
      setMessageType('danger');
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function updateEmployeeStatus(row: EmployeeRow, employmentStatus: EmploymentStatus) {
    const isReactivating = employmentStatus === 'ACTIVE';
    const confirmMessage = isReactivating
      ? 'เปิดใช้งานพนักงานคนนี้อีกครั้ง และนำกลับไปนับใน Headcount ปัจจุบัน?'
      : 'แนะนำให้ปิดใช้งาน/ลาออกแทนการลบถาวร เพื่อเก็บประวัติ Incentive ย้อนหลัง';

    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeePayload(row, {
          employment_status: employmentStatus,
          inactive_reason: isReactivating ? '' : 'เปลี่ยนสถานะจากหน้า Employee Management',
          status: isReactivating ? (row.account_status === 'DISABLED' ? 'PIN_REQUIRED' : row.account_status || 'PIN_REQUIRED') : 'DISABLED'
        }))
      });

      const json = await res.json();

      if (!json.ok) {
        setMessageType('danger');
        setMessage(json.message || 'เปลี่ยนสถานะไม่สำเร็จ');
        return;
      }

      setMessageType('ok');
      setMessage(isReactivating ? 'เปิดใช้งานพนักงานอีกครั้งแล้ว' : 'เปลี่ยนเป็นลาออก/ปิดใช้งานแล้ว');
      await loadEmployees();
    } catch (e) {
      setMessageType('danger');
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  }

  const filtered = employees
    .filter((e) => e.is_deleted !== true)
    .filter((e) => {
      if (statusFilter === 'ACTIVE') return isCurrentActive(e);
      if (statusFilter === 'INACTIVE') return isExplicitInactiveEmployeeRecord(e);
      return true;
    })
    .filter((e) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;

      return [
        e.employee_code,
        e.employee_name,
        e.hub_id,
        e.hub_name,
        e.area,
        e.position,
        e.shift_code,
        e.shift_name,
        e.shift_group,
        e.account_role,
        e.account_status,
        e.employment_status
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .filter((e) => {
      if (!shiftFilter) return true;
      return [e.shift_code, e.shift_name, e.shift_group].map((x) => String(x || '')).includes(shiftFilter);
    });

  const shiftOptions = Array.from(new Set(
    employees.flatMap((e) => [e.shift_code, e.shift_name, e.shift_group]).filter(Boolean).map(String)
  )).sort();

  return (
    <AppShell area="admin">
      <div className="page-head page-head-clean">
        <div>
          <p className="eyebrow">Employees & Roles</p>
          <h1>ข้อมูลพนักงาน / สิทธิ์</h1>
          <p className="muted">
            จัดการพนักงานปัจจุบัน ลาออก ไม่ใช้งาน และสิทธิ์การเข้าถึง โดยไม่กระทบประวัติ Incentive เดิม
          </p>
        </div>

        <button className="btn-secondary" onClick={() => { setForm(emptyForm); setSelectedPreset(permissionPresets[0].id); }}>
          ล้างฟอร์ม
        </button>
      </div>

      <Message text={message} type={messageType} />

      <div className="employee-count-grid">
        <button className={`employee-count-card ${statusFilter === 'ACTIVE' ? 'is-active' : ''}`} onClick={() => setStatusFilter('ACTIVE')}>
          <span>พนักงานใช้งานอยู่</span>
          <strong>{counts.active}</strong>
        </button>
        <button className={`employee-count-card ${statusFilter === 'INACTIVE' ? 'is-active' : ''}`} onClick={() => setStatusFilter('INACTIVE')}>
          <span>ลาออก/ไม่ใช้งาน</span>
          <strong>{counts.inactive}</strong>
        </button>
        <button className={`employee-count-card ${statusFilter === 'ALL' ? 'is-active' : ''}`} onClick={() => setStatusFilter('ALL')}>
          <span>ทั้งหมด</span>
          <strong>{counts.total}</strong>
        </button>
        <div className="employee-count-card">
          <span>บัญชีใช้งานได้</span>
          <strong>{counts.activeAccounts}</strong>
        </div>
        <div className="employee-count-card">
          <span>ยังไม่มีบัญชี</span>
          <strong>{counts.missingAccounts}</strong>
        </div>
        <div className="employee-count-card">
          <span>รอตั้ง PIN</span>
          <strong>{counts.pending}</strong>
        </div>
      </div>

      <div className="card section-card employee-form-card">
        <h2>สร้าง / แก้ไขบัญชี</h2>
        <p className="muted small">
          สถานะพนักงานใช้แยกพนักงานปัจจุบันกับพนักงานลาออก โดยประวัติ Incentive เดิมจะไม่หาย
        </p>

        <form className="form employee-form" onSubmit={save}>
          <div className="split">
            <label>
              รหัสพนักงาน
              <input value={form.employee_code} onChange={(e) => updateForm('employee_code', e.target.value)} placeholder="เช่น 6600123" />
            </label>

            <label>
              ชื่อพนักงาน
              <input value={form.employee_name} onChange={(e) => updateForm('employee_name', e.target.value)} placeholder="ชื่อ-นามสกุล" />
            </label>
          </div>

          <div className="split">
            <label>
              Area
              <input value={form.area} onChange={(e) => updateForm('area', e.target.value)} placeholder="เช่น NE1" />
            </label>

            <label>
              HUB ID
              <input value={form.hub_id} onChange={(e) => updateForm('hub_id', e.target.value)} placeholder="เช่น TH27101500" />
            </label>
          </div>

          <label>
            HUB Name
            <input value={form.hub_name} onChange={(e) => updateForm('hub_name', e.target.value)} placeholder="เช่น 26 NAK_BHUB-นครราชสีมา" />
          </label>

          <div className="split">
            <label>
              ตำแหน่ง
              <input value={form.position} onChange={(e) => updateForm('position', e.target.value)} placeholder="ตำแหน่งงาน" />
            </label>

            <label>
              วันเริ่มงาน
              <input value={form.start_date} onChange={(e) => updateForm('start_date', e.target.value)} placeholder="YYYY-MM-DD" />
            </label>
          </div>

          <div className="split">
            <label>
              สถานะพนักงาน
              <select value={form.employment_status} onChange={(e) => updateForm('employment_status', e.target.value as EmploymentStatus)}>
                {employmentStatusOptions.map((s) => (
                  <option value={s.value} key={s.value}>{s.label} - {s.desc}</option>
                ))}
              </select>
            </label>

            <label>
              เหตุผลเมื่อไม่ใช้งาน / ลาออก
              <input value={form.inactive_reason} onChange={(e) => updateForm('inactive_reason', e.target.value)} placeholder="เช่น ลาออก, ย้าย HUB, พักงาน" />
            </label>
          </div>

          <div className="notice employee-shift-note">
            <strong>ข้อมูลกะเป็น optional</strong>
            <span>ข้อมูลกะเป็นข้อมูลประกอบและใช้สำหรับกรอง/สรุปผล ไม่ได้จำกัดสิทธิ์อัตโนมัติ ยกเว้นเลือก Scope Type = SHIFT</span>
          </div>

          <div className="split">
            <label>
              รหัสกะ / Shift Code
              <input value={form.shift_code} onChange={(e) => updateForm('shift_code', e.target.value)} placeholder="เช่น DAY, NIGHT, A, 01:00-10:00" />
            </label>

            <label>
              ชื่อกะ / Shift Name
              <input value={form.shift_name} onChange={(e) => updateForm('shift_name', e.target.value)} placeholder="เช่น กะเช้า / กะดึก" />
            </label>
          </div>

          <div className="split">
            <label>
              กลุ่มกะ / Shift Group
              <input value={form.shift_group} onChange={(e) => updateForm('shift_group', e.target.value)} placeholder="เช่น DAY, AFTERNOON, NIGHT" />
            </label>

            <label>
              เวลากะ
              <div className="split compact-split">
                <input value={form.shift_start} onChange={(e) => updateForm('shift_start', e.target.value)} placeholder="เริ่ม เช่น 01:00" />
                <input value={form.shift_end} onChange={(e) => updateForm('shift_end', e.target.value)} placeholder="สิ้นสุด เช่น 10:00" />
              </div>
            </label>
          </div>

          <div className="permission-section">
            <div>
              <h3>ตั้งค่าสิทธิ์แบบง่าย</h3>
              <p className="muted small">เลือกแบบสิทธิ์ด้านล่าง ระบบจะเติม Role และ Scope ให้อัตโนมัติ ถ้าไม่แน่ใจให้เลือกตามตำแหน่งงานจริง</p>
            </div>

            {suggestedPreset && suggestedPreset.id !== currentPreset?.id && (
              <div className="permission-suggestion">
                <span>ระบบแนะนำ: {suggestedPreset.label}</span>
                <button type="button" className="btn-secondary small-button" onClick={() => applyPreset(suggestedPreset.id)}>ใช้ค่าที่แนะนำ</button>
              </div>
            )}

            <label>
              Permission Preset
              <select value={selectedPreset} onChange={(e) => applyPreset(e.target.value)}>
                <option value={customPreset.id}>กำหนดเอง / Manual</option>
                {permissionPresets.map((preset) => (
                  <option value={preset.id} key={preset.id}>{preset.label}</option>
                ))}
              </select>
            </label>

            <div className="permission-preset-grid">
              {permissionPresets.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  className={`permission-preset-card ${selectedPreset === preset.id ? 'is-active' : ''}`}
                  onClick={() => applyPreset(preset.id)}
                >
                  <strong>{preset.shortLabel}</strong>
                  <span>{preset.explanation}</span>
                </button>
              ))}
            </div>

            <details className="advanced-permission">
              <summary>ตั้งค่าขั้นสูง</summary>
              <div className="split">
                <label>
                  สิทธิ์ใช้งาน
                  <select value={form.role} onChange={(e) => updateForm('role', e.target.value as Role)}>
                    {roleOptions.map((r) => (
                      <option value={r.value} key={r.value}>{r.label} - {r.desc}</option>
                    ))}
                  </select>
                </label>

                <label>
                  สถานะบัญชี
                  <select value={form.status} onChange={(e) => updateForm('status', e.target.value as AccountStatus)}>
                    {statusOptions.map((s) => (
                      <option value={s.value} key={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="split">
                <label>
                  Scope Type
                  <select value={form.scope_type} onChange={(e) => updateForm('scope_type', e.target.value as ScopeType)}>
                    {scopeOptions.map((s) => (
                      <option value={s.value} key={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Scope Value
                  <input value={form.scope_value} onChange={(e) => updateForm('scope_value', e.target.value)} placeholder="เช่น NE1 หรือ TH27101500" />
                </label>
              </div>
            </details>
          </div>

          <label>
            PIN เริ่มต้น / เปลี่ยน PIN
            <input value={form.pin} onChange={(e) => updateForm('pin', e.target.value)} type="password" inputMode="numeric" placeholder="เว้นว่างไว้ ถ้าไม่เปลี่ยน PIN" />
          </label>

          <div className="permission-summary-card">
            <h3>สรุปสิทธิ์</h3>
            <div className="employee-info-grid">
              <div><span>ตำแหน่ง</span><strong>{form.position || '-'}</strong></div>
              <div><span>สิทธิ์ระบบ</span><strong>{form.role}</strong></div>
              <div><span>ขอบเขตข้อมูล</span><strong>{form.scope_type}</strong></div>
              <div><span>ค่า Scope</span><strong>{form.scope_value || '-'}</strong></div>
              <div><span>สถานะพนักงาน</span><strong>{employmentStatusLabel(form.employment_status)}</strong></div>
              <div><span>ความหมาย</span><strong>{permissionMeaning}</strong></div>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="notice warning-list">
              {warnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          )}

          <button disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกบัญชี / สิทธิ์'}</button>
        </form>
      </div>

      <div className="section-title-row employee-list-head">
        <div>
          <h2 className="section-title">รายการพนักงาน</h2>
          <p className="muted small">ค่าเริ่มต้นแสดงเฉพาะพนักงานที่ใช้งานอยู่ เพื่อให้ Headcount ปัจจุบันไม่ปนกับประวัติเก่า</p>
        </div>

        <div className="employee-filter-bar">
          <div className="status-tabs">
            <button className={statusFilter === 'ACTIVE' ? 'is-active' : ''} onClick={() => setStatusFilter('ACTIVE')}>ใช้งานอยู่</button>
            <button className={statusFilter === 'INACTIVE' ? 'is-active' : ''} onClick={() => setStatusFilter('INACTIVE')}>ลาออก/ไม่ใช้งาน</button>
            <button className={statusFilter === 'ALL' ? 'is-active' : ''} onClick={() => setStatusFilter('ALL')}>ทั้งหมด</button>
          </div>

          <input
            className="search-input employee-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัส / ชื่อ / HUB / Role / กะ"
          />

          <select
            className="search-input employee-shift-filter"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option value="">ทุกกะ</option>
            {shiftOptions.map((shift) => (
              <option value={shift} key={shift}>{shift}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="notice">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
        {filtered.length > 0 && (
          <div className="responsive-desktop-table">
            <div className="table-wrap desktop-table-card">
              <table className="desktop-data-table employee-data-table">
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>HUB</th>
                    <th>Shift</th>
                    <th>Permission</th>
                    <th>Scope</th>
                    <th>Employee Status</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const rowPreset = presetForRow(e);
                    const active = isCurrentActive(e);

                    return (
                      <tr key={e.employee_code}>
                        <td><strong>{e.employee_code}</strong></td>
                        <td>{e.employee_name || '-'}</td>
                        <td>{e.position || '-'}</td>
                        <td className="desktop-detail-cell">{e.hub_name || e.hub_id || '-'}</td>
                        <td>{e.shift_name || e.shift_code || e.shift_group || '-'}</td>
                        <td>{rowPreset?.shortLabel || e.account_role || '-'}</td>
                        <td>{e.scope_type || '-'}{e.scope_value ? ` / ${e.scope_value}` : ''}</td>
                        <td><span className={employmentStatusClass(e.employment_status)}>{employmentStatusLabel(e.employment_status)}</span></td>
                        <td><span className={statusClass(e.account_status)}>{e.account_status || 'NO_ACCOUNT'}</span></td>
                        <td>
                          <div className="desktop-table-actions">
                            <button className="btn-secondary small-button" onClick={() => edit(e)}>แก้ไข</button>
                            {active ? (
                              <button className="btn-secondary small-button danger-soft" onClick={() => updateEmployeeStatus(e, 'RESIGNED')} disabled={saving}>ตั้งเป็นลาออก</button>
                            ) : (
                              <button className="btn-secondary small-button" onClick={() => updateEmployeeStatus(e, 'ACTIVE')} disabled={saving}>เปิดใช้งานอีกครั้ง</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="responsive-desktop-table">
            <div className="card empty-state-card">
              <h2>ไม่พบข้อมูล</h2>
              <p className="muted">ไม่พบพนักงานตามตัวกรองปัจจุบัน ลองเปลี่ยนแท็บสถานะหรือคำค้นหา</p>
            </div>
          </div>
        )}

        <div className="responsive-mobile-cards mobile-card-list employee-card-list">
          {filtered.map((e) => {
            const rowPreset = presetForRow(e);
            const active = isCurrentActive(e);

            return (
              <div className="card employee-card" key={e.employee_code}>
                <div className="employee-card-top">
                  <div className="employee-avatar">{(e.employee_name || e.employee_code || '?').slice(0, 1)}</div>

                  <div className="employee-main-info">
                    <div className="employee-code">{e.employee_code}</div>
                    <h3>{e.employee_name || '-'}</h3>
                    <p>{e.position || 'ไม่ระบุตำแหน่ง'}</p>
                  </div>

                  <span className={employmentStatusClass(e.employment_status)}>{employmentStatusLabel(e.employment_status)}</span>
                </div>

                <div className="employee-info-grid">
                  <div><span>HUB</span><strong>{e.hub_name || e.hub_id || '-'}</strong></div>
                  <div><span>กะ</span><strong>{e.shift_name || e.shift_code || e.shift_group || '-'}</strong></div>
                  <div><span>สิทธิ์</span><strong>{rowPreset?.shortLabel || e.account_role || '-'}</strong></div>
                  <div><span>Scope</span><strong>{e.scope_type || '-'}{e.scope_value ? ` / ${e.scope_value}` : ''}</strong></div>
                  <div><span>สถานะบัญชี</span><strong>{e.account_status || 'NO_ACCOUNT'}</strong></div>
                </div>

                <div className="employee-card-actions">
                  <button className="btn-secondary" onClick={() => edit(e)}>แก้ไขข้อมูล / สิทธิ์</button>
                  {active ? (
                    <button className="btn-secondary danger-soft" onClick={() => updateEmployeeStatus(e, 'RESIGNED')} disabled={saving}>ปิดใช้งาน / ตั้งเป็นลาออก</button>
                  ) : (
                    <button className="btn-secondary" onClick={() => updateEmployeeStatus(e, 'ACTIVE')} disabled={saving}>เปิดใช้งานอีกครั้ง</button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="card empty-state-card">
              <h2>ไม่พบข้อมูล</h2>
              <p className="muted">ไม่พบพนักงานตามตัวกรองปัจจุบัน ลองเปลี่ยนแท็บสถานะหรือคำค้นหา</p>
            </div>
          )}
        </div>
        </>
      )}
    </AppShell>
  );
}
