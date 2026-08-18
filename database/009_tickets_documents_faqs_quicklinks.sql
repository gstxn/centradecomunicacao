BEGIN;

-- 1. Suporte / Chamados
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_code text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Baixa', 'Normal', 'Alta', 'Urgente')),
  status text NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Em andamento', 'Resolvido', 'Fechado')),
  description text,
  assignee_name text DEFAULT 'Não atribuído',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Biblioteca de Documentos / POPs
CREATE TABLE IF NOT EXISTS corporate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  department text NOT NULL,
  version text NOT NULL DEFAULT 'v1.0',
  status text NOT NULL DEFAULT 'Vigente' CHECK (status IN ('Vigente', 'Em revisão', 'Obsoleto')),
  description text,
  file_url text,
  attachment_id uuid REFERENCES attachments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Base de Conhecimento / FAQs
CREATE TABLE IF NOT EXISTS knowledge_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  department text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Links Rápidos / Atalhos
CREATE TABLE IF NOT EXISTS quick_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'globe',
  category text NOT NULL DEFAULT 'Geral',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para Tenant
CREATE INDEX IF NOT EXISTS support_tickets_company_idx ON support_tickets(company_id, status);
CREATE INDEX IF NOT EXISTS corporate_documents_company_idx ON corporate_documents(company_id, status);
CREATE INDEX IF NOT EXISTS knowledge_faqs_company_idx ON knowledge_faqs(company_id, category);
CREATE INDEX IF NOT EXISTS quick_links_company_idx ON quick_links(company_id, sort_order);

-- Habilitar RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS tenant_support_tickets ON support_tickets;
CREATE POLICY tenant_support_tickets ON support_tickets
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_corporate_documents ON corporate_documents;
CREATE POLICY tenant_corporate_documents ON corporate_documents
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_knowledge_faqs ON knowledge_faqs;
CREATE POLICY tenant_knowledge_faqs ON knowledge_faqs
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_quick_links ON quick_links;
CREATE POLICY tenant_quick_links ON quick_links
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

COMMIT;
