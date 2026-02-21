# RunwayCRM - Developer & Admin Documentation

## What is RunwayCRM?

RunwayCRM (formerly BeardForce) is a **white-label, AI-powered multi-agent CRM** designed for any industry. Instead of traditional menu-driven CRM workflows, users interact with four specialized AI agents — CEO, Sales Manager, Marketing Manager, and IT Manager — who collaborate to manage the entire business pipeline.

Each agent has its own domain expertise, a dedicated set of tools, and the ability to read/write to a shared Supabase database. Users can chat with any agent in natural language, and the agent will execute real database operations, generate production-ready code, or provide strategic analysis.

**v6 Highlight:** Full platform stack — Integration Hub (Stripe/SendGrid/Slack), Workflow Automation with EventBus, Billing & Subscriptions, REST API, Marketplace (industry agent templates + workflow recipes), Feature Flags, Agent Observability, and 45-test CI pipeline.

**v7 Highlights:**
- **Slack-style multi-tenancy** — org invite system with shareable links, `/accept-invite` page, auto-accept on login
- **Org-scoped CRM data** — all CRM tables migrated from `user_id` RLS → `org_id` RLS; all team members share data
- **Gemini API proxy** — Supabase Edge Function `gemini-proxy` keeps API key server-side; `VITE_GEMINI_API_KEY` removed from browser
- **Public marketing site** — `/` landing page, `/terms`, `/privacy`, `/register` with email confirmation
- **Mobile-responsive layout** — sidebar becomes slide-out drawer on mobile with hamburger toggle
- **React Error Boundaries** — agents and meeting room wrapped for graceful crash recovery
- **Agent onboarding** — welcome messages shown on first open without API call

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | SPA with type safety |
| **Styling** | Tailwind CSS 3 | Utility-first dark theme |
| **Build** | Vite 5 | Fast dev server + bundler |
| **AI (Chat)** | Google Gemini 2.0 Flash | LLM for all 4 agents + function calling |
| **AI (Code)** | Claude Sonnet (Anthropic) | IT Agent code generation |
| **Backend** | Supabase (PostgreSQL) | DB, Auth, RLS, Edge Functions |
| **Auth** | Supabase Auth | Email/password, JWT sessions |
| **Payments** | Stripe | Subscription billing, checkout |
| **Email** | SendGrid | Transactional + marketing email |
| **Testing** | Vitest | 45 unit tests, CI via GitHub Actions |
| **Charts** | Recharts | Dashboard visualizations |
| **Icons** | Lucide React | Consistent iconography |
| **Routing** | React Router 7 | Client-side navigation |

---

## Project Structure

```
Beardforce-main/
├── docs/                              # Developer documentation
│   ├── README.md                      # Master overview (this file)
│   ├── architecture.md                # System design & data flow
│   ├── agents.md                      # AI agent system & tool reference
│   ├── database.md                    # Schema, adapters, service layer
│   ├── components.md                  # UI components guide
│   ├── auth-and-access.md             # Authentication & RBAC
│   ├── setup.md                       # Local dev setup & deployment
│   ├── api-reference.md               # Full tool & method reference
│   └── ROADMAP.md                     # Product roadmap + version history
│
├── components/
│   ├── Layout.tsx                     # Sidebar + top bar shell
│   ├── meeting/                       # Unified Meeting Room (v5)
│   │   ├── MeetingRoomPage.tsx        # 3-mode: selector, 1-on-1, team meeting
│   │   ├── AgentChatPanel.tsx         # Reusable chat panel
│   │   ├── agentRegistry.ts           # Agent visual config
│   │   └── createAgent.ts             # Agent factory
│   ├── settings/
│   │   ├── AgentSettingsTab.tsx       # Agent name/color/voice config
│   │   ├── BillingTab.tsx             # Subscription plans, usage meter  ← NEW
│   │   ├── BrandingSettingsTab.tsx    # White-label branding
│   │   ├── FieldSettingsTab.tsx       # Dynamic field config
│   │   ├── IntegrationsTab.tsx        # Plug-and-play integration UI
│   │   └── ManifestTab.tsx            # Codebase manifest viewer
│   ├── HelpPage.tsx                   # In-app help & user guide
│   ├── SettingsPage.tsx               # Admin settings (9 tabs)
│   ├── DataBrowser.tsx                # Universal DB table viewer
│   ├── ApprovalQueue.tsx              # CEO change-request approvals
│   └── ...                            # Auth, Lead management, etc.
│
├── services/
│   ├── agents/
│   │   ├── tools/                     # 4 agent implementations
│   │   │   ├── CEOAgent.ts            # CEO (10 tools)
│   │   │   ├── SalesAgent.ts          # Sales (12 tools, now sends email)
│   │   │   ├── MarketingAgent.ts      # Marketing (10 tools)
│   │   │   └── ITAgent.ts             # IT (21 tools, Claude-powered)
│   │   └── MeetingOrchestrator.ts     # @mentions, turn-taking, Q&A
│   ├── database/                      # Adapter → Service → Facade
│   ├── integrations/                  # Integration Hub         ← NEW
│   │   ├── IntegrationAdapter.ts      # Abstract base + types
│   │   ├── IntegrationService.ts      # Facade: config, routing, audit
│   │   └── adapters/
│   │       ├── StripeAdapter.ts       # Payments
│   │       ├── SendGridAdapter.ts     # Email
│   │       └── SlackAdapter.ts        # Notifications
│   ├── workflows/                     # Workflow engine support  ← NEW
│   │   ├── EventBus.ts                # Pub/sub for CRM events
│   │   └── agentFactory.ts            # Agent factory for workflows
│   ├── marketplace/                   # Template library         ← NEW
│   │   ├── AgentTemplates.ts          # 5 industry agent configs
│   │   └── WorkflowTemplates.ts       # 6 pre-built workflow recipes
│   ├── observability/                 # Performance monitoring   ← NEW
│   │   └── AgentTracer.ts             # Agent call tracing & analytics
│   ├── billingService.ts              # Subscription management  ← NEW
│   ├── featureFlags.ts                # Per-tenant feature flags ← NEW
│   ├── workflowEngine.ts              # Workflow executor (enhanced)
│   ├── accessControl.ts
│   ├── claudeService.ts
│   └── ...
│
├── supabase/
│   ├── functions/                     # Edge Functions (Deno)
│   │   ├── claude-proxy/              # Anthropic API proxy
│   │   ├── stripe-proxy/              # Stripe API proxy       ← NEW
│   │   ├── email-proxy/               # SendGrid proxy         ← NEW
│   │   ├── webhook-handler/           # Inbound webhooks       ← NEW
│   │   ├── api/                       # REST API v1            ← NEW
│   │   └── provision-tenant/          # Tenant provisioning    ← NEW
│   └── migrations/
│       ├── 001_rls_policies.sql       # Row-Level Security for all tables
│       ├── 002_integrations.sql       # integration_configs, subscriptions
│       ├── 003_workflows.sql          # workflow_runs table
│       ├── 004_api_keys.sql           # REST API keys
│       └── 005_observability.sql      # agent_traces, feature flags
│
├── tests/
│   ├── setup.ts                       # Global mocks (Supabase, fetch)
│   └── unit/
│       ├── EventBus.test.ts           # 9 tests
│       ├── MeetingOrchestrator.test.ts # 15 tests
│       ├── IntegrationService.test.ts  # 14 tests
│       └── WorkflowEngine.test.ts      # 7 tests
│
├── .github/workflows/ci.yml           # GitHub Actions CI pipeline
├── vitest.config.ts                   # Test configuration
└── package.json                       # 3 test scripts added
```

---

## Key Concepts

### 1. Multi-Agent Architecture
Four AI agents share a common database but have distinct responsibilities:
- **CEO Agent** — Strategic oversight, KPI dashboards, budget approval, agent coordination
- **Sales Agent** — Lead qualification, pipeline management, email sending (via SendGrid)
- **Marketing Agent** — Campaign creation, audience segmentation, content planning
- **IT Agent** — Database CRUD, code generation (Claude), system snapshots

See [agents.md](agents.md) for all 53+ tools.

### 2. Integration Hub
Plug-and-play integrations follow the same **adapter pattern** as the database layer:

```
IntegrationAdapter (abstract)
    ├── StripeAdapter      — payments, checkout, invoices, refunds
    ├── SendGridAdapter    — email sending, templates, delivery stats
    └── SlackAdapter       — team notifications, rich messages
```

Credentials are never stored in the browser — all API calls proxy through Supabase Edge Functions. Configure in **Settings > Integrations**.

### 3. Event-Driven Workflow Engine
The `EventBus` emits CRM events (`lead.created`, `opportunity.status_changed`, etc.) and the `WorkflowEngine` subscribes to trigger automated multi-step workflows. Workflow steps can be:
- `action` — create/update CRM records, send notifications
- `condition` — conditional branching
- `agent` — invoke any AI agent with a prompt
- `integration` — call Stripe, SendGrid, or Slack
- `delay` — pause execution

### 4. Billing & Subscriptions
Three plan tiers (Free / Pro / Enterprise) with AI usage metering. Stripe Checkout handles upgrades. Feature flags auto-adjust per plan. See **Settings > Billing**.

### 5. REST API
Programmatic access to all CRM entities via `GET/POST/PATCH/DELETE /functions/v1/api/{entity}`. Auth via `X-API-Key` header or Supabase JWT. Manage keys in **Settings > System**.

### 6. Marketplace
- **Agent Templates** — 5 industry presets (Real Estate, SaaS, E-Commerce, Healthcare, Finance)
- **Workflow Templates** — 6 ready-to-import automation recipes

### 7. Observability
`AgentTracer` records every agent call: latency, tool invoked, success/failure, token estimate. Summary available in the admin panel (7-day rolling window by default).

### 8. Feature Flags
Per-tenant boolean/numeric flags stored in `system_config`. Control which features are visible and enforce plan-based limits without code changes.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/mainulislamsfdc/Beardforce.git
cd Beardforce
npm install

# 2. Configure environment (see docs/setup.md)
cp .env.example .env
# Fill: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY

# 3. Run SQL migrations in Supabase SQL Editor (in order)
#    supabase/migrations/001_rls_policies.sql
#    supabase/migrations/002_integrations.sql
#    supabase/migrations/003_workflows.sql
#    supabase/migrations/004_api_keys.sql
#    supabase/migrations/005_observability.sql

# 4. Deploy Edge Functions
supabase functions deploy claude-proxy --no-verify-jwt
supabase functions deploy stripe-proxy --no-verify-jwt
supabase functions deploy email-proxy --no-verify-jwt
supabase functions deploy webhook-handler --no-verify-jwt
supabase functions deploy api --no-verify-jwt
supabase functions deploy provision-tenant

# 5. Start development server
npm run dev

# 6. Run tests
npm test
```

---

## Current Status

| Area | Status |
|------|--------|
| Version | **6.0** |
| AI Agents | 4 operational, 53+ tools |
| Meeting Room | @mentions, voice, interactive Q&A |
| Integration Hub | Stripe + SendGrid + Slack adapters |
| Workflows | Event-triggered, agent steps, integration steps |
| Billing | Free / Pro ($29) / Enterprise ($99) + AI metering |
| REST API | 6 entities, API key auth, scope-based |
| Marketplace | 5 agent templates, 6 workflow templates |
| Observability | Agent tracing, latency/success metrics |
| Feature Flags | 16 flags, plan-based auto-apply |
| Tests | **45 passing**, GitHub Actions CI |
| Live Demo | https://beardforce.vercel.app |

---

## Documentation Index

| Document | What It Covers |
|----------|---------------|
| [architecture.md](architecture.md) | System design, patterns, data flow |
| [agents.md](agents.md) | AI agents, 53+ tools, function calling |
| [database.md](database.md) | 13+ tables, adapter pattern, service API |
| [components.md](components.md) | Every React component explained |
| [auth-and-access.md](auth-and-access.md) | Auth flow, RBAC, RLS policies |
| [setup.md](setup.md) | Full dev setup + Edge Function deployment |
| [api-reference.md](api-reference.md) | Tool & method reference |
| [ROADMAP.md](ROADMAP.md) | Product roadmap, version history |
