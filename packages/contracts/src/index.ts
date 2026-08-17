export type CompanyId = string;
export type UserId = string;
export type MembershipId = string;

export type SystemRole = 'owner' | 'admin' | 'publisher' | 'manager' | 'employee' | 'auditor' | 'support';
export type PermissionKey = 'company.manage' | 'users.view' | 'users.manage' | 'departments.manage' | 'notices.create' | 'notices.publish' | 'reports.view' | 'audit.view' | 'support.manage';

export interface CompanySummary {
  id: CompanyId;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
}

export interface DepartmentSummary {
  id: string;
  companyId: CompanyId;
  name: string;
  code: string;
}

export interface MembershipSummary {
  id: MembershipId;
  companyId: CompanyId;
  userId: UserId;
  role: SystemRole;
  departmentIds: string[];
  permissions: PermissionKey[];
  status: 'active' | 'invited' | 'suspended';
}

export interface AuthenticatedUser {
  id: UserId;
  name: string;
  email: string;
  isSaaSAdmin: boolean;
  companies: Array<CompanySummary & { membership: MembershipSummary }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
  activeCompanyId: CompanyId;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
