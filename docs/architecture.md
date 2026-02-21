# Architecture & System Design

## High-Level Architecture

BeardForce follows a **client-side AI orchestration** pattern. The React frontend talks directly to two external services:

```
┌─────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth     │  │  Org     │  │  Store   │  │ Router │ │
│  │  Context  │  │  Context │  │  Context │  │        │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │             │              │      │
│  ┌────┴──────────────┴─────────────┴──────────────┴──┐  │
│  │              Component Layer (UI)                   │  │
│  │  Layout · AgentChats · Dashboard · DataBrowser etc  │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────┴───────────────────────────────┐  │
│  │              Service Layer                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │  │
│  │  │ Agents   │  │ Database │  │ Access Control │   │  │
│  │  │ (4 AI)   │  │ Service  │  │                │   │  │
│  │  └────┬─────┘  └────┬─────┘  └───────┬────────┘   │  │
│  └───────┼──────────────┼────────────────┼────────────┘  │
└──────────┼──────────────┼────────────────┼───────────────┘
           │              │                │
     ┌─────┴─────┐  ┌────┴──────┐   ┌────┴──────┐
     │  Google   │  │ Supabase  │   │ Supabase  │
     │  Gemini   │  │ Database  │   │ Auth      │
     │  API      │  │ (Postgres)│   │           │
     └───────────┘  └───────────┘   └───────────┘
```

## Design Patterns

### 1. Adapter Pattern — Database Layer

The database layer is designed for portability. An **abstract base class** (`DatabaseAdapter`) defines every operation (CRUD, schema, batch, search). The `SupabaseAdapter` implements it for Supabase. A new adapter (e.g., `MySQLAdapter`) could be plugged in by extending the base class and changing the config in `services/database/index.ts`.

```
DatabaseAdapter (abstract)
    │
    ├── SupabaseAdapter  ← currently used
    ├── (PostgreSQLAdapter)  ← future
    └── (SQLiteAdapter)  ← future

DatabaseService (facade)
    └── wraps any adapter, adds org_id + user_id injection + business logic
```

**Key file:** `services/database/DatabaseAdapter.ts`

### 2. Facade Pattern — DatabaseService

Components never talk to the adapter directly. The `DatabaseService` class wraps the adapter with:
- **Automatic `org_id` injection** — every CRM query is scoped to the current org (team-shared); `user_id` also injected for audit trail
- **Automatic `user_id` injection** — system tables (ai_budget, snapshots) remain user-scoped
- **Entity-specific methods** — `createLead()`, `getContacts()`, etc.
- **Business logic** — AI budget tracking, snapshot/restore, change logging, system config
- `setOrgId(orgId)` called from `OrgContext` after org loads; `getOrgId()` falls back to `userId` for solo users

**Key file:** `services/database/DatabaseService.ts`

### 3a. Multi-Tenancy Model (Slack-style)

Every company that signs up gets its own isolated workspace:

```
User signs up
  └── Auto-provisioned Organization created (via OrgContext)
  └── User added to org_members as admin
  └── All CRM data tagged with org_id (via RLS)

Admin invites teammate
  └── org_invites record created (token = 32 random bytes)
  └── Shareable link: /accept-invite?token=xxx
  └── Invitee visits link (no login required to view)
       ├── Already logged in → one-click Accept → joined org
       └── Not logged in → stores token in localStorage
                         → redirects to /login or /register
                         → after login, OrgContext auto-accepts

Teammate now in same org
  └── get_user_org_id() returns same org_id
  └── RLS policies filter all CRM tables to that org
  └── All team members see shared leads, contacts, etc.
```

**Key files:**
- `services/accessControl.ts` — `createInvite`, `acceptInvite`, `getPendingInvites`
- `context/OrgContext.tsx` — auto-provisioning + pending invite check
- `components/AcceptInvitePage.tsx` — public invite acceptance page
- `supabase/migrations/006_org_invites_and_org_scope.sql` — table + RLS

### 3. Context API — Global State

Three React Context providers manage application state:

| Context | File | Responsibility |
|---------|------|---------------|
| `AuthContext` | `context/AuthContext.tsx` | Current user, session, sign in/out |
| `OrgContext` | `context/OrgContext.tsx` | Organization, membership role, auto-provisioning |
| `StoreContext` | `context/StoreContext.tsx` | CRM data (leads, tickets, etc.), CRUD actions, logging |

**Provider nesting order** (in `App.tsx`):
```
<AuthProvider>
  <OrgProvider>
    <Router>
      ...
    </Router>
  </OrgProvider>
</AuthProvider>
```

### 4. Function Calling — AI Tool Execution

Agents use Gemini's **function calling** feature. Each agent declares its tools as JSON schemas (parameters, descriptions). When a user sends a message:

```
User message
    │
    ▼
Agent.sendMessage(text)
    │
    ├── Build Gemini request (system prompt + tools + history)
    │
    ▼
Gemini API
    │
    ├── If text response → return to user
    │
    ├── If function call detected:
    │       │
    │       ▼
    │   Agent executes tool locally
    │       │ (database write, code gen, etc.)
    │       │
    │       ▼
    │   Result sent back to Gemini
    │       │
    │       ▼
    │   Gemini generates final response
    │
    ▼
Response displayed in chat UI
```

This loop can repeat (multi-turn tool calling) if Gemini needs to call multiple tools in sequence.

### 5. Singleton — Database Instance

`services/database/index.ts` creates a single `DatabaseService` instance exported as `databaseService`. All components and agents share this instance. The `initializeDatabase(userId)` function must be called once per session to set the user context.

```typescript
// services/database/index.ts
const adapter = new SupabaseAdapter(config);
export const databaseService = new DatabaseService(adapter);

export async function initializeDatabase(userId: string) {
  databaseService.setUserId(userId);
  await databaseService.connect();
  return databaseService;
}
```

## Data Flow

### Agent Chat Flow

```
User types message in chat
    │
    ▼
AgentChat component calls agent.sendMessage(text)
    │
    ▼
Agent builds request:
  - System prompt (agent personality + instructions)
  - Tool declarations (JSON schemas)
  - Conversation history
    │
    ▼
Gemini API processes request
    │
    ├── Direct text response
    │       → displayed as agent message
    │
    └── Function call response
            │
            ▼
        Agent maps function name to handler
            │
            ▼
        Handler executes operation:
          - DatabaseService.createLead(...)
          - DatabaseService.getAdapter().getTableSchema(...)
          - Generate code snippet
          - etc.
            │
            ▼
        Result sent back to Gemini for final response
            │
            ▼
        Agent message displayed in chat
```

### Authentication Flow

```
User visits any route
    │
    ▼
PrivateRoute checks AuthContext
    │
    ├── No session → redirect to /login
    │
    └── Valid session
            │
            ▼
        OrgContext loads membership
            │
            ├── Has membership → set role (admin/editor/viewer)
            │
            └── No membership → auto-provision org + admin role
                    │
                    ▼
                Layout renders with role-based sidebar items
```

### Database Query Flow

```
Component needs data (e.g., DataBrowser)
    │
    ▼
Call initializeDatabase(user.id) — sets user context
    │
    ▼
Call databaseService.getLeads() (or similar)
    │
    ▼
DatabaseService auto-injects user_id filter
    │
    ▼
SupabaseAdapter builds Supabase query
    │
    ▼
Supabase client sends request to Supabase API
    │
    ▼
PostgreSQL executes query (with RLS enforcement)
    │
    ▼
Results returned → displayed in UI
```

## Routing Architecture

All authenticated routes are wrapped in `<PrivateRoute><Layout /></PrivateRoute>`, which provides the sidebar navigation shell. The `<Outlet />` in Layout renders the matched child route.

```
/login                → LoginPage (public)
/register             → RegisterPage (public)
/                     → redirects to /dashboard

/dashboard            → DashboardPage (Executive Board)
/it-agent             → ITAgentChat
/sales-agent          → SalesAgentChat
/marketing-agent      → MarketingAgentChat
/ceo-agent            → CEOAgentChat
/voice                → VoiceAgentHub
/approvals            → ApprovalQueue
/leads                → LeadManagement
/settings             → SettingsPage (admin only)
/database/:tableName  → DataBrowser (dynamic — serves 6 tables)
```

## Environment Variables

The app requires three environment variables set in a `.env` file:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `VITE_GEMINI_API_KEY` | Yes | Google Gemini API key |

These are loaded via Vite's `import.meta.env` mechanism. The `VITE_` prefix is required for client-side exposure.

## Claude AI Integration (v4)

### Hybrid Architecture

```
User asks IT Agent a code question
    │
    ▼
Gemini 2.0 Flash (chat routing)
    │
    ├── Selects tool: smart_code_task / generate_component / etc.
    │
    ▼
claudeService.generateCode()
    │
    ├── Loads Codebase Manifest from Supabase (compressed project spec)
    ├── Loads recent Structured Changes (delta context)
    ├── Builds system prompt + user prompt
    │
    ▼
Supabase Edge Function (claude-proxy)
    │
    ├── Reads ANTHROPIC_API_KEY from secrets (never exposed to browser)
    ├── Proxies request to api.anthropic.com
    │
    ▼
Claude Sonnet generates context-aware code
    │
    ▼
Result returned to IT Agent → displayed in chat
    │
    └── Logged to structured_changes table
```

### Key Files
- `services/claudeService.ts` — Prompt construction + API communication
- `services/manifestService.ts` — Manifest CRUD + change log + serialization
- `supabase/functions/claude-proxy/index.ts` — Deno edge function proxy
- `components/settings/ManifestTab.tsx` — Manifest management UI

### Fallback Strategy
Every Claude-powered tool has a template fallback. If Claude returns an error (no credits, network failure, etc.), the tool generates a scaffold using built-in template functions. The error is surfaced to the user with clear guidance.

## Security Model

1. **Supabase RLS** — All CRM tables have Row Level Security policies. Users can only see their own data (filtered by `user_id = auth.uid()`).
2. **Organization-scoped access** — Org members tables use a `SECURITY DEFINER` function `get_user_org_id()` to avoid infinite recursion in RLS policies.
3. **Client-side role gating** — `useOrg()` provides `isAdmin` / `isEditor` flags. Admin-only UI (Settings, member management) is conditionally rendered.
4. **Auth guard** — `PrivateRoute` component redirects unauthenticated users to `/login`.
5. **User-scoped data** — `DatabaseService` automatically injects `user_id` into every create/read operation.
6. **Server-side API keys** — The Anthropic API key is stored as a Supabase Edge Function secret, never exposed to the client browser.
