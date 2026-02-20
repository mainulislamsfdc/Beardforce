# Local Development Setup

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)
- **Git**
- A **Supabase** project (free tier works)
- A **Google Gemini API key** (free tier available)
- **Supabase CLI** (for Edge Functions) — `npm install -g supabase`

---

## 1. Clone & Install

```bash
git clone https://github.com/mainulislamsfdc/Beardforce.git
cd Beardforce
npm install
```

## 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSy...
```

### Where to get these:

| Variable | Source |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `VITE_GEMINI_API_KEY` | Google AI Studio → Get API Key |

**Important:** All env vars must start with `VITE_` to be exposed to the client via Vite's `import.meta.env`.

## 3. Supabase Database Setup

Run the following SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query).

### 3a. CRM Tables

```sql
-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  source text DEFAULT 'other',
  status text DEFAULT 'new',
  score integer DEFAULT 0,
  beard_type text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  title text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  industry text,
  website text,
  phone text,
  address text,
  annual_revenue decimal,
  employee_count integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  amount decimal DEFAULT 0,
  stage text DEFAULT 'prospecting',
  probability integer DEFAULT 10,
  close_date date,
  lead_id uuid,
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  order_number text,
  status text DEFAULT 'pending',
  total_amount decimal DEFAULT 0,
  items jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  price decimal DEFAULT 0,
  category text,
  sku text,
  in_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3b. System Tables

```sql
-- Change Log
CREATE TABLE IF NOT EXISTS change_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  agent_name text,
  change_type text,
  description text,
  before_state jsonb,
  after_state jsonb,
  status text DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- AI Budget
CREATE TABLE IF NOT EXISTS ai_budget (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  month text,
  agent_name text,
  request_count integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  estimated_cost decimal DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Database Connections
CREATE TABLE IF NOT EXISTS database_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text,
  type text,
  config jsonb,
  created_at timestamptz DEFAULT now()
);
```

### 3c. Organization Tables (v2)

```sql
-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization Members
CREATE TABLE IF NOT EXISTS org_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  role text DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  email text,
  invited_by uuid,
  joined_at timestamptz DEFAULT now()
);

-- Code Snippets
CREATE TABLE IF NOT EXISTS code_snippets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  agent_name text,
  title text,
  description text,
  code text,
  language text DEFAULT 'typescript',
  component_type text,
  created_at timestamptz DEFAULT now()
);

-- System Snapshots
CREATE TABLE IF NOT EXISTS system_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  label text NOT NULL,
  description text,
  snapshot_data jsonb,
  tables_included jsonb,
  total_rows integer DEFAULT 0,
  created_by_agent text,
  created_at timestamptz DEFAULT now()
);

-- System Config
CREATE TABLE IF NOT EXISTS system_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  config_key text NOT NULL,
  config_value jsonb,
  updated_at timestamptz DEFAULT now()
);
```

### 3d. Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- CRM + system tables: user owns their data
CREATE POLICY "users_leads" ON leads FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_contacts" ON contacts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_accounts" ON accounts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_opportunities" ON opportunities FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_orders" ON orders FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_products" ON products FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_change_log" ON change_log FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_ai_budget" ON ai_budget FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_db_connections" ON database_connections FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_code_snippets" ON code_snippets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_snapshots" ON system_snapshots FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_config" ON system_config FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Organization helper function (avoids infinite recursion)
CREATE OR REPLACE FUNCTION get_user_org_id(uid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = uid LIMIT 1;
$$;

-- Organizations: separate INSERT/SELECT policies
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id = get_user_org_id(auth.uid()));
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id = get_user_org_id(auth.uid()));
CREATE POLICY "org_delete" ON organizations FOR DELETE USING (id = get_user_org_id(auth.uid()));

-- Org Members: user can see own membership + org mates
CREATE POLICY "members_insert" ON org_members FOR INSERT WITH CHECK (user_id = auth.uid() OR org_id = get_user_org_id(auth.uid()));
CREATE POLICY "members_select" ON org_members FOR SELECT USING (user_id = auth.uid() OR org_id = get_user_org_id(auth.uid()));
CREATE POLICY "members_update" ON org_members FOR UPDATE USING (org_id = get_user_org_id(auth.uid()));
CREATE POLICY "members_delete" ON org_members FOR DELETE USING (org_id = get_user_org_id(auth.uid()));
```

### 3e. First User Setup

After creating your account through the app's registration page, run this SQL to verify the organization was auto-created:

```sql
-- Check if org was created
SELECT * FROM organizations;
SELECT * FROM org_members;
```

If the tables are empty (auto-provisioning can fail due to RLS), manually set up your admin:

```sql
-- 1. Find your user ID
SELECT id, email FROM auth.users;

-- 2. Create organization (replace YOUR_USER_ID)
INSERT INTO organizations (name, created_by)
VALUES ('My Organization', 'YOUR_USER_ID');

-- 3. Find the org ID
SELECT id FROM organizations;

-- 4. Create admin membership (replace both IDs)
INSERT INTO org_members (org_id, user_id, role, invited_by)
VALUES ('YOUR_ORG_ID', 'YOUR_USER_ID', 'admin', 'YOUR_USER_ID');
```

## 4. Run Development Server

```bash
npm run dev
```

Opens at `http://localhost:5173` (Vite default).

## 5. Build for Production

```bash
npm run build
```

This runs `tsc` (TypeScript check) + `vite build`. Output goes to `dist/`.

## 6. Preview Production Build

```bash
npm run preview
```

Serves the `dist/` folder locally for testing.

---

## 7. Claude AI Setup (Optional — IT Agent Code Generation)

The IT Agent can use Claude AI for context-aware code generation. This requires:

### 7a. Deploy the Claude Proxy Edge Function

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the edge function (no JWT required — it uses Supabase auth internally)
npx supabase functions deploy claude-proxy --no-verify-jwt
```

### 7b. Set the Anthropic API Key

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Get your API key at [console.anthropic.com](https://console.anthropic.com). Ensure your account has credits loaded.

### 7c. Store the Codebase Manifest

1. Navigate to **Settings → Manifest** in the app
2. Click **Generate & Store Manifest**
3. Click **Lock as Baseline** to freeze the manifest as the project's source of truth
4. Verify the Claude AI status shows "Connected"

### 7d. Test It

Chat with the IT Agent: "Use smart_code_task to explain the current architecture"

If you see a credit balance error, add credits at [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing).

---

## 8. Deploy Integration & Platform Edge Functions

### 8a. Stripe Proxy (Payments)

```bash
npx supabase functions deploy stripe-proxy --no-verify-jwt
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Configure in **Settings → Integrations → Stripe**. Use `sk_test_` for testing.

### 8b. Email Proxy (SendGrid)

```bash
npx supabase functions deploy email-proxy --no-verify-jwt
npx supabase secrets set SENDGRID_API_KEY=SG.xxxxx
```

Configure in **Settings → Integrations → SendGrid**. Once connected, the Sales agent's `draft_email` tool can send real emails with `send_now=true`.

### 8c. Webhook Handler (Inbound Webhooks)

```bash
npx supabase functions deploy webhook-handler --no-verify-jwt
```

Webhook URL: `https://<project-ref>.supabase.co/functions/v1/webhook-handler?integration=stripe`

Register this URL in your Stripe/SendGrid/Slack dashboard.

### 8d. REST API

```bash
npx supabase functions deploy api --no-verify-jwt
```

API base: `https://<project-ref>.supabase.co/functions/v1/api/{entity}`

Supports: `leads`, `contacts`, `orders`, `opportunities`, `accounts`, `products`

Auth: `X-API-Key: rk_...` header (generate keys in Settings → System).

### 8e. Tenant Provisioning

```bash
npx supabase functions deploy provision-tenant
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`POST /functions/v1/provision-tenant` with `{ email, password, orgName, plan }` to create a new tenant programmatically.

---

## 9. SQL Migrations (v6 additions)

Run in order in Supabase SQL Editor after the base tables:

```bash
# supabase/migrations/003_workflows.sql  — workflow_runs table
# supabase/migrations/004_api_keys.sql   — api_keys, rate limits
# supabase/migrations/005_observability.sql — agent_traces, feature flags constraint
```

Each migration is **idempotent** — safe to re-run.

---

## 10. Running Tests

```bash
npm test              # Run all 45 unit tests
npm run test:watch    # Watch mode for development
npm run test:coverage # With code coverage report
```

Tests cover: EventBus, MeetingOrchestrator (@mention parsing, routing), Integration adapters (Stripe, SendGrid, Slack), and WorkflowEngine (conditions, steps, error handling).

---

## Deployment (Vercel)

The live demo is deployed on **Vercel**:

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
3. Vercel auto-detects Vite and builds on push

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Database not connected" | `initializeDatabase()` not called | Ensure component calls `initializeDatabase(user.id)` on mount |
| "User ID not set" | DatabaseService not initialized | Same as above |
| Sidebar shows "MEMBER" not "ADMIN" | org_members table empty or wrong role | Run manual INSERT SQL (step 3e) |
| Settings nav item missing | User role is not 'admin' | Check org_members.role = 'admin' |
| Infinite recursion error (42P17) | RLS policy references itself | Use `get_user_org_id()` function (step 3d) |
| 403 Forbidden on insert | RLS INSERT policy blocks | Check INSERT policy uses `WITH CHECK` not `USING` |
| Console shows repeated API calls | useEffect dependency causes re-renders | Use `useCallback` with primitive dependencies + `useRef` guard |
| Agent says "API key not configured" | Missing VITE_GEMINI_API_KEY | Add to `.env` and restart dev server |
| Claude returns "credit balance too low" | Anthropic account has no credits | Add credits at console.anthropic.com |
| Claude proxy 400 error | API key invalid or expired | Re-set: `npx supabase secrets set ANTHROPIC_API_KEY=...` |
| Claude shows "unavailable" | Edge function not deployed | Deploy: `npx supabase functions deploy claude-proxy --no-verify-jwt` |
| GoTrueClient warnings in console | Multiple Supabase client instances | Non-critical — can be ignored |
