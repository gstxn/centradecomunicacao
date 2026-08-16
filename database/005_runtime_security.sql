BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'central_runtime') THEN
    CREATE ROLE central_runtime LOGIN PASSWORD 'central_runtime_local_2026' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

INSERT INTO permissions (key, description) VALUES
  ('support.manage', 'Gerenciar chamados de suporte')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (company_id, role, permission_key)
SELECT company.id, role.name::system_role, permission.key
FROM companies AS company
CROSS JOIN (VALUES ('owner'), ('admin')) AS role(name)
CROSS JOIN permissions AS permission
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (company_id, role, permission_key)
SELECT company.id, 'auditor'::system_role, permission.key
FROM companies AS company
JOIN permissions AS permission ON permission.key IN ('users.view', 'reports.view', 'audit.view')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (company_id, role, permission_key)
SELECT company.id, 'publisher'::system_role, permission.key
FROM companies AS company
JOIN permissions AS permission ON permission.key IN ('notices.create', 'notices.publish')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (company_id, role, permission_key)
SELECT company.id, 'manager'::system_role, permission.key
FROM companies AS company
JOIN permissions AS permission ON permission.key IN ('users.view', 'reports.view')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (company_id, role, permission_key)
SELECT company.id, 'support'::system_role, 'support.manage'
FROM companies AS company
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION list_active_companies_for_user(requested_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  status company_status,
  membership_id uuid,
  role system_role,
  membership_status membership_status,
  permission_keys text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.name, c.slug, c.status, m.id, m.role, m.status,
    ARRAY(SELECT rp.permission_key FROM role_permissions AS rp
      WHERE rp.company_id = m.company_id AND rp.role = m.role)
  FROM companies AS c
  JOIN memberships AS m ON m.company_id = c.id
  WHERE m.user_id = requested_user_id
    AND m.status = 'active'
    AND c.status = 'active'
$$;

REVOKE ALL ON FUNCTION list_active_companies_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_active_companies_for_user(uuid) TO central_runtime;

ALTER TABLE departments FORCE ROW LEVEL SECURITY;
ALTER TABLE units FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE membership_departments FORCE ROW LEVEL SECURITY;
ALTER TABLE membership_units FORCE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE notices FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO central_runtime;
GRANT SELECT ON users, companies, departments, units, memberships, membership_departments,
  membership_units, permissions, role_permissions, notices, calendar_events TO central_runtime;

COMMIT;
