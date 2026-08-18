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
  isSaaSAdmin: boolean;
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

export interface ApiNotice {
  id: string;
  title: string;
  category: string;
  type: 'urgent' | 'informative' | 'update';
  content: string;
  createdAt: string;
  validFrom?: string;
  validUntil?: string;
  targetAudience?: string;
  author: string;
  department: string;
  read: boolean;
  readAt: string | null;
  attachmentIds?: string[];
  attachments?: Array<{ id: string; filename: string; sizeBytes: number; mimeType: string }>;
}

export interface ApiAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64?: string;
  createdAt: string;
}

export interface ApiAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  userName: string;
  userEmail: string;
}

export interface ApiTicket {
  id: string;
  companyId: string;
  userId: string;
  ticketCode: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  authorName: string;
  assigneeName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocument {
  id: string;
  companyId: string;
  name: string;
  code: string;
  department: string;
  version: string;
  status: 'Vigente' | 'Em revisão' | 'Obsoleto';
  validUntil?: string;
  description: string;
  fileUrl?: string;
  attachmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFaq {
  id: string;
  companyId: string;
  question: string;
  answer: string;
  department: string;
  category: string;
  tags?: string;
  relatedDocCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiQuickLink {
  id: string;
  companyId: string;
  title: string;
  url: string;
  icon: string;
  category: string;
  sortOrder: number;
  createdAt: string;
}

export interface ApiCalendarEvent {
  id: string;
  companyId: string;
  title: string;
  eventDate: string;
  location: string;
  color: string;
  status: 'active' | 'cancelled';
  createdAt: string;
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
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

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
  body: JSON.stringify({ email, password }),
  credentials: 'include'
}));

export const tenantRequest = async <T>(path: string, session: ApiSession, method = 'GET', body?: unknown): Promise<T> => parseResponse<T>(await fetch(`${API_URL}${path}`, {
  method,
  headers: {
    'content-type': 'application/json',
    'x-company-id': session.activeCompanyId,
    ...(session.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {})
  },
  body: body === undefined ? undefined : JSON.stringify(body),
  credentials: 'include'
}));

export const logoutRequest = () => fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });

// Departamentos e Usuários
export const getDepartments = (session: ApiSession) => tenantRequest<{ data: Department[] }>('/departments', session);
export const getTenantUsers = (session: ApiSession) => tenantRequest<{ data: TenantUser[] }>('/users', session);
export const createTenantUserRequest = (
  session: ApiSession,
  input: { name: string; email: string; password: string; role: SystemRole; departmentIds?: string[] }
) => tenantRequest<{ data: TenantUser }>('/users', session, 'POST', input);

export const updateTenantUserRequest = (
  session: ApiSession,
  userId: string,
  input: { role?: SystemRole; departmentIds?: string[] }
) => tenantRequest<{ data: { id: string; role?: SystemRole } }>(`/users/${userId}`, session, 'PATCH', input);

export const toggleTenantUserStatusRequest = (session: ApiSession, userId: string) =>
  tenantRequest<{ data: { userId: string; status: 'active' | 'suspended' } }>(`/users/${userId}/toggle-status`, session, 'POST');

export const resetTenantUserPasswordRequest = (session: ApiSession, userId: string, password: string) =>
  tenantRequest<{ success: boolean }>(`/users/${userId}/reset-password`, session, 'POST', { password });

// Comunicados
export const getNotices = (session: ApiSession) => tenantRequest<{ data: ApiNotice[] }>('/notices', session);
export const createNoticeRequest = (
  session: ApiSession,
  input: {
    title: string;
    category: string;
    type: string;
    content: string;
    attachmentIds?: string[];
    validFrom?: string;
    validUntil?: string;
    targetAudience?: string;
  }
) => tenantRequest<{ id: string }>('/notices', session, 'POST', input);
export const updateNoticeRequest = (session: ApiSession, id: string, input: { title?: string; category?: string; type?: string; content?: string }) =>
  tenantRequest<{ data: ApiNotice }>(`/notices/${id}`, session, 'PUT', input);
export const archiveNoticeRequest = (session: ApiSession, id: string) =>
  tenantRequest<{ id: string }>(`/notices/${id}/archive`, session, 'POST');
export const markNoticeReadRequest = (session: ApiSession, id: string) =>
  tenantRequest<{ readAt: string }>(`/notices/${id}/read`, session, 'POST');

// Suporte / Chamados
export const getTickets = (session: ApiSession) => tenantRequest<{ data: ApiTicket[] }>('/tickets', session);
export const createTicketRequest = (session: ApiSession, input: { subject: string; category?: string; priority?: string; description: string }) =>
  tenantRequest<{ data: ApiTicket }>('/tickets', session, 'POST', input);
export const updateTicketRequest = (session: ApiSession, id: string, input: { status?: string; assigneeName?: string }) =>
  tenantRequest<{ data: ApiTicket }>(`/tickets/${id}`, session, 'PATCH', input);

// Biblioteca de Documentos
export const getDocuments = (session: ApiSession) => tenantRequest<{ data: ApiDocument[] }>('/documents', session);
export const createDocumentRequest = (
  session: ApiSession,
  input: {
    name: string;
    code: string;
    department: string;
    version: string;
    status?: 'Vigente' | 'Em revisão' | 'Obsoleto';
    validUntil?: string;
    description?: string;
    attachmentId?: string;
  }
) => tenantRequest<{ data: ApiDocument }>('/documents', session, 'POST', input);

// FAQ / Conhecimento
export const getFaqs = (session: ApiSession) => tenantRequest<{ data: ApiFaq[] }>('/faqs', session);
export const createFaqRequest = (
  session: ApiSession,
  input: {
    question: string;
    answer: string;
    department: string;
    category: string;
    tags?: string;
    relatedDocCode?: string;
  }
) => tenantRequest<{ data: ApiFaq }>('/faqs', session, 'POST', input);

// Search Tracking & Analytics
export const logSearchRequest = (session: ApiSession, query: string, resultsCount: number) =>
  tenantRequest<{ success: boolean }>('/search/log', session, 'POST', { query, resultsCount });

export const getSearchAnalyticsRequest = (session: ApiSession) =>
  tenantRequest<{ data: { topSearches: Array<{ queryText: string; totalCount: number; avgResults: number }>; zeroResultSearches: Array<{ queryText: string; missCount: number; lastAttempt: string }> } }>('/search/analytics', session);

// Links Rápidos & Calendário
export const getQuickLinks = (session: ApiSession) => tenantRequest<{ data: ApiQuickLink[] }>('/quick-links', session);
export const createQuickLinkRequest = (session: ApiSession, input: { title: string; url: string; icon?: string; category?: string; sortOrder?: number }) =>
  tenantRequest<{ data: ApiQuickLink }>('/quick-links', session, 'POST', input);

export const getCalendarEvents = (session: ApiSession) => tenantRequest<{ data: ApiCalendarEvent[] }>('/calendar', session);
export const createCalendarEventRequest = (session: ApiSession, input: { title: string; eventDate: string; location?: string; color?: string }) =>
  tenantRequest<{ data: ApiCalendarEvent }>('/calendar', session, 'POST', input);

// Upload e Auditoria
export const uploadAttachmentRequest = (session: ApiSession, input: { filename: string; mimeType: string; sizeBytes: number; dataBase64: string }) =>
  tenantRequest<{ data: ApiAttachment }>('/upload', session, 'POST', input);

export const getAttachmentRequest = (session: ApiSession, id: string) =>
  tenantRequest<{ data: ApiAttachment }>(`/attachments/${id}`, session);

export const getAuditLogsRequest = (session: ApiSession) =>
  tenantRequest<{ data: ApiAuditLog[] }>('/audit-logs', session);

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

