-- ============================================================================
-- Migration 004: API Keys for REST API Access
-- ============================================================================
-- Enables per-tenant API keys for programmatic access to CRM data.
-- Keys are hashed (SHA-256) — only the prefix is stored in plaintext for lookup.
-- Idempotent — safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Key',
  key_prefix text NOT NULL,              -- first 8 chars of the key (for display: "rk_abc1...")
  key_hash text NOT NULL,                -- SHA-256 hash of the full key
  scopes text[] DEFAULT '{read}',        -- read, write, delete, admin
  rate_limit integer DEFAULT 60,         -- requests per minute
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'api_keys_select' AND tablename = 'api_keys'
  ) THEN
    CREATE POLICY api_keys_select ON api_keys FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'api_keys_insert' AND tablename = 'api_keys'
  ) THEN
    CREATE POLICY api_keys_insert ON api_keys FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'api_keys_update' AND tablename = 'api_keys'
  ) THEN
    CREATE POLICY api_keys_update ON api_keys FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'api_keys_delete' AND tablename = 'api_keys'
  ) THEN
    CREATE POLICY api_keys_delete ON api_keys FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Rate limit tracking (in-memory is fine for MVP, but this table enables persistence)
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer DEFAULT 0,
  PRIMARY KEY (key_id, window_start)
);
