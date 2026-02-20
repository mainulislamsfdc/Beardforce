-- ============================================================
-- Migration 002: Integration Hub tables
-- Stores per-tenant integration configs and webhook events
-- ============================================================

-- Integration configurations per tenant
CREATE TABLE IF NOT EXISTS public.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  integration_id text NOT NULL,              -- 'stripe', 'sendgrid', 'slack', 'twilio'
  enabled boolean DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',        -- encrypted credentials (api_key, secrets)
  webhook_url text,                          -- auto-generated inbound webhook URL
  last_synced_at timestamptz,
  error_message text,                        -- last connection error, if any
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, integration_id)
);

-- Webhook event log (inbound + outbound)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  integration_id text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound', -- 'inbound' or 'outbound'
  event_type text NOT NULL,                  -- 'payment_intent.succeeded', 'email.delivered'
  payload jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'received',            -- received, processed, failed
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_integration_configs_user
  ON public.integration_configs(user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_type
  ON public.webhook_events(user_id, integration_id, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events(status) WHERE status != 'processed';

-- RLS
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_integration_configs" ON public.integration_configs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tenant_insert_integration_configs" ON public.integration_configs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tenant_update_integration_configs" ON public.integration_configs
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "tenant_delete_integration_configs" ON public.integration_configs
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "tenant_select_webhook_events" ON public.webhook_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tenant_insert_webhook_events" ON public.webhook_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Subscriptions table for billing
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',          -- free, pro, enterprise
  status text NOT NULL DEFAULT 'active',      -- active, past_due, canceled, trialing
  current_period_start timestamptz,
  current_period_end timestamptz,
  ai_calls_used integer DEFAULT 0,
  ai_calls_limit integer DEFAULT 100,         -- free=100, pro=5000, enterprise=unlimited
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tenant_update_subscriptions" ON public.subscriptions
  FOR UPDATE USING (user_id = auth.uid());
