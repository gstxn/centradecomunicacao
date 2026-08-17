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
  revokeSession,
  listCompaniesForUser,
  listDepartments,
  listTenantUsers,
  resolveSession,
  resolveTenant
} from './store.js';
import { sanitizeNoticeHtml } from './sanitize.js';

const PORT = Number(process.env.API_PORT ?? 3333);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
const MAX_BODY_BYTES = 64 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

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

const sendJson = (response: ServerResponse, statusCode: number, body: unknown, headers:Record<string,string>={}) => {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': WEB_ORIGIN,
    'access-control-allow-headers': 'authorization, content-type, x-company-id',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-credentials':'true',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    ...headers
  });
  response.end(JSON.stringify(body));
};

const readJson = async (request: IncomingMessage) => {
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
  return request.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('session='))?.slice(8) ?? '';
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
  try {
    if (request.method === 'OPTIONS') return sendJson(response, 204, null);
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    let pathname = url.pathname;
    if (pathname.startsWith('/api')) {
      pathname = pathname.slice(4) || '/';
    }

    if (request.method === 'GET' && pathname === '/health') {
      return sendJson(response, 200, { status: 'ok', service: 'central-comunicacao-api' });
    }

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
      return sendJson(response, 200, { user:result.user, activeCompanyId:result.activeCompanyId }, { 'set-cookie':`session=${result.accessToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}` });
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

      if (!name || name.length < 2 || name.length > 100) {
        throw new HttpError(400, 'INVALID_USER_NAME', 'O nome do usuário deve ter entre 2 e 100 caracteres.');
      }
      if (!email || !email.includes('@') || email.length > 120) {
        throw new HttpError(400, 'INVALID_USER_EMAIL', 'E-mail inválido.');
      }
      if (!password || password.length < 12 || password.length > 128) {
        throw new HttpError(400, 'INVALID_USER_PASSWORD', 'A senha provisória deve ter entre 12 e 128 caracteres.');
      }

      const allowedRoles = ['owner', 'admin', 'publisher', 'manager', 'employee', 'auditor', 'support'];
      if (!allowedRoles.includes(role)) {
        throw new HttpError(400, 'INVALID_ROLE', 'Papel de usuário inválido.');
      }

      const createdUser = await createTenantUser(tenant, {
        name,
        email,
        password,
        role,
        departmentIds: Array.isArray(body.departmentIds) ? body.departmentIds.map(String) : undefined
      });

      return sendJson(response, 201, { data: createdUser });
    }

    if (request.method === 'POST' && pathname === '/auth/logout') {
      const token=bearerToken(request); if(token) await revokeSession(token);
      return sendJson(response,204,null,{'set-cookie':'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
    }

    if (request.method === 'GET' && pathname === '/notices') {
      const tenant = await requireTenant(request, response); if (!tenant) return;
      return sendJson(response, 200, { data: await listNotices(tenant) });
    }
    if (request.method === 'POST' && pathname === '/notices') {
      const tenant = await requireTenant(request, response); if (!tenant) return;
      if (!await hasPermission(tenant, 'notices.create')) return sendJson(response, 403, { error:'PERMISSION_DENIED', message:'Permissão notices.create necessária.', statusCode:403 });
      const body=await readJson(request); const title=String(body.title??'').trim(); const rawContent=String(body.content??'').trim(); const content=sanitizeNoticeHtml(rawContent);
      if(title.length<3 || title.length>180 || !content || content.length>100000) throw new HttpError(400,'INVALID_NOTICE','Título ou conteúdo inválido.');
      const type=String(body.type??'informative'); if(!['urgent','informative','update'].includes(type)) throw new HttpError(400,'INVALID_NOTICE_TYPE','Tipo inválido.');
      return sendJson(response,201,await createNotice(tenant,{title,content,type,category:String(body.category??'Geral').slice(0,80)}));
    }
    const readMatch=pathname.match(/^\/notices\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/read$/i);
    if(request.method==='POST' && readMatch?.[1]) { const tenant=await requireTenant(request,response); if(!tenant)return; const result=await markNoticeRead(tenant,readMatch[1]); return result?sendJson(response,200,result):sendJson(response,404,{error:'NOT_FOUND',message:'Comunicado não encontrado.',statusCode:404}); }

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

const isMain = Boolean(process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server.ts')
) && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.NODE_ENV !== 'test');

if (isMain) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`API multiempresa disponível em http://127.0.0.1:${PORT}`);
  });
}
