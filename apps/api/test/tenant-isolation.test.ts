import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticate, createNotice, hasPermission, listDepartments, listNotices, listTenantUsers, markNoticeRead, resolveTenant } from '../src/store.js';

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

  const created = await createCompany('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', {
    name: 'Hospital Santa Helena',
    slug: 'hospital-santa-helena'
  });
  assert.ok(created.id);
  assert.equal(created.name, 'Hospital Santa Helena');
  assert.equal(created.membership.role, 'owner');

  const tenant = await resolveTenant(saasAdminLogin.accessToken, created.id);
  assert.ok(tenant);
  const depts = await listDepartments(tenant);
  assert.ok(depts.some((d) => d.code === 'TI'));
});

test('criação de usuários na empresa por admin do saas e admin da empresa', async () => {
  const { createTenantUser } = await import('../src/store.js');

  const centralAdminLogin = await authenticate('admin@central.test', 'demo123');
  assert.ok(centralAdminLogin);
  const tenant = await resolveTenant(centralAdminLogin.accessToken, CENTRAL_ID);
  assert.ok(tenant);

  // Admin da empresa tem permissão users.manage
  assert.equal(await hasPermission(tenant, 'users.manage'), true);

  // Cadastrar novo colaborador
  const newUser = await createTenantUser(tenant, {
    name: 'Dr. Lucas Ferreira',
    email: 'lucas.ferreira@central.test',
    role: 'publisher'
  });
  assert.ok(newUser.id);
  assert.equal(newUser.name, 'Dr. Lucas Ferreira');
  assert.equal(newUser.role, 'publisher');

  // Listar usuários do tenant e conferir se está presente
  const users = await listTenantUsers(tenant);
  assert.ok(users.some((u) => u.email === 'lucas.ferreira@central.test'));

  // SaaS Admin criando usuário em nova empresa criada
  const { createCompany } = await import('../src/store.js');
  const saasAdminLogin = await authenticate('admin@saas.test', 'demo123');
  assert.ok(saasAdminLogin);
  const newComp = await createCompany('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', { name: 'Hospital Marieta', slug: 'hospital-marieta' });
  const marietaTenant = await resolveTenant(saasAdminLogin.accessToken, newComp.id);
  assert.ok(marietaTenant);

  const marietaUser = await createTenantUser(marietaTenant, {
    name: 'George Dandolini',
    email: 'sobbianekge@marieta.com',
    role: 'admin'
  });
  assert.ok(marietaUser.id);
  assert.equal(marietaUser.email, 'sobbianekge@marieta.com');
  const marietaUsers = await listTenantUsers(marietaTenant);
  assert.ok(marietaUsers.some((u) => u.email === 'sobbianekge@marieta.com'));
});
