BEGIN;
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_sessions_active_idx ON auth_sessions(token_hash, expires_at) WHERE revoked_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_sessions TO central_runtime;
COMMIT;
