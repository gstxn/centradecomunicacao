BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE company_status AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE membership_status AS ENUM ('invited', 'active', 'suspended');
CREATE TYPE system_role AS ENUM ('owner', 'admin', 'publisher', 'manager', 'employee', 'auditor', 'support');

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status company_status NOT NULL DEFAULT 'active',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code),
  UNIQUE (company_id, id)
);

CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code),
  UNIQUE (company_id, id)
);

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role system_role NOT NULL DEFAULT 'employee',
  status membership_status NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id),
  UNIQUE (company_id, id)
);

CREATE TABLE membership_departments (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (membership_id, department_id),
  FOREIGN KEY (company_id, membership_id) REFERENCES memberships(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, department_id) REFERENCES departments(company_id, id) ON DELETE CASCADE
);

CREATE TABLE membership_units (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  PRIMARY KEY (membership_id, unit_id),
  FOREIGN KEY (company_id, membership_id) REFERENCES memberships(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, unit_id) REFERENCES units(company_id, id) ON DELETE CASCADE
);

CREATE TABLE permissions (
  key text PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE role_permissions (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role system_role NOT NULL,
  permission_key text NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (company_id, role, permission_key)
);

CREATE INDEX memberships_user_idx ON memberships(user_id, status);
CREATE INDEX memberships_company_idx ON memberships(company_id, status);
CREATE INDEX departments_company_idx ON departments(company_id, status);
CREATE INDEX units_company_idx ON units(company_id, status);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_departments ON departments
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_units ON units
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_memberships ON memberships
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_membership_departments ON membership_departments
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_membership_units ON membership_units
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_role_permissions ON role_permissions
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO permissions (key, description) VALUES
  ('company.manage', 'Gerenciar configurações da empresa'),
  ('users.view', 'Visualizar usuários da empresa'),
  ('users.manage', 'Convidar, editar e suspender usuários'),
  ('departments.manage', 'Gerenciar departamentos'),
  ('notices.create', 'Criar comunicados'),
  ('notices.publish', 'Publicar comunicados'),
  ('reports.view', 'Visualizar relatórios'),
  ('audit.view', 'Visualizar auditoria'),
  ('support.manage', 'Gerenciar chamados de suporte');

COMMIT;
