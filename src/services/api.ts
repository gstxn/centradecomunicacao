export type SystemRole = 'owner' | 'admin' | 'publisher' | 'manager' | 'employee' | 'auditor' | 'support';

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
  accessToken: string;
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
  body: JSON.stringify({ email, password })
}));

export const tenantRequest = async <T>(path: string, session: ApiSession): Promise<T> => parseResponse<T>(await fetch(`${API_URL}${path}`, {
  headers: {
    authorization: `Bearer ${session.accessToken}`,
    'x-company-id': session.activeCompanyId
  }
}));

export const getDepartments = (session: ApiSession) => tenantRequest<{ data: Department[] }>('/departments', session);
export const getTenantUsers = (session: ApiSession) => tenantRequest<{ data: TenantUser[] }>('/users', session);
