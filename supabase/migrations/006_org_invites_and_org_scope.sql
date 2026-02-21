-- ============================================================================
-- Migration 006: Org Invites + Org-Scoped CRM Data
-- ============================================================================
-- Part A: org_invites table for invite-link-based team onboarding
-- Part B: Add org_id to CRM tables + update RLS from user_id → org_id
--         so all org members share the same CRM data.
-- Idempotent — safe to re-run.
-- ============================================================================

-- ── Part A: org_invites ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'editor'
                          CHECK (role IN ('admin', 'editor', 'viewer')),
  token       text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid        NOT NULL REFERENCES auth.users(id),
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'cancelled')),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token  ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org    ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email  ON org_invites(email);

ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

-- Org members can manage their org's invites
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invites_select' AND tablename = 'org_invites') THEN
    CREATE POLICY "invites_select" ON org_invites FOR SELECT
      USING (org_id = public.get_user_org_id() OR status = 'pending');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invites_insert' AND tablename = 'org_invites') THEN
    CREATE POLICY "invites_insert" ON org_invites FOR INSERT
      WITH CHECK (org_id = public.get_user_org_id());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invites_update' AND tablename = 'org_invites') THEN
    -- Allow updates: org admin cancels, OR any authenticated user accepts (status → accepted)
    CREATE POLICY "invites_update" ON org_invites FOR UPDATE
      USING (org_id = public.get_user_org_id() OR auth.uid() IS NOT NULL);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invites_delete' AND tablename = 'org_invites') THEN
    CREATE POLICY "invites_delete" ON org_invites FOR DELETE
      USING (org_id = public.get_user_org_id());
  END IF;
END $$;

-- SECURITY DEFINER function: works unauthenticated (for invite accept page before login)
CREATE OR REPLACE FUNCTION public.get_invite_details(invite_token text)
RETURNS TABLE (
  invite_id  uuid,
  org_id     uuid,
  org_name   text,
  role       text,
  email      text,
  expires_at timestamptz,
  status     text
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.org_id, o.name, i.role, i.email, i.expires_at, i.status
  FROM   org_invites i
  JOIN   organizations o ON o.id = i.org_id
  WHERE  i.token = invite_token;
END;
$$;

-- ── Part B: Org-scope CRM tables ─────────────────────────────────────────────
-- Add org_id column to each CRM table, backfill from org_members,
-- then replace user_id RLS with org_id RLS so all org members share data.

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'leads', 'contacts', 'accounts', 'opportunities', 'orders', 'products'
  ])
  LOOP
    BEGIN
      -- Add org_id column if missing
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);',
        tbl
      );

      -- Backfill org_id from org_members based on user_id
      EXECUTE format(
        'UPDATE public.%I t
         SET org_id = (SELECT org_id FROM org_members WHERE user_id = t.user_id LIMIT 1)
         WHERE t.org_id IS NULL;',
        tbl
      );

      -- Drop old user_id-based policies
      EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s" ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%s" ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%s" ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_%s" ON public.%I;', tbl, tbl);

      -- Create org_id-based policies so all org members share data
      EXECUTE format(
        'CREATE POLICY "tenant_select_%s" ON public.%I FOR SELECT
         USING (org_id = public.get_user_org_id());',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "tenant_insert_%s" ON public.%I FOR INSERT
         WITH CHECK (org_id = public.get_user_org_id());',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "tenant_update_%s" ON public.%I FOR UPDATE
         USING (org_id = public.get_user_org_id());',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "tenant_delete_%s" ON public.%I FOR DELETE
         USING (org_id = public.get_user_org_id());',
        tbl, tbl
      );

    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping.', tbl;
      WHEN undefined_column THEN
        RAISE NOTICE 'Table % missing expected column, skipping.', tbl;
    END;
  END LOOP;
END $$;

-- Also update change_log to be org-scoped (all team members see agent activity)
DO $$
BEGIN
  ALTER TABLE public.change_log ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
  UPDATE public.change_log t
  SET org_id = (SELECT org_id FROM org_members WHERE user_id = t.user_id LIMIT 1)
  WHERE t.org_id IS NULL;

  DROP POLICY IF EXISTS "tenant_select_change_log" ON public.change_log;
  DROP POLICY IF EXISTS "tenant_insert_change_log" ON public.change_log;
  DROP POLICY IF EXISTS "tenant_update_change_log" ON public.change_log;
  DROP POLICY IF EXISTS "tenant_delete_change_log" ON public.change_log;

  CREATE POLICY "tenant_select_change_log" ON public.change_log FOR SELECT
    USING (org_id = public.get_user_org_id());
  CREATE POLICY "tenant_insert_change_log" ON public.change_log FOR INSERT
    WITH CHECK (org_id = public.get_user_org_id());
  CREATE POLICY "tenant_update_change_log" ON public.change_log FOR UPDATE
    USING (org_id = public.get_user_org_id());
  CREATE POLICY "tenant_delete_change_log" ON public.change_log FOR DELETE
    USING (org_id = public.get_user_org_id());
EXCEPTION
  WHEN undefined_table THEN RAISE NOTICE 'change_log does not exist, skipping.';
END $$;
