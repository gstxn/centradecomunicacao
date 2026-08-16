export type SystemRole = 'owner' | 'admin' | 'publisher' | 'manager' | 'employee' | 'auditor' | 'support';
export type PermissionKey = 'company.manage' | 'users.view' | 'users.manage' | 'departments.manage' | 'notices.create' | 'notices.publish' | 'reports.view' | 'audit.view' | 'support.manage';

export interface ApiCompany {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  membership: {
    id: string;
    companyId: string;
    userId: string;
    role: SystemRole;
    departmentIds: string[];
    permissions: PermissionKey[];
    status: 'active' | 'invited' | 'suspended';
  };
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  companies: ApiCompany[];
}

export interface ApiSession {
  accessToken?: string;
  user: ApiUser;
  activeCompanyId: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code: string;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  departments: string[];
}

export interface ApiNotice { id:string; title:string; category:string; type:'urgent'|'informative'|'update'; content:string; createdAt:string; author:string; department:string; read:boolean; readAt:string|null }

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let body: unknown;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`O servidor retornou uma resposta inválida (${response.status}).`);
  }

  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message
      : `Não foi possível concluir a operação (${response.status}).`;
    throw new Error(message);
  }

  return body as T;
};

export const loginRequest = async (email: string, password: string) => parseResponse<ApiSession>(await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }), credentials:'include'
}));

export const tenantRequest = async <T>(path: string, session: ApiSession, method='GET', body?:unknown): Promise<T> => parseResponse<T>(await fetch(`${API_URL}${path}`, {
  method,
  headers: {
    'content-type': 'application/json',
    'x-company-id': session.activeCompanyId,
    ...(session.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {})
  },
  body: body === undefined ? undefined : JSON.stringify(body),
  credentials: 'include'
}));
export const logoutRequest=()=>fetch(`${API_URL}/auth/logout`,{method:'POST',credentials:'include'});

export const getDepartments = (session: ApiSession) => tenantRequest<{ data: Department[] }>('/departments', session);
export const getTenantUsers = (session: ApiSession) => tenantRequest<{ data: TenantUser[] }>('/users', session);
export const getNotices = (session: ApiSession) => tenantRequest<{data:ApiNotice[]}>('/notices',session);
export const createNoticeRequest = (session:ApiSession,input:{title:string;category:string;type:string;content:string}) => tenantRequest<{id:string}>('/notices',session,'POST',input);
export const markNoticeReadRequest = (session:ApiSession,id:string) => tenantRequest<{readAt:string}>(`/notices/${id}/read`,session,'POST');
export const createCompanyRequest = async (session: ApiSession, input: { name: string; slug?: string; departments?: Array<{ name: string; code: string }> }) => {
  return parseResponse<{ data: ApiCompany }>(await fetch(`${API_URL}/companies`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(session.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {})
    },
    body: JSON.stringify(input),
    credentials: 'include'
  }));
};

export const createTenantUserRequest = (
  session: ApiSession,
  input: { name: string; email: string; password?: string; role: SystemRole; departmentIds?: string[] }
) => tenantRequest<{ data: TenantUser }>('/users', session, 'POST', input);
