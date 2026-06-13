export type Role = 'super_admin' | 'admin' | 'area_manager' | 'hub_manager' | 'supervisor' | 'staff' | 'viewer';
export type AccountStatus = 'PIN_REQUIRED' | 'ACTIVE' | 'LOCKED' | 'DISABLED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FileType = 'incentive' | 'diligence' | 'ot' | 'attendance' | 'bonus' | 'fine' | 'other';

export interface SessionUser {
  employeeCode: string;
  role: Role;
  scopeType: 'ALL' | 'AREA' | 'HUB' | 'TEAM' | 'SELF';
  scopeValue?: string;
  employeeName?: string;
}

export interface Employee {
  employee_code: string;
  employee_name: string;
  hub_id?: string;
  hub_name?: string;
  area?: string;
  position?: string;
  position_category?: string;
  start_date?: string;
  employment_status?: string;
  updated_at?: string;
}

export interface UserAccount {
  employee_code: string;
  pin_hash?: string;
  role: Role;
  scope_type: SessionUser['scopeType'];
  scope_value?: string;
  status: AccountStatus;
  is_locked: boolean;
  failed_login_count: number;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FieldMapping {
  excel_header: string;
  system_field: string;
  thai_label: string;
  data_type: 'text' | 'number' | 'date' | 'money';
  category: 'identity' | 'income' | 'deduction' | 'summary' | 'attendance' | 'extra' | 'note';
  is_required?: boolean;
  is_visible_to_staff?: boolean;
  is_visible_to_manager?: boolean;
  display_order?: number;
}
