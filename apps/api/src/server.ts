import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  authenticate,
  DatabaseUnavailableError,
  hasPermission,
  createNotice,
  createCompany,
  createTenantUser,
  isSaaSAdmin,
  listNotices,
  markNoticeRead,
  updateNotice,
  archiveNotice,
  revokeSession,
  listCompaniesForUser,
  listDepartments,
  listTenantUsers,
  updateTenantUser,
  toggleTenantUserStatus,
  resetTenantUserPassword,
  resolveSession,
  resolveTenant,
  saveAttachment,
  getAttachment,
  listAuditLogs,
  listTickets,
  createTicket,
  updateTicket,
  listDocuments,
  createDocument,
  listFaqs,
  createFaq,
  listQuickLinks,
  createQuickLink,
  listCalendarEvents,
  createCalendarEvent,
  recordSearchQuery,
  listSearchAnalytics
} from './store.js';
import { sanitizeNoticeHtml } from './sanitize.js';
import { runMigrations } from './migrations.js';

const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3333);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
const MAX_BODY_BYTES = 64 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

// ==========================================
// SSE Real-time Broadcaster
// ==========================================
const sseClients = new Map<string, Set<ServerResponse>>();

export const broadcastToCompany = (companyId: string, eventName: string, data: unknown) => {
  const clients = sseClients.get(companyId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
};

interface LoginAttempt { failures: number; windowStartedAt: number; blockedUntil: number }
const loginAttempts = new Map<string, LoginAttempt>();

const loginAttemptKey = (request: IncomingMessage, email: string) =>
  `${request.socket.remoteAddress ?? 'unknown'}:${email.toLowerCase().trim()}`;

const loginRetryAfter = (key: string, now = Date.now()) => {
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.blockedUntil <= now) return 0;
  return Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1000));
};

const registerLoginFailure = (key: string, now = Date.now()) => {
  const current = loginAttempts.get(key);
  const attempt = !current || now - current.windowStartedAt >= LOGIN_WINDOW_MS
    ? { failures: 0, windowStartedAt: now, blockedUntil: 0 }
    : current;
  attempt.failures += 1;
  if (attempt.failures >= LOGIN_MAX_FAILURES) attempt.blockedUntil = now + LOGIN_WINDOW_MS;
  loginAttempts.set(key, attempt);
};

class HttpError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) {
    super(message);
  }
}

const sendJson = (response: ServerResponse, statusCode: number, body: unknown, headers: Record<string, string> = {}) => {
  if (response.headersSent) return;
  const origin = (response as any).__origin || WEB_ORIGIN;
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, content-type, x-company-id',
    'access-control-allow-methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
    'access-control-allow-credentials': 'true',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...headers
  });
  response.end(body !== null && body !== undefined ? JSON.stringify(body) : undefined);
};

const readJson = async (request: IncomingMessage) => {
  if ((request as any).body) {
    if (typeof (request as any).body === 'object') return (request as any).body as Record<string, unknown>;
    try { return JSON.parse(String((request as any).body)) as Record<string, unknown>; } catch { return {}; }
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'O corpo da requisição excede o limite permitido.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'O corpo da requisição deve conter JSON válido.');
  }
};

const bearerToken = (request: IncomingMessage) => {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return request.headers.cookie?.split(';').map((v) => v.trim()).find((v) => v.startsWith('session='))?.slice(8) ?? '';
};

const requireSession = async (request: IncomingMessage, response: ServerResponse) => {
  const token = bearerToken(request);
  const session = token ? await resolveSession(token) : null;
  if (!session) {
    sendJson(response, 401, { error: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada.', statusCode: 401 });
    return null;
  }
  return { token, session };
};

const requireTenant = async (request: IncomingMessage, response: ServerResponse) => {
  const auth = await requireSession(request, response);
  if (!auth) return null;
  const companyIdHeader = request.headers['x-company-id'];
  const companyId = Array.isArray(companyIdHeader) ? companyIdHeader[0] : companyIdHeader;
  if (!companyId) {
    sendJson(response, 400, { error: 'COMPANY_REQUIRED', message: 'Informe a empresa ativa no cabeçalho X-Company-ID.', statusCode: 400 });
    return null;
  }
  const tenant = await resolveTenant(auth.token, companyId);
  if (!tenant) {
    sendJson(response, 403, { error: 'TENANT_ACCESS_DENIED', message: 'O usuário não pertence à empresa solicitada.', statusCode: 403 });
    return null;
  }
  return tenant;
};

export const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
  const origin = request.headers.origin || WEB_ORIGIN;
  (response as any).__origin = origin;
  try {
    if (request.method === 'OPTIONS') {
      return sendJson(response, 204, null, {
        'access-control-allow-origin': origin,
        'access-control-allow-headers': 'authorization, content-type, x-company-id',
        'access-control-allow-methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
        'access-control-allow-credentials': 'true'
      });
    }
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    let pathname = url.pathname;
    if (pathname.startsWith('/api')) {
      pathname = pathname.slice(4) || '/';
    }

    if (request.method === 'GET' && pathname === '/health') {
      return sendJson(response, 200, { status: 'ok', service: 'central-comunicacao-api' });
    }

    // ==========================================
    // Realtime Server-Sent Events (SSE)
    // ==========================================
    if (request.method === 'GET' && pathname === '/realtime/stream') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;

      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true'
      });

      if (!sseClients.has(tenant.companyId)) {
        sseClients.set(tenant.companyId, new Set());
      }
      sseClients.get(tenant.companyId)!.add(response);

      response.write(`event: connected\ndata: ${JSON.stringify({ message: 'Conectado em tempo real' })}\n\n`);

      const keepAliveInterval = setInterval(() => {
        try {
          response.write(': keepalive\n\n');
        } catch {
          clearInterval(keepAliveInterval);
        }
      }, 25000);

      request.on('close', () => {
        clearInterval(keepAliveInterval);
        sseClients.get(tenant.companyId)?.delete(response);
      });
      return;
    }

    // ==========================================
    // Auth & Companies
    // ==========================================
    if (request.method === 'POST' && pathname === '/auth/login') {
      const body = await readJson(request);
      const email = String(body.email ?? '').trim().toLowerCase();
      const key = loginAttemptKey(request, email);
      const retryAfter = loginRetryAfter(key);
      if (retryAfter > 0) {
        return sendJson(response, 429, {
          error: 'TOO_MANY_LOGIN_ATTEMPTS',
          message: 'Muitas tentativas de acesso. Tente novamente mais tarde.',
          statusCode: 429
        }, { 'retry-after': String(retryAfter) });
      }

      const result = await authenticate(email, String(body.password ?? ''));
      if (!result) {
        registerLoginFailure(key);
        return sendJson(response, 401, { error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.', statusCode: 401 });
      }

      loginAttempts.delete(key);
      return sendJson(response, 200, { user: result.user, activeCompanyId: result.activeCompanyId }, { 'set-cookie': `session=${result.accessToken}; HttpOnly; SameSite=None; Path=/; Max-Age=28800; Secure` });
    }

    if (request.method === 'POST' && pathname === '/auth/logout') {
      const token = bearerToken(request);
      if (token) await revokeSession(token);
      return sendJson(response, 204, null, { 'set-cookie': 'session=; HttpOnly; SameSite=None; Path=/; Max-Age=0; Secure' });
    }

    if (request.method === 'GET' && pathname === '/companies') {
      const auth = await requireSession(request, response);
      if (!auth) return;
      return sendJson(response, 200, { data: await listCompaniesForUser(auth.session.userId) });
    }

    if (request.method === 'POST' && pathname === '/companies') {
      const auth = await requireSession(request, response);
      if (!auth) return;

      if (!await isSaaSAdmin(auth.session.userId)) {
        return sendJson(response, 403, {
          error: 'PERMISSION_DENIED',
          message: 'Apenas o Administrador do SaaS possui permissão para criar novas empresas.',
          statusCode: 403
        });
      }

      const body = await readJson(request);
      const name = String(body.name ?? '').trim();
      const slug = body.slug ? String(body.slug).trim() : undefined;
      if (!name || name.length < 2 || name.length > 120) {
        throw new HttpError(400, 'INVALID_COMPANY_NAME', 'O nome da empresa deve ter entre 2 e 120 caracteres.');
      }

      const newCompany = await createCompany(auth.session.userId, {
        name,
        slug,
        departments: Array.isArray(body.departments) ? body.departments : undefined
      });

      return sendJson(response, 201, { data: newCompany });
    }

    if (request.method === 'GET' && pathname === '/departments') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listDepartments(tenant) });
    }

    // ==========================================
    // Users Management
    // ==========================================
    if (request.method === 'GET' && pathname === '/users') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'users.view')) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão users.view necessária.', statusCode: 403 });
      }
      return sendJson(response, 200, { data: await listTenantUsers(tenant) });
    }

    if (request.method === 'POST' && pathname === '/users') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'users.manage') && !await isSaaSAdmin(tenant.userId)) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão users.manage necessária.', statusCode: 403 });
      }

      const body = await readJson(request);
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = body.password ? String(body.password) : undefined;
      const role = String(body.role ?? 'employee') as any;

      if (!name || name.length < 2 || name.length > 100) throw new HttpError(400, 'INVALID_USER_NAME', 'O nome do usuário deve ter entre 2 e 100 caracteres.');
      if (!email || !email.includes('@') || email.length > 120) throw new HttpError(400, 'INVALID_USER_EMAIL', 'E-mail inválido.');
      if (!password || password.length < 12 || password.length > 128) throw new HttpError(400, 'INVALID_USER_PASSWORD', 'A senha provisória deve ter entre 12 e 128 caracteres.');

      const allowedRoles = ['owner', 'admin', 'publisher', 'manager', 'employee', 'auditor', 'support'];
      if (!allowedRoles.includes(role)) throw new HttpError(400, 'INVALID_ROLE', 'Papel de usuário inválido.');

      const createdUser = await createTenantUser(tenant, {
        name,
        email,
        password,
        role,
        departmentIds: Array.isArray(body.departmentIds) ? body.departmentIds.map(String) : undefined
      });

      return sendJson(response, 201, { data: createdUser });
    }

    const userPatchMatch = pathname.match(/^\/users\/([0-9a-f-]+)$/i);
    if (request.method === 'PATCH' && userPatchMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'users.manage') && !await isSaaSAdmin(tenant.userId)) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão users.manage necessária.', statusCode: 403 });
      }
      const body = await readJson(request);
      const updated = await updateTenantUser(tenant, userPatchMatch[1], {
        role: body.role as any,
        departmentIds: Array.isArray(body.departmentIds) ? body.departmentIds.map(String) : undefined
      });
      return sendJson(response, 200, { data: updated });
    }

    const userToggleMatch = pathname.match(/^\/users\/([0-9a-f-]+)\/toggle-status$/i);
    if (request.method === 'POST' && userToggleMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'users.manage') && !await isSaaSAdmin(tenant.userId)) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão users.manage necessária.', statusCode: 403 });
      }
      const result = await toggleTenantUserStatus(tenant, userToggleMatch[1]);
      return result ? sendJson(response, 200, { data: result }) : sendJson(response, 404, { error: 'NOT_FOUND', message: 'Usuário não encontrado.' });
    }

    const userResetMatch = pathname.match(/^\/users\/([0-9a-f-]+)\/reset-password$/i);
    if (request.method === 'POST' && userResetMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'users.manage') && !await isSaaSAdmin(tenant.userId)) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão users.manage necessária.', statusCode: 403 });
      }
      const body = await readJson(request);
      const password = String(body.password ?? '');
      if (password.length < 12) throw new HttpError(400, 'INVALID_PASSWORD', 'A nova senha deve ter no mínimo 12 caracteres.');
      const result = await resetTenantUserPassword(tenant, userResetMatch[1], password);
      return sendJson(response, 200, result);
    }

    // ==========================================
    // Notices Management
    // ==========================================
    if (request.method === 'GET' && pathname === '/notices') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listNotices(tenant) });
    }

    if (request.method === 'POST' && pathname === '/notices') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'notices.create')) return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão notices.create necessária.', statusCode: 403 });

      const body = await readJson(request);
      const title = String(body.title ?? '').trim();
      const rawContent = String(body.content ?? '').trim();
      const content = sanitizeNoticeHtml(rawContent);
      if (title.length < 3 || title.length > 180 || !content || content.length > 100000) throw new HttpError(400, 'INVALID_NOTICE', 'Título ou conteúdo inválido.');
      const type = String(body.type ?? 'informative');
      if (!['urgent', 'informative', 'update'].includes(type)) throw new HttpError(400, 'INVALID_NOTICE_TYPE', 'Tipo inválido.');
      const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds.map(String) : undefined;
      const validFrom = body.validFrom ? String(body.validFrom) : undefined;
      const validUntil = body.validUntil ? String(body.validUntil) : undefined;
      const targetAudience = body.targetAudience ? String(body.targetAudience).slice(0, 100) : 'Toda a empresa';

      const created = await createNotice(tenant, {
        title,
        content,
        type,
        category: String(body.category ?? 'Geral').slice(0, 80),
        attachmentIds,
        validFrom,
        validUntil,
        targetAudience
      });

      broadcastToCompany(tenant.companyId, 'new_notice', { id: created.id, title, type, category: body.category, targetAudience });
      return sendJson(response, 201, created);
    }

    const noticeEditMatch = pathname.match(/^\/notices\/([0-9a-f-]+)$/i);
    if (request.method === 'PUT' && noticeEditMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'notices.publish') && !await hasPermission(tenant, 'notices.create')) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão para editar comunicados necessária.', statusCode: 403 });
      }
      const body = await readJson(request);
      const updated = await updateNotice(tenant, noticeEditMatch[1], {
        title: body.title ? String(body.title).trim() : undefined,
        content: body.content ? sanitizeNoticeHtml(String(body.content)) : undefined,
        category: body.category ? String(body.category).trim() : undefined,
        type: body.type ? String(body.type).trim() : undefined
      });
      return updated ? sendJson(response, 200, { data: updated }) : sendJson(response, 404, { error: 'NOT_FOUND', message: 'Comunicado não encontrado.' });
    }

    const noticeArchiveMatch = pathname.match(/^\/notices\/([0-9a-f-]+)\/archive$/i);
    if (request.method === 'POST' && noticeArchiveMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'notices.publish')) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão notices.publish necessária.', statusCode: 403 });
      }
      const result = await archiveNotice(tenant, noticeArchiveMatch[1]);
      return result ? sendJson(response, 200, { success: true }) : sendJson(response, 404, { error: 'NOT_FOUND', message: 'Comunicado não encontrado.' });
    }

    const noticeReadMatch = pathname.match(/^\/notices\/([0-9a-f-]+)\/read$/i);
    if (request.method === 'POST' && noticeReadMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const result = await markNoticeRead(tenant, noticeReadMatch[1]);
      return sendJson(response, 200, { success: true, readAt: result?.readAt ?? new Date().toISOString() });
    }

    // ==========================================
    // Support Tickets (Atendimento Interno)
    // ==========================================
    if (request.method === 'GET' && pathname === '/tickets') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listTickets(tenant) });
    }

    if (request.method === 'POST' && pathname === '/tickets') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const body = await readJson(request);
      const subject = String(body.subject ?? '').trim();
      const description = String(body.description ?? '').trim();

      if (!subject || !description) throw new HttpError(400, 'INVALID_TICKET', 'Assunto e descrição são obrigatórios.');

      const newTicket = await createTicket(tenant, {
        subject,
        description,
        category: body.category ? String(body.category) : undefined,
        priority: body.priority ? String(body.priority) : undefined
      });

      broadcastToCompany(tenant.companyId, 'new_ticket', { id: newTicket.id, ticketCode: newTicket.ticketCode, subject });
      return sendJson(response, 201, { data: newTicket });
    }

    const ticketPatchMatch = pathname.match(/^\/tickets\/([0-9a-f-]+)$/i);
    if ((request.method === 'PATCH' || request.method === 'PUT') && ticketPatchMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const body = await readJson(request);
      const updated = await updateTicket(tenant, ticketPatchMatch[1], {
        status: body.status ? String(body.status) : undefined,
        assigneeName: body.assigneeName ? String(body.assigneeName) : undefined
      });
      return updated ? sendJson(response, 200, { data: updated }) : sendJson(response, 404, { error: 'NOT_FOUND', message: 'Chamado não encontrado.' });
    }

    // ==========================================
    // Corporate Documents
    // ==========================================
    if (request.method === 'GET' && pathname === '/documents') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listDocuments(tenant) });
    }

    if (request.method === 'POST' && pathname === '/documents') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'company.manage') && !await hasPermission(tenant, 'notices.publish')) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão para publicar documentos corporativos necessária.', statusCode: 403 });
      }

      const body = await readJson(request);
      const name = String(body.name ?? '').trim();
      const code = String(body.code ?? '').trim();
      const department = String(body.department ?? 'Geral').trim();
      const version = String(body.version ?? 'v1.0').trim();

      if (!name || !code) throw new HttpError(400, 'INVALID_DOCUMENT', 'Nome e código do documento são obrigatórios.');

      const newDoc = await createDocument(tenant, {
        name,
        code,
        department,
        version,
        status: body.status as any,
        validUntil: body.validUntil ? String(body.validUntil) : undefined,
        description: body.description ? String(body.description) : undefined,
        attachmentId: body.attachmentId ? String(body.attachmentId) : undefined
      });

      return sendJson(response, 201, { data: newDoc });
    }

    // ==========================================
    // FAQs / Base de Conhecimento
    // ==========================================
    if (request.method === 'GET' && pathname === '/faqs') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listFaqs(tenant) });
    }

    if (request.method === 'POST' && pathname === '/faqs') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'company.manage') && !await hasPermission(tenant, 'notices.publish')) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão para criar tópicos de conhecimento necessária.', statusCode: 403 });
      }

      const body = await readJson(request);
      const question = String(body.question ?? '').trim();
      const answer = String(body.answer ?? '').trim();
      const department = String(body.department ?? 'Geral').trim();
      const category = String(body.category ?? 'Geral').trim();
      const tags = body.tags ? String(body.tags) : undefined;
      const relatedDocCode = body.relatedDocCode ? String(body.relatedDocCode) : undefined;

      if (!question || !answer) throw new HttpError(400, 'INVALID_FAQ', 'Pergunta e resposta são obrigatórias.');

      const newFaq = await createFaq(tenant, { question, answer, department, category, tags, relatedDocCode });
      return sendJson(response, 201, { data: newFaq });
    }

    // ==========================================
    // Search Logging & Analytics
    // ==========================================
    if (request.method === 'POST' && pathname === '/search/log') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const body = await readJson(request);
      const queryText = String(body.query ?? '').trim();
      const resultsCount = typeof body.resultsCount === 'number' ? body.resultsCount : 0;
      if (queryText) {
        await recordSearchQuery(tenant, queryText, resultsCount);
      }
      return sendJson(response, 200, { success: true });
    }

    if (request.method === 'GET' && pathname === '/search/analytics') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const analytics = await listSearchAnalytics(tenant);
      return sendJson(response, 200, { data: analytics });
    }

    // ==========================================
    // Quick Links & Calendar
    // ==========================================
    if (request.method === 'GET' && pathname === '/quick-links') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listQuickLinks(tenant) });
    }

    if (request.method === 'POST' && pathname === '/quick-links') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const body = await readJson(request);
      const title = String(body.title ?? '').trim();
      const linkUrl = String(body.url ?? '').trim();

      if (!title || !linkUrl) throw new HttpError(400, 'INVALID_LINK', 'Título e URL do atalho são obrigatórios.');

      const newLink = await createQuickLink(tenant, {
        title,
        url: linkUrl,
        icon: body.icon ? String(body.icon) : undefined,
        category: body.category ? String(body.category) : undefined,
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined
      });
      return sendJson(response, 201, { data: newLink });
    }

    if (request.method === 'GET' && pathname === '/calendar') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listCalendarEvents(tenant) });
    }

    if (request.method === 'POST' && pathname === '/calendar') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const body = await readJson(request);
      const title = String(body.title ?? '').trim();
      const eventDate = String(body.eventDate ?? '').trim();

      if (!title || !eventDate) throw new HttpError(400, 'INVALID_EVENT', 'Título e data do evento são obrigatórios.');

      const newEvent = await createCalendarEvent(tenant, {
        title,
        eventDate,
        location: body.location ? String(body.location) : undefined,
        color: body.color ? String(body.color) : undefined
      });
      return sendJson(response, 201, { data: newEvent });
    }

    // ==========================================
    // Attachments & Audit Logs
    // ==========================================
    if (request.method === 'POST' && pathname === '/upload') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const body = await readJson(request);
      const filename = String(body.filename ?? '').trim();
      const mimeType = String(body.mimeType ?? 'application/octet-stream').trim().toLowerCase();
      const dataBase64 = String(body.dataBase64 ?? '');
      const sizeBytes = Number(body.sizeBytes ?? (dataBase64.length * 0.75));

      if (!filename || filename.length > 255) throw new HttpError(400, 'INVALID_FILENAME', 'Nome de arquivo inválido.');
      if (sizeBytes > 10 * 1024 * 1024) throw new HttpError(413, 'FILE_TOO_LARGE', 'O arquivo não pode exceder 10 MB.');
      if (!dataBase64) throw new HttpError(400, 'EMPTY_FILE', 'Conteúdo do arquivo não fornecido.');

      const allowedMimes = [
        'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword', 'application/vnd.ms-excel', 'text/plain', 'text/csv'
      ];
      if (!allowedMimes.includes(mimeType)) {
        throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Tipo de arquivo não permitido.');
      }

      const attachment = await saveAttachment(tenant, { filename, mimeType, sizeBytes, dataBase64 });
      return sendJson(response, 201, { data: attachment });
    }

    const attachmentMatch = pathname.match(/^\/attachments\/([0-9a-f-]+)$/i);
    if (request.method === 'GET' && attachmentMatch?.[1]) {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      const attachment = await getAttachment(tenant, attachmentMatch[1]);
      if (!attachment) return sendJson(response, 404, { error: 'NOT_FOUND', message: 'Anexo não encontrado.', statusCode: 404 });
      return sendJson(response, 200, { data: attachment });
    }

    if (request.method === 'GET' && pathname === '/audit-logs') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!await hasPermission(tenant, 'audit.view')) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão audit.view necessária.', statusCode: 403 });
      }
      return sendJson(response, 200, { data: await listAuditLogs(tenant) });
    }

    return sendJson(response, 404, { error: 'NOT_FOUND', message: 'Rota não encontrada.', statusCode: 404 });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return sendJson(response, 503, {
        error: 'DATABASE_UNAVAILABLE',
        message: 'Serviço temporariamente indisponível.',
        statusCode: 503
      }, { 'retry-after': '30' });
    }

    if (error instanceof HttpError) {
      return sendJson(response, error.statusCode, { error: error.code, message: error.message, statusCode: error.statusCode });
    }

    console.error(error);
    const detail = error instanceof Error ? error.message : 'Erro interno da API.';
    return sendJson(response, 500, { error: 'INTERNAL_ERROR', message: detail, statusCode: 500 });
  }
};

export const app = createServer(handleRequest);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`API multiempresa disponível em http://0.0.0.0:${PORT}`);
    try {
      await runMigrations();
    } catch {
      // Ignora falhas se o banco não estiver disponível no start
    }
  });
}

