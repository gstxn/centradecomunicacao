-- Migration 010: Document specification alignment (Vigency dates, audience segmentation, document status, FAQ tags, and search logs)

ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100) DEFAULT 'Toda a empresa';

ALTER TABLE corporate_documents
  ADD COLUMN IF NOT EXISTS valid_until DATE,
  ADD COLUMN IF NOT EXISTS doc_status VARCHAR(30) DEFAULT 'vigente';

ALTER TABLE knowledge_faqs
  ADD COLUMN IF NOT EXISTS tags VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS related_doc_code VARCHAR(80);

CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query_text VARCHAR(255) NOT NULL,
  results_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'search_queries' AND policyname = 'tenant_isolation_search_queries'
  ) THEN
    CREATE POLICY tenant_isolation_search_queries ON search_queries
      FOR ALL
      USING (company_id = current_setting('app.current_company_id', true)::uuid)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::uuid);
  END IF;
END $$;
