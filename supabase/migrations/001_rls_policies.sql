-- ============================================================
-- Migration 001: Enable RLS + tenant isolation policies
-- Applies to all CRM tables. Every row is scoped to auth.uid()
-- ============================================================

-- Helper: reusable function to get current user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- CRM TABLES: leads, contacts, accounts, opportunities, orders, products
-- ============================================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'leads', 'contacts', 'accounts', 'opportunities', 'orders', 'products'
  ])
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Drop existing policies if any (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_%s" ON public.%I;', tbl, tbl);

    -- SELECT: users can only see their own rows
    EXECUTE format(
      'CREATE POLICY "tenant_select_%s" ON public.%I FOR SELECT USING (user_id = auth.uid());',
      tbl, tbl
    );

    -- INSERT: user_id must match authenticated user
    EXECUTE format(
      'CREATE POLICY "tenant_insert_%s" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid());',
      tbl, tbl
    );

    -- UPDATE: can only update own rows
    EXECUTE format(
      'CREATE POLICY "tenant_update_%s" ON public.%I FOR UPDATE USING (user_id = auth.uid());',
      tbl, tbl
    );

    -- DELETE: can only delete own rows
    EXECUTE format(
      'CREATE POLICY "tenant_delete_%s" ON public.%I FOR DELETE USING (user_id = auth.uid());',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- SYSTEM TABLES: change_log, ai_budget, system_snapshots, system_config
-- ============================================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'change_log', 'ai_budget', 'system_snapshots', 'system_config'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_%s" ON public.%I;', tbl, tbl);

    EXECUTE format(
      'CREATE POLICY "tenant_select_%s" ON public.%I FOR SELECT USING (user_id = auth.uid());',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "tenant_insert_%s" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid());',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "tenant_update_%s" ON public.%I FOR UPDATE USING (user_id = auth.uid());',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "tenant_delete_%s" ON public.%I FOR DELETE USING (user_id = auth.uid());',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- ORGANIZATION TABLES: special handling
-- ============================================================

-- organizations: creator can see/manage their org
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "org_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_update" ON public.organizations;

CREATE POLICY "org_select" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "org_insert" ON public.organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- org_members: members can see their own org's members
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orgmember_select" ON public.org_members;
DROP POLICY IF EXISTS "orgmember_insert" ON public.org_members;
DROP POLICY IF EXISTS "orgmember_update" ON public.org_members;
DROP POLICY IF EXISTS "orgmember_delete" ON public.org_members;

CREATE POLICY "orgmember_select" ON public.org_members
  FOR SELECT USING (
    org_id = public.get_user_org_id()
  );

CREATE POLICY "orgmember_insert" ON public.org_members
  FOR INSERT WITH CHECK (
    -- Admins can invite, or self-insert during provisioning
    org_id = public.get_user_org_id()
    OR user_id = auth.uid()
  );

CREATE POLICY "orgmember_update" ON public.org_members
  FOR UPDATE USING (
    org_id = public.get_user_org_id()
    AND (SELECT role FROM public.org_members WHERE user_id = auth.uid() AND org_id = org_members.org_id) = 'admin'
  );

CREATE POLICY "orgmember_delete" ON public.org_members
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (SELECT role FROM public.org_members WHERE user_id = auth.uid() AND org_id = org_members.org_id) = 'admin'
  );

-- ============================================================
-- CONFIG TABLES: agent_configs, org_branding, field_configs
-- ============================================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'agent_configs', 'org_branding', 'field_configs'
  ])
  LOOP
    -- These may or may not exist yet; skip errors
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s" ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%s" ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%s" ON public.%I;', tbl, tbl);

      EXECUTE format(
        'CREATE POLICY "tenant_select_%s" ON public.%I FOR SELECT USING (user_id = auth.uid());',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "tenant_insert_%s" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid());',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "tenant_update_%s" ON public.%I FOR UPDATE USING (user_id = auth.uid());',
        tbl, tbl
      );
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist yet, skipping RLS.', tbl;
    END;
  END LOOP;
END $$;
