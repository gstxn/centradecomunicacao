import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  authenticate,
  listCompaniesForUser,
  listDepartments,
  listTenantUsers,
  resolveSession,
  resolveTenant
} from './store.js';

const PORT = Number(process.env.API_PORT ?? 3333);

const sendJson = (response: ServerResponse, statusCode: number, body: unknown) => {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': 'http://localhost:5173',
    'access-control-allow-headers': 'authorization, content-type, x-company-id',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  });
  response.end(JSON.stringify(body));
};

const readJson = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
};

const bearerToken = (request: IncomingMessage) => {
  const authorization = request.headers.authorization;
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
};

const requireSession = (request: IncomingMessage, response: ServerResponse) => {
  const token = bearerToken(request);
  const session = token ? resolveSession(token) : null;
  if (!session) {
    sendJson(response, 401, { error: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada.', statusCode: 401 });
    return null;
  }
  return { token, session };
};

const requireTenant = async (request: IncomingMessage, response: ServerResponse) => {
  const auth = requireSession(request, response);
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

export const app = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return sendJson(response, 204, null);
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { status: 'ok', service: 'central-comunicacao-api' });
    }

    if (request.method === 'POST' && url.pathname === '/auth/login') {
      const body = await readJson(request);
      const result = await authenticate(String(body.email ?? ''), String(body.password ?? ''));
      return result
        ? sendJson(response, 200, result)
        : sendJson(response, 401, { error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.', statusCode: 401 });
    }

    if (request.method === 'GET' && url.pathname === '/companies') {
      const auth = requireSession(request, response);
      if (!auth) return;
      return sendJson(response, 200, { data: await listCompaniesForUser(auth.session.userId) });
    }

    if (request.method === 'GET' && url.pathname === '/departments') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      return sendJson(response, 200, { data: await listDepartments(tenant.membership.companyId) });
    }

    if (request.method === 'GET' && url.pathname === '/users') {
      const tenant = await requireTenant(request, response);
      if (!tenant) return;
      if (!['owner', 'admin', 'auditor'].includes(tenant.membership.role)) {
        return sendJson(response, 403, { error: 'PERMISSION_DENIED', message: 'Permissão users.view necessária.', statusCode: 403 });
      }
      return sendJson(response, 200, { data: await listTenantUsers(tenant.membership.companyId) });
    }

    return sendJson(response, 404, { error: 'NOT_FOUND', message: 'Rota não encontrada.', statusCode: 404 });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, { error: 'INTERNAL_ERROR', message: 'Erro interno da API.', statusCode: 500 });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`API multiempresa disponível em http://127.0.0.1:${PORT}`);
  });
}
