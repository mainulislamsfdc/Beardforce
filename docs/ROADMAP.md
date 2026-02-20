# RunwayCRM - Product Roadmap

## Version History

| Version | Release | Highlights |
|---------|---------|------------|
| v1.0 | Initial | 4 AI agents, Gemini function calling, Supabase backend |
| v2.0 | +Access | RBAC, all agents operational, Database Explorer, docs |
| v3.0 | +Enterprise | White-label, agent customization, multi-agent meetings |
| v4.0 | +Claude | Claude AI code generation, codebase manifest, edge functions |
| v5.0 | +Meeting Room | Unified Meeting Room, @mention routing, interactive Q&A, sequential voice |
| v6.0 | +Platform ✅ | Integration Hub, EventBus workflows, Billing, REST API, Marketplace, Feature Flags, Observability, 45-test CI |

## Current Product Audit (v6.0)

### What's Production-Ready (v6.0)
- **Database**: Adapter pattern, 13+ tables, full CRUD, snapshot/rollback, RLS on all tables
- **Authentication**: Supabase Auth, session management, RBAC (admin/editor/viewer)
- **AI Agents**: 4 agents, 53+ tools, Gemini function calling, Claude code generation
- **Meeting Room**: @mention routing, interactive Q&A, sequential voice, team meetings
- **Integration Hub**: Stripe (payments), SendGrid (email sending), Slack (notifications)
- **Workflow Engine**: EventBus pub/sub, agent steps, integration steps, run logging
- **Billing**: Free/Pro/Enterprise tiers, AI usage metering, Stripe Checkout upgrade flow
- **REST API**: 6 CRM entities, API key auth, scope-based permissions, pagination
- **Marketplace**: 5 industry agent templates, 6 pre-built workflow recipes
- **Feature Flags**: 16 flags, plan-based auto-apply, stored in system_config
- **Observability**: AgentTracer — latency, success rate, token estimates, daily volume
- **Testing**: 45 unit tests, Vitest, GitHub Actions CI on every PR
- **Edge Functions**: claude-proxy, stripe-proxy, email-proxy, webhook-handler, api, provision-tenant
- **White-Label**: Custom branding, agent config, field config per organisation

### What's Still Ahead (v7+)
- SMS (Twilio) — outbound reminders and lead alerts
- Scheduled workflows (cron triggers server-side)
- Agent templates gallery UI (Settings > Agents > Templates)
- Workflow templates gallery UI (Workflows > Templates)
- Feature flag admin UI (Settings > System > Flags)
- Observability dashboard page (dedicated page, not just system tab)
- Custom domains (CNAME mapping per tenant)
- SSO/SAML (Okta, Azure AD for enterprise tenants)
- PDF export from Data Browser
- Twilio SMS adapter

---

## Phase 1: Foundation (Make It Investable)

**Goal:** Real multi-tenant isolation, plug-and-play integrations, agent orchestration, and testing. This is what closes the gap between "impressive demo" and "fundable product."

### 1.1 Multi-Tenant Infrastructure

**Problem:** Data isolation relies on JavaScript-level `user_id` filtering. No enforced RLS. One bad query = data leak across tenants.

**Solution:**

#### A. Auto-Deploy RLS Policies via Migrations

Create `supabase/migrations/` with SQL that enforces isolation at the database level:

```sql
-- Every CRM table gets these policies:
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select" ON leads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tenant_isolation_insert" ON leads
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_isolation_update" ON leads
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "tenant_isolation_delete" ON leads
  FOR DELETE USING (user_id = auth.uid());
```

Apply to all 13 tables. Run via `supabase db push` or `supabase migration up`.

#### B. Org-Scoped Isolation (Future: Replace user_id with org_id)

Current: Every row has `user_id` = individual user.
Future: Every row has `org_id` = organization. Multiple users in same org share data.

```sql
-- Phase 1B: Add org_id to all CRM tables
ALTER TABLE leads ADD COLUMN org_id uuid REFERENCES organizations(id);

-- RLS uses org membership instead of direct user_id
CREATE POLICY "org_isolation" ON leads
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );
```

#### C. Tenant Provisioning API

New Supabase Edge Function: `POST /functions/v1/provision-tenant`

```typescript
// Input: { email, orgName, plan }
// Creates: organization, admin user, default config, sample data
// Returns: { orgId, userId, loginUrl }
```

This enables:
- Self-service signup with org creation
- Admin provisioning of tenant accounts
- White-label reseller deployment

#### D. Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/001_rls_policies.sql` | Create | RLS for all 13 tables |
| `supabase/migrations/002_org_scoping.sql` | Create | Add org_id columns, update RLS |
| `supabase/functions/provision-tenant/index.ts` | Create | Tenant provisioning edge function |
| `services/database/DatabaseService.ts` | Modify | Add org_id injection alongside user_id |
| `context/OrgContext.tsx` | Modify | Robust org provisioning (no silent failures) |

---

### 1.2 Integration Hub (Plug & Play)

**Problem:** A CRM that can't send emails or process payments is a demo.

**Solution:** Build an `IntegrationAdapter` pattern (same philosophy as `DatabaseAdapter`) so integrations are pluggable and tenant-configurable.

#### A. Architecture

```
┌──────────────────────────────────────────────┐
│              INTEGRATION HUB                  │
│                                                │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐│
│  │   Stripe   │  │  SendGrid  │  │  Slack   ││
│  │  Adapter   │  │  Adapter   │  │ Adapter  ││
│  └─────┬──────┘  └─────┬──────┘  └────┬─────┘│
│        │               │              │       │
│  ┌─────┴───────────────┴──────────────┴─────┐│
│  │        IntegrationAdapter (base)          ││
│  │  connect() | disconnect() | test()        ││
│  │  execute(action, params) → result         ││
│  └───────────────────┬───────────────────────┘│
│                      │                         │
│  ┌───────────────────┴───────────────────────┐│
│  │        IntegrationService (facade)         ││
│  │  Per-tenant config from integration_configs││
│  │  Credential encryption at rest             ││
│  └───────────────────┬───────────────────────┘│
│                      │                         │
│  ┌───────────────────┴───────────────────────┐│
│  │        Webhook Engine                      ││
│  │  Inbound: receive from Stripe/Slack        ││
│  │  Outbound: notify on CRM events            ││
│  └────────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

#### B. IntegrationAdapter Interface

```typescript
interface IntegrationAdapter {
  id: string;                    // 'stripe', 'sendgrid', 'slack'
  name: string;                  // 'Stripe Payments'
  category: 'payment' | 'communication' | 'data' | 'reporting';
  icon: string;                  // Lucide icon name
  requiredConfig: string[];      // ['api_key', 'webhook_secret']

  // Lifecycle
  connect(config: Record<string, string>): Promise<{ success: boolean; error?: string }>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;

  // Unified action execution
  execute(action: string, params: Record<string, any>): Promise<IntegrationResult>;

  // Webhook handling
  handleWebhook?(payload: unknown, headers: Record<string, string>): Promise<void>;
}

interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

#### C. Core Integrations (Phase 1)

**Stripe — Payments & Subscriptions**
- Actions: `create_checkout`, `create_subscription`, `get_invoices`, `refund`
- Webhook events: `payment_intent.succeeded`, `customer.subscription.updated`
- Tenant billing: Metered usage for AI tokens
- Customer payments: Process orders from Sales agent quotes

**SendGrid/Resend — Email Delivery**
- Actions: `send_email`, `send_template`, `get_delivery_status`
- Webhook events: `delivered`, `opened`, `clicked`, `bounced`
- Connects to: Sales agent `draft_email` tool (now actually sends)
- Connects to: Marketing agent campaign emails

**Slack — Team Notifications**
- Actions: `send_message`, `create_channel`, `post_to_thread`
- Webhook events: Slash commands → trigger agent actions
- Connects to: Approval notifications, lead alerts, meeting summaries

#### D. Database Tables

```sql
-- Integration configurations per tenant
CREATE TABLE integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  integration_id text NOT NULL,           -- 'stripe', 'sendgrid'
  enabled boolean DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',     -- encrypted credentials
  webhook_url text,                       -- auto-generated per tenant
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook event log
CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  integration_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'received',         -- received, processed, failed
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### E. Files to Create

| File | Purpose |
|------|---------|
| `services/integrations/IntegrationAdapter.ts` | Base interface + types |
| `services/integrations/IntegrationService.ts` | Facade: load configs, route to adapters |
| `services/integrations/adapters/StripeAdapter.ts` | Stripe payments |
| `services/integrations/adapters/SendGridAdapter.ts` | Email delivery |
| `services/integrations/adapters/SlackAdapter.ts` | Slack notifications |
| `components/settings/IntegrationsTab.tsx` | UI: enable/configure per tenant |
| `supabase/functions/webhook-handler/index.ts` | Edge function: inbound webhook router |
| `supabase/migrations/003_integrations.sql` | Tables: integration_configs, webhook_events |

---

### 1.3 Agent Orchestration (Make "Team" Real)

**Problem:** CEO can plan workflows but can't execute them through other agents. Agents are independent chatbots.

**Solution:** Event-driven workflow engine where agents trigger each other.

#### A. Workflow Engine

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual';
  event?: string;            // 'lead.score_above_80', 'order.created'
  schedule?: string;         // cron expression
}

interface WorkflowStep {
  agentId: string;           // 'sales', 'ceo', 'marketing'
  tool: string;              // 'create_opportunity', 'approve_major_decision'
  params: Record<string, any>;
  condition?: string;        // 'previous.result.success === true'
  requiresApproval?: boolean;
}
```

#### B. Example Workflows

**Lead Qualification Pipeline:**
```
Trigger: lead.created
Step 1: Sales → qualify_lead(lead_id)
Step 2: IF score > 80 → Sales → create_opportunity(lead_id)
Step 3: CEO → approve_major_decision(opportunity_id)
Step 4: Marketing → add_to_campaign(lead_id, 'high-value')
```

**Monthly Report:**
```
Trigger: schedule('0 9 1 * *')  // 1st of month, 9am
Step 1: CEO → generate_executive_dashboard()
Step 2: Sales → forecast_revenue()
Step 3: Marketing → campaign_analytics()
Step 4: SendGrid → send_email(admin, compiled_report)
```

#### C. Files to Create

| File | Purpose |
|------|---------|
| `services/workflows/WorkflowEngine.ts` | Execute multi-step workflows |
| `services/workflows/WorkflowRegistry.ts` | Store & manage workflow definitions |
| `services/workflows/EventBus.ts` | Pub/sub for CRM events |
| `supabase/migrations/004_workflows.sql` | Tables: workflows, workflow_runs, workflow_steps |

---

### 1.4 Testing & CI/CD

**Problem:** Zero test files. No CI pipeline. Investor due diligence will flag immediately.

**Solution:**

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit tests | Vitest | DatabaseService, agents, auth, integrations |
| Component tests | React Testing Library | Settings, Meeting Room, Agent Chat |
| E2E tests | Playwright | Login → create lead → approve → verify |
| CI pipeline | GitHub Actions | Lint + test + build on every PR |

#### Files to Create

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Test configuration |
| `tests/unit/DatabaseService.test.ts` | CRUD operations |
| `tests/unit/MeetingOrchestrator.test.ts` | @mention parsing, routing |
| `tests/unit/IntegrationService.test.ts` | Integration adapter tests |
| `tests/e2e/auth.spec.ts` | Login/register flow |
| `tests/e2e/meeting.spec.ts` | Meeting room interaction |
| `.github/workflows/ci.yml` | GitHub Actions pipeline |

---

## Phase 2: Revenue & Growth

**Goal:** Monetization via subscriptions + AI usage metering. Real communication channels.

### 2.1 Billing & Subscription (Stripe)

| Feature | Implementation |
|---------|---------------|
| Plan tiers | Free (100 AI calls/mo), Pro ($29/mo, 5K calls), Enterprise (custom) |
| AI usage metering | Track via `ai_budget` table, bill overage via Stripe metered billing |
| Self-service | Upgrade/downgrade/cancel via Settings > Billing tab |
| Tenant provisioning | Stripe Checkout → webhook → auto-provision org |

#### Tables
```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',     -- free, pro, enterprise
  status text NOT NULL DEFAULT 'active', -- active, past_due, canceled
  current_period_end timestamptz,
  ai_calls_used integer DEFAULT 0,
  ai_calls_limit integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);
```

### 2.2 Communication Channels

| Channel | Provider | Agent Integration |
|---------|----------|-------------------|
| Email | SendGrid/Resend | Sales `draft_email` → actually sends |
| Email tracking | SendGrid webhooks | Open/click rates → Sales agent context |
| SMS | Twilio | Follow-up reminders, lead alerts |
| Scheduled reports | Cron + SendGrid | Weekly pipeline summary to admin email |

### 2.3 Reporting & Analytics

| Feature | Implementation |
|---------|---------------|
| Tenant dashboards | Org-level KPIs (not just per-user) |
| Export | PDF/CSV export from DataBrowser |
| Scheduled reports | Cron trigger → CEO report → email to admin |
| Agent performance | Compare response times, tool usage, error rates |

### 2.4 REST API & Developer Platform

| Feature | Implementation |
|---------|---------------|
| REST API | Supabase Edge Functions: `/api/v1/leads`, `/api/v1/contacts` |
| API keys | Per-tenant keys stored in `system_config` |
| Rate limiting | Token bucket per tenant, configurable by plan |
| OpenAPI spec | Auto-generated from edge function definitions |

---

## Phase 3: Platform & Scale

**Goal:** Transform from product to platform. Marketplace, enterprise features, global scale.

### 3.1 Marketplace

| Feature | Description |
|---------|-------------|
| Agent templates | Industry-specific agents (real estate, healthcare, retail) |
| Custom tools | Tenant developers add their own agent tools via plugin API |
| Custom field types | Formula fields, lookup fields, rollup summaries |
| Workflow templates | Pre-built automation recipes |

### 3.2 Advanced Multi-Tenant

| Feature | Description |
|---------|-------------|
| Data residency | Tenant chooses region (US, EU, APAC) for PostgreSQL |
| Feature flags | Enable/disable features per tenant or plan |
| Custom domains | tenant.runwaycrm.com → their-brand.com (CNAME mapping) |
| SSO/SAML | Enterprise auth (Okta, Azure AD) for large tenants |

### 3.3 Observability

| Feature | Description |
|---------|-------------|
| Agent tracing | Full request → tool call → DB query → response trace |
| Error tracking | Sentry integration for frontend + edge functions |
| Usage analytics | Per-tenant AI token usage, feature adoption |
| Health dashboard | Internal admin view: all tenants, system health |

---

## Implementation Priority Matrix

| Feature | Business Value | Technical Effort | Priority |
|---------|---------------|-----------------|----------|
| RLS policies (auto-deploy) | Critical | Low | P0 |
| Org-scoped data (org_id) | Critical | Medium | P0 |
| Integration Hub architecture | High | Medium | P0 |
| Stripe adapter | High | Medium | P1 |
| SendGrid adapter | High | Low | P1 |
| Workflow engine | High | High | P1 |
| Unit tests + CI | High | Medium | P1 |
| Billing/subscriptions | High | Medium | P2 |
| Slack adapter | Medium | Low | P2 |
| REST API | Medium | Medium | P2 |
| SMS (Twilio) | Medium | Low | P2 |
| Agent templates | Medium | High | P3 |
| Custom domains | Low | Medium | P3 |
| SSO/SAML | Low | High | P3 |

---

## Architecture: Target State

```
┌─────────────────────────────────────────────────────────┐
│                    TENANT LAYER                          │
│                                                          │
│  Tenant A              Tenant B              Tenant C    │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────┐│
│  │ Branding     │     │ Branding     │     │ Branding ││
│  │ 4 AI Agents  │     │ 4 AI Agents  │     │ 4 Agents ││
│  │ Field Config │     │ Field Config │     │ Fields   ││
│  │ Integrations │     │ Integrations │     │ Integr.  ││
│  │ Workflows    │     │ Workflows    │     │ Workflows││
│  │ Billing: Pro │     │ Billing: Ent │     │ Free     ││
│  └──────────────┘     └──────────────┘     └──────────┘│
├─────────────────────────────────────────────────────────┤
│                  ISOLATION LAYER                         │
│                                                          │
│  PostgreSQL RLS: org_id = get_user_org_id()             │
│  JWT: auth.uid() → org_members → org_id → scoped data  │
│  Storage: org_id prefix on all files                    │
│  AI: per-org token budgets + rate limits                │
├─────────────────────────────────────────────────────────┤
│                 INTEGRATION HUB                          │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ ┌───────┐          │
│  │ Stripe  │ │SendGrid │ │ Slack │ │Twilio │  + more  │
│  └────┬────┘ └────┬────┘ └───┬───┘ └───┬───┘          │
│       └───────────┼──────────┼─────────┘               │
│                   │          │                           │
│            IntegrationService                            │
│                   │                                      │
│             Webhook Engine                               │
├─────────────────────────────────────────────────────────┤
│                 WORKFLOW ENGINE                           │
│                                                          │
│  Event Bus → Trigger → Agent Steps → Approvals → Done  │
│  Cron scheduler for recurring workflows                  │
├─────────────────────────────────────────────────────────┤
│                  AI LAYER                                │
│                                                          │
│  Gemini 2.0 Flash (chat routing + function calling)     │
│  Claude Sonnet (code generation via Edge Functions)      │
│  MeetingOrchestrator (@mentions, turn-taking, Q&A)      │
├─────────────────────────────────────────────────────────┤
│                SHARED PLATFORM                           │
│                                                          │
│  Supabase PostgreSQL + Auth + Edge Functions + Storage  │
│  React 18 + TypeScript + Tailwind CSS + Vite            │
│  GitHub Actions CI/CD + Vitest + Playwright             │
└─────────────────────────────────────────────────────────┘
```

---

## Investor Pitch (Post Phase 1+2)

> **RunwayCRM is a white-label, AI-native CRM platform.**
>
> Each tenant gets 4 AI agents that execute real business operations — create leads, qualify pipelines, send emails, process payments — not just chat. The platform handles multi-tenant isolation, billing, and integrations out of the box.
>
> Tenants customize branding, agents, fields, and workflows without writing code. We monetize via SaaS subscriptions + metered AI usage billing.

**Comparables:**
- Durable AI (AI website builder) — raised $14M
- Clay (AI-powered GTM) — raised $46M
- Relevance AI (AI agent platform) — raised $15M

**Differentiator:** Not just AI chat — AI agents with real database tools, approval workflows, multi-agent orchestration, and a plug-and-play integration hub, all in a white-label package any business can deploy.
