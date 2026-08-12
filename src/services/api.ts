export interface ApiCompany {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  membership: {
    id: string;
    companyId: string;
    userId: string;
    role: 'owner' | 'admin' | 'publisher' | 'manager' | 'employee' | 'auditor' | 'support';
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
  role: string;
  departments: string[];
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let body: any = {};
  
  try {
    body = text ? JSON.parse(text) : {};
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Erro no servidor (${response.status}): ${text}`);
    }
    // If it's OK but not JSON, we might just return the text or empty object
    body = text as any;
  }

  if (!response.ok) {
    throw new Error(body.message ?? `Não foi possível concluir a operação (${response.status}).`);
  }
  
  return body as T & { message?: string };
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
