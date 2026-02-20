-- ============================================================================
-- Migration 005: Observability — Agent Traces & Feature Flags
-- ============================================================================
-- Adds agent_traces table for performance monitoring.
-- system_config already exists; no changes needed for feature flags.
-- Idempotent — safe to re-run.
-- ============================================================================

-- ── Agent Traces ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,                   -- ceo, sales, marketing, it
  tool text,                                -- tool name if a function call
  latency_ms integer NOT NULL,
  success boolean NOT NULL DEFAULT true,
  error text,                               -- error message if failed
  token_estimate integer,                   -- rough token count
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_traces_user ON agent_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_agent ON agent_traces(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_created ON agent_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_traces_success ON agent_traces(user_id, success);

-- RLS
ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agent_traces_select' AND tablename = 'agent_traces'
  ) THEN
    CREATE POLICY agent_traces_select ON agent_traces FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agent_traces_insert' AND tablename = 'agent_traces'
  ) THEN
    CREATE POLICY agent_traces_insert ON agent_traces FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agent_traces_delete' AND tablename = 'agent_traces'
  ) THEN
    CREATE POLICY agent_traces_delete ON agent_traces FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Auto-cleanup traces older than 90 days (prevent unbounded growth)
-- Run this manually or via cron:
-- DELETE FROM agent_traces WHERE created_at < now() - interval '90 days';

-- ── system_config upsert support (for feature flags) ─────────────────────────
-- Ensure system_config has a unique constraint on (user_id, key) for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'system_config_user_key_unique'
  ) THEN
    ALTER TABLE system_config ADD CONSTRAINT system_config_user_key_unique UNIQUE (user_id, key);
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $$;
