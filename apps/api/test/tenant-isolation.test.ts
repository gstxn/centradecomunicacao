import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticate, createNotice, hasPermission, listDepartments, listNotices, listTenantUsers, markNoticeRead, resolveTenant } from '../src/store.js';

if (process.env.REQUIRE_DATABASE !== 'true') process.env.DEMO_MODE = 'true';

const CENTRAL_ID = '11111111-1111-4111-8111-111111111111';

test('administrador geral acessa o tenant Central de Exames', async () => {
  const login = await authenticate('admin@saas.test', 'demo123');
  assert.ok(login);
  const centralTenant = await resolveTenant(login.accessToken, CENTRAL_ID);
  assert.ok(centralTenant);

  const centralDepartments = await listDepartments(centralTenant);
  assert.ok(centralDepartments.some((department) => department.code === 'TI'));

  const centralUsers = await listTenantUsers(centralTenant);
  assert.ok(centralUsers.some((user) => user.email === 'admin@saas.test'));
});

test('tentativa de resolver tenant inexistente retorna null', async () => {
  const login = await authenticate('admin@central.test', 'demo123');
  assert.ok(login);
  assert.ok(await resolveTenant(login.accessToken, CENTRAL_ID));
  assert.equal(await resolveTenant(login.accessToken, '00000000-0000-0000-0000-000000000000'), null);
});

test('token arbitrário com 64 caracteres não cria uma sessão', async () => {
  assert.equal(await resolveTenant('a'.repeat(64), CENTRAL_ID), null);
});

test('autorização deriva da matriz de permissões', async () => {
  const login = await authenticate('auditor@saas.test', 'demo123');
  assert.ok(login);
  const tenant = await resolveTenant(login.accessToken, CENTRAL_ID);
  assert.ok(tenant);
  assert.equal(await hasPermission(tenant, 'users.view'), true);
  assert.equal(await hasPermission(tenant, 'users.manage'), false);
});

test('comunicado persiste no tenant e a leitura pertence ao usuário', async () => {
  const login = await authenticate('admin@central.test', 'demo123'); assert.ok(login);
  const tenant = await resolveTenant(login.accessToken, CENTRAL_ID); assert.ok(tenant);
  const created = await createNotice(tenant, { title: 'Teste de integração', category: 'TI', type: 'informative', content: '<p>Conteúdo</p>' });
  assert.ok(created.id);
  assert.equal((await listNotices(tenant)).find((item) => item.id === created.id)?.read, false);
  assert.ok(await markNoticeRead(tenant, created.id));
  assert.equal((await listNotices(tenant)).find((item) => item.id === created.id)?.read, true);
});

test('apenas o administrador do saas tem permissão de criar empresas', async () => {
  const { isSaaSAdmin, createCompany } = await import('../src/store.js');
  
  const saasAdminLogin = await authenticate('admin@saas.test', 'demo123');
  assert.ok(saasAdminLogin);
  assert.equal(await isSaaSAdmin('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), true);

  const centralAdminLogin = await authenticate('admin@central.test', 'demo123');
  assert.ok(centralAdminLogin);
  assert.equal(await isSaaSAdmin('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'), false);

  const auditorLogin = await authenticate('auditor@saas.test', 'demo123');
  assert.ok(auditorLogin);
  assert.equal(await isSaaSAdmin('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'), false);

  const suffix = Math.random().toString(36).slice(2, 7);
  const created = await createCompany('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', {
    name: `Hospital Santa Helena ${suffix}`,
    slug: `hospital-santa-helena-${suffix}`
  });
  assert.ok(created.id);
  assert.ok(created.name.startsWith('Hospital Santa Helena'));
  assert.equal(created.membership.role, 'owner');

  const tenant = await resolveTenant(saasAdminLogin.accessToken, created.id);
  assert.ok(tenant);
  const depts = await listDepartments(tenant);
  assert.ok(depts.some((d) => d.code === 'TI'));
});

test('criação de usuários na empresa por admin do saas e admin da empresa', async () => {
  const { createTenantUser, createCompany } = await import('../src/store.js');

  const centralAdminLogin = await authenticate('admin@central.test', 'demo123');
  assert.ok(centralAdminLogin);
  const tenant = await resolveTenant(centralAdminLogin.accessToken, CENTRAL_ID);
  assert.ok(tenant);

  // Admin da empresa tem permissão users.manage
  assert.equal(await hasPermission(tenant, 'users.manage'), true);

  // Cadastrar novo colaborador
  const userSuffix = Math.random().toString(36).slice(2, 7);
  const newUser = await createTenantUser(tenant, {
    name: `Dr. Lucas Ferreira ${userSuffix}`,
    email: `lucas.ferreira.${userSuffix}@central.test`,
    password: 'SenhaTemporaria#2026',
    role: 'publisher'
  });
  assert.ok(newUser.id);
  assert.ok(newUser.name.startsWith('Dr. Lucas Ferreira'));
  assert.equal(newUser.role, 'publisher');

  // Listar usuários do tenant e conferir se está presente
  const users = await listTenantUsers(tenant);
  assert.ok(users.some((u) => u.email === `lucas.ferreira.${userSuffix}@central.test`));

  // SaaS Admin criando usuário em nova empresa criada
  const saasAdminLogin = await authenticate('admin@saas.test', 'demo123');
  assert.ok(saasAdminLogin);
  const compSuffix = Math.random().toString(36).slice(2, 7);
  const newComp = await createCompany('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', {
    name: `Hospital Marieta ${compSuffix}`,
    slug: `hospital-marieta-${compSuffix}`
  });
  const marietaTenant = await resolveTenant(saasAdminLogin.accessToken, newComp.id);
  assert.ok(marietaTenant);

  const marietaUser = await createTenantUser(marietaTenant, {
    name: 'George Dandolini',
    email: `sobbianekge.${compSuffix}@marieta.com`,
    password: 'OutraSenhaForte#2026',
    role: 'admin'
  });
  assert.ok(marietaUser.id);
  assert.equal(marietaUser.email, `sobbianekge.${compSuffix}@marieta.com`);
  const marietaUsers = await listTenantUsers(marietaTenant);
  assert.ok(marietaUsers.some((u) => u.email === `sobbianekge.${compSuffix}@marieta.com`));
});

test('operações completas de tickets, documentos, faqs, links rápidos e eventos', async () => {
  const {
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
    updateNotice,
    archiveNotice
  } = await import('../src/store.js');

  const login = await authenticate('admin@central.test', 'demo123');
  assert.ok(login);
  const tenant = await resolveTenant(login.accessToken, CENTRAL_ID);
  assert.ok(tenant);

  // 1. Tickets
  const ticket = await createTicket(tenant, {
    subject: 'Problema no acesso à impressora de etiquetas',
    category: 'TI',
    priority: 'Alta',
    description: 'Etiquetas de código de barras não estão imprimindo.'
  });
  assert.ok(ticket.id);
  assert.equal(ticket.status, 'Aberto');

  const tickets = await listTickets(tenant);
  assert.ok(tickets.some((t) => t.id === ticket.id));

  const updatedTicket = await updateTicket(tenant, ticket.id, { status: 'Em andamento', assigneeName: 'Suporte TI' });
  assert.ok(updatedTicket);
  assert.equal(updatedTicket.status, 'Em andamento');

  // 2. Documentos
  const doc = await createDocument(tenant, {
    name: 'Manual de Controle de Qualidade',
    code: 'POP-QLD-999',
    department: 'Qualidade',
    version: 'v1.0',
    status: 'Vigente',
    description: 'Controle diário de calibração.'
  });
  assert.ok(doc.id);
  const docs = await listDocuments(tenant);
  assert.ok(docs.some((d) => d.id === doc.id));

  // 3. FAQs
  const faq = await createFaq(tenant, {
    question: 'Como resetar o 2FA?',
    answer: 'Abra um chamado ou contate a TI.',
    department: 'TI',
    category: 'Sistemas'
  });
  assert.ok(faq.id);
  const faqs = await listFaqs(tenant);
  assert.ok(faqs.some((f) => f.id === faq.id));

  // 4. Links rápidos
  const link = await createQuickLink(tenant, {
    title: 'Portal de Laudos',
    url: 'https://laudos.central.test',
    category: 'Sistemas Operacionais'
  });
  assert.ok(link.id);
  const links = await listQuickLinks(tenant);
  assert.ok(links.some((l) => l.id === link.id));

  // 5. Calendário
  const event = await createCalendarEvent(tenant, {
    title: 'Auditoria Externa ISO 9001',
    eventDate: new Date('2026-09-01T09:00:00Z').toISOString(),
    location: 'Unidade Central',
    color: '#10b981'
  });
  assert.ok(event.id);
  const events = await listCalendarEvents(tenant);
  assert.ok(events.some((e) => e.id === event.id));

  // 6. Edição e arquivamento de comunicados
  const notice = await createNotice(tenant, {
    title: 'Comunicado Temporário',
    category: 'Geral',
    type: 'informative',
    content: 'Texto original'
  });
  const updatedNotice = await updateNotice(tenant, notice.id, { title: 'Comunicado Editado' });
  assert.ok(updatedNotice);
  assert.equal(updatedNotice.title, 'Comunicado Editado');

  const archived = await archiveNotice(tenant, notice.id);
  assert.ok(archived);
});

