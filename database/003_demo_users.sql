BEGIN;

INSERT INTO users (id, name, email, password_hash, email_verified_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Administrador Geral', 'admin@saas.test', crypt('demo123', gen_salt('bf')), now());

INSERT INTO memberships (company_id, user_id, role, status, activated_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'owner', 'active', now()),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'owner', 'active', now());

COMMIT;
