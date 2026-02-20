-- ============================================================================
-- Migration 003: Workflow Runs + Enhanced Workflows
-- ============================================================================
-- Adds workflow_runs table for execution history and audit trail.
-- Ensures workflows table has all required columns.
-- Idempotent — safe to re-run.
-- ============================================================================

-- ── Ensure workflows table has trigger_config column ────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workflows' AND column_name = 'trigger_config'
  ) THEN
    ALTER TABLE workflows ADD COLUMN trigger_config jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- ── Workflow Runs Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_runs (
  id text PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'running',    -- running, completed, failed
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  result jsonb DEFAULT '{}',                 -- steps executed, results, errors
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);

-- ── RLS for workflow_runs ───────────────────────────────────────────────────
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'workflow_runs_select' AND tablename = 'workflow_runs'
  ) THEN
    CREATE POLICY workflow_runs_select ON workflow_runs
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'workflow_runs_insert' AND tablename = 'workflow_runs'
  ) THEN
    CREATE POLICY workflow_runs_insert ON workflow_runs
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'workflow_runs_update' AND tablename = 'workflow_runs'
  ) THEN
    CREATE POLICY workflow_runs_update ON workflow_runs
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'workflow_runs_delete' AND tablename = 'workflow_runs'
  ) THEN
    CREATE POLICY workflow_runs_delete ON workflow_runs
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;
