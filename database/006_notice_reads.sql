BEGIN;
ALTER TABLE notices ADD COLUMN category text NOT NULL DEFAULT 'Geral';
ALTER TABLE notices ADD COLUMN content text NOT NULL DEFAULT '';
ALTER TABLE notices ADD COLUMN requires_acknowledgement boolean NOT NULL DEFAULT true;
ALTER TABLE notices ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE notices ADD COLUMN published_at timestamptz;
CREATE TABLE notice_reads (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notice_id uuid NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notice_version integer NOT NULL CHECK (notice_version > 0),
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notice_id, user_id, notice_version)
);
CREATE INDEX notice_reads_company_user_idx ON notice_reads(company_id, user_id, read_at DESC);
ALTER TABLE notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_reads FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_notice_reads ON notice_reads
  USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
GRANT SELECT, INSERT ON notice_reads TO central_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON notices TO central_runtime;
COMMIT;
