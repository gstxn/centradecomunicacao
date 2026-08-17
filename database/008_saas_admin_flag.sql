BEGIN;

ALTER TABLE users
  ADD COLUMN is_saas_admin boolean NOT NULL DEFAULT false;

UPDATE users
SET is_saas_admin = true
WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

COMMENT ON COLUMN users.is_saas_admin IS
  'Privilégio global explícito; não deve ser inferido de nome, e-mail ou membership.';

GRANT INSERT, UPDATE ON users, companies, departments, memberships,
  membership_departments, role_permissions TO central_runtime;

COMMIT;
