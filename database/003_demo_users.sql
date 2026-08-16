BEGIN;

INSERT INTO users (id, name, email, password_hash, email_verified_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Administrador Geral', 'admin@saas.test', crypt('demo123', gen_salt('bf')), now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Admin Central', 'admin@central.test', crypt('demo123', gen_salt('bf')), now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Auditor Geral', 'auditor@saas.test', crypt('demo123', gen_salt('bf')), now())
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO memberships (company_id, user_id, role, status, activated_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'owner', 'active', now()),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'admin', 'active', now()),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'auditor', 'active', now())
ON CONFLICT (company_id, user_id) DO NOTHING;

COMMIT;

