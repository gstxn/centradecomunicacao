-- ==============================================================================
-- CENTRAL DE COMUNICAÇÃO INTERNA - SCHEMA COMPLETO PARA O SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

BEGIN;

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Tipos enumerados
DO $$ BEGIN
  CREATE TYPE company_status AS ENUM ('active', 'suspended', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('invited', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE system_role AS ENUM ('owner', 'admin', 'publisher', 'manager', 'employee', 'auditor', 'support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notice_type AS ENUM ('urgent', 'informative', 'update');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Tabelas Fundamentais
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status company_status NOT NULL DEFAULT 'active',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  is_saas_admin boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
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

CREATE TABLE IF NOT EXISTS units (
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

CREATE TABLE IF NOT EXISTS memberships (
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

CREATE TABLE IF NOT EXISTS membership_departments (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (membership_id, department_id),
  FOREIGN KEY (company_id, membership_id) REFERENCES memberships(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, department_id) REFERENCES departments(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS membership_units (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  PRIMARY KEY (membership_id, unit_id),
  FOREIGN KEY (company_id, membership_id) REFERENCES memberships(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, unit_id) REFERENCES units(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS permissions (
  key text PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role system_role NOT NULL,
  permission_key text NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (company_id, role, permission_key)
);

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Geral',
  content text NOT NULL DEFAULT '',
  type notice_type NOT NULL DEFAULT 'informative',
  requires_acknowledgement boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES users(id),
  image_url text,
  published_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notice_reads (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notice_version integer NOT NULL CHECK (notice_version > 0),
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notice_id, user_id, notice_version)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date timestamptz NOT NULL,
  location text,
  color text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id, status);
CREATE INDEX IF NOT EXISTS memberships_company_idx ON memberships(company_id, status);
CREATE INDEX IF NOT EXISTS departments_company_idx ON departments(company_id, status);
CREATE INDEX IF NOT EXISTS units_company_idx ON units(company_id, status);
CREATE INDEX IF NOT EXISTS notices_company_idx ON notices(company_id, status);
CREATE INDEX IF NOT EXISTS notice_reads_company_user_idx ON notice_reads(company_id, user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS calendar_events_company_idx ON calendar_events(company_id, status);
CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON auth_sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

-- 5. Habilitar Row-Level Security (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por Empresa ativa (Tenant)
DO $$ BEGIN
  CREATE POLICY tenant_departments ON departments USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_units ON units USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_memberships ON memberships USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_membership_departments ON membership_departments USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_membership_units ON membership_units USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_role_permissions ON role_permissions USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_notices ON notices USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_notice_reads ON notice_reads USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY tenant_calendar_events ON calendar_events USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid) WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Função de Apoio
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

-- 7. Dados Iniciais e Permissões
INSERT INTO permissions (key, description) VALUES
  ('company.manage', 'Gerenciar configurações da empresa'),
  ('users.view', 'Visualizar usuários da empresa'),
  ('users.manage', 'Convidar, editar e suspender usuários'),
  ('departments.manage', 'Gerenciar departamentos'),
  ('notices.create', 'Criar comunicados'),
  ('notices.publish', 'Publicar comunicados'),
  ('reports.view', 'Visualizar relatórios'),
  ('audit.view', 'Visualizar auditoria'),
  ('support.manage', 'Gerenciar chamados de suporte')
ON CONFLICT (key) DO NOTHING;

-- Empresa Padrão
INSERT INTO companies (id, name, slug, status) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Central de Exames', 'central-exames', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Departamentos Padrão
INSERT INTO departments (id, company_id, name, code) VALUES
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 'Tecnologia da Informação', 'TI'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Qualidade', 'QUAL'),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 'Recursos Humanos', 'RH')
ON CONFLICT (company_id, code) DO NOTHING;

-- Matriz de Permissões por Papel
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

-- Usuários Iniciais (Senha padrão: demo123)
INSERT INTO users (id, name, email, password_hash, is_saas_admin, email_verified_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Administrador Geral', 'admin@saas.test', crypt('demo123', gen_salt('bf')), true, now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Admin Central', 'admin@central.test', crypt('demo123', gen_salt('bf')), false, now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Auditor Geral', 'auditor@saas.test', crypt('demo123', gen_salt('bf')), false, now())
ON CONFLICT (email) DO UPDATE SET is_saas_admin = EXCLUDED.is_saas_admin;

-- Vínculos de Usuários à Empresa Padrão
INSERT INTO memberships (company_id, user_id, role, status, activated_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'owner', 'active', now()),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'admin', 'active', now()),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'auditor', 'active', now())
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Comunicados Iniciais
INSERT INTO notices (id, company_id, title, category, type, content, author_id, requires_acknowledgement) VALUES
  ('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', 'Nova Diretriz de Segurança e Acesso aos Sistemas', 'TI', 'urgent', '<p>Prezados colaboradores,</p><p>Reforçamos a obrigatoriedade da autenticação em duas etapas e da conformidade com as diretrizes de segurança da informação.</p><p>Por favor, confirmem a ciência desta orientação.</p>', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', true),
  ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', 'Atualização do Procedimento Operacional Padrão', 'Qualidade', 'informative', '<p>O manual de boas práticas foi atualizado e está disponível para consulta na Biblioteca de Documentos.</p>', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
