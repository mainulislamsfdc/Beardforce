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
    └── wraps any adapter, adds user_id injection + business logic
```

**Key file:** `services/database/DatabaseAdapter.ts`

### 2. Facade Pattern — DatabaseService

Components never talk to the adapter directly. The `DatabaseService` class wraps the adapter with:
- **Automatic `user_id` injection** — every query is scoped to the current user
- **Entity-specific methods** — `createLead()`, `getContacts()`, etc.
- **Business logic** — AI budget tracking, snapshot/restore, change logging, system config

**Key file:** `services/database/DatabaseService.ts`

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

## Security Model

1. **Supabase RLS** — All CRM tables have Row Level Security policies. Users can only see their own data (filtered by `user_id = auth.uid()`).
2. **Organization-scoped access** — Org members tables use a `SECURITY DEFINER` function `get_user_org_id()` to avoid infinite recursion in RLS policies.
3. **Client-side role gating** — `useOrg()` provides `isAdmin` / `isEditor` flags. Admin-only UI (Settings, member management) is conditionally rendered.
4. **Auth guard** — `PrivateRoute` component redirects unauthenticated users to `/login`.
5. **User-scoped data** — `DatabaseService` automatically injects `user_id` into every create/read operation.
