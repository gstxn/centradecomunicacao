import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticate, listDepartments, listTenantUsers, resolveTenant } from '../src/store.js';

const CENTRAL_ID = '11111111-1111-4111-8111-111111111111';
const GSS_ID = '22222222-2222-4222-8222-222222222222';

test('administrador geral tem acesso aos tenants e usuários', async () => {
  const login = await authenticate('admin@saas.test', 'demo123');
  assert.ok(login);
  assert.ok(await resolveTenant(login.accessToken, CENTRAL_ID));
  assert.ok(await resolveTenant(login.accessToken, GSS_ID));
  
  const centralDepartments = await listDepartments(CENTRAL_ID);
  const gssDepartments = await listDepartments(GSS_ID);
  assert.ok(centralDepartments.some((department) => department.code === 'TI'));
  assert.ok(gssDepartments.some((department) => department.code === 'TI'));
  
  const centralUsers = await listTenantUsers(CENTRAL_ID);
  assert.ok(centralUsers.some((user) => user.email === 'admin@saas.test'));
});
