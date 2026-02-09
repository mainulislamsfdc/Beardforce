# UI Components Guide

## Overview

All components live in the `components/` directory. The app uses **React 18** with **TypeScript** and **Tailwind CSS** (dark theme). Components are functional, using hooks for state and context.

### Theme Conventions

The entire UI follows a dark theme palette:

| Element | Tailwind Classes |
|---------|-----------------|
| Page background | `bg-gray-900` |
| Card / panel | `bg-gray-800` |
| Borders | `border-gray-700` |
| Primary text | `text-white` |
| Secondary text | `text-gray-400` |
| Muted text | `text-gray-500` |
| Row hover | `hover:bg-gray-700/30` |
| Input fields | `bg-gray-700 border-gray-600 text-white` |
| Accent (brand) | `bg-orange-500` / `text-orange-400` |
| Active nav item | `bg-gray-700 text-white` or `text-orange-400` |

---

## Layout System

### Layout (`components/Layout.tsx`)

The app shell. Wraps all authenticated pages with a sidebar and top bar.

**Structure:**
```
┌──────────┬──────────────────────────────┐
│ Sidebar  │  Top Bar (toggle + breadcrumb)│
│          ├──────────────────────────────┤
│ Logo     │                              │
│ Nav      │     <Outlet /> (page)        │
│ User     │                              │
│ Sign Out │                              │
└──────────┴──────────────────────────────┘
```

**Key features:**
- **Collapsible sidebar** — `sidebarOpen` state, toggled via PanelLeftClose/PanelLeftOpen button
- **Collapsible Database section** — `dbSectionOpen` state (default `false`), ChevronDown/ChevronRight toggle
- **Role badge** — Shows admin (orange), editor (blue), or viewer (gray)
- **Admin-only Settings** — Only shown when `isAdmin` from `useOrg()`
- **Active route highlighting** — Uses `isActive(path)` with `startsWith` for nested routes
- **Breadcrumb** — Top bar shows current page label, with special handling for `/database/:tableName` routes
- Uses `<Outlet />` from React Router for rendering child routes

### PrivateRoute (`components/PrivateRoute.tsx`)

Auth guard wrapper. Checks `useAuth()` for a valid user. Redirects to `/login` if not authenticated. Shows a loading spinner while auth state is resolving.

---

## Dashboard

### DashboardPage (`components/DashboardPage.tsx`)

The "Executive Board" landing page. Displays:

1. **Agent Grid** — 2x2 grid of cards, one per agent (IT, Sales, Marketing, CEO)
   - Each card shows: initials avatar, role label, title, icon
   - Click navigates to the agent's chat page
   - Hover effects: gradient overlay opacity increase, avatar scale-up

2. **System Status Panel** — Shows:
   - Agents Online (4)
   - Tools Available (48+)
   - Pending Approvals (count)
   - AI Budget status

3. **Quick Actions** — Links to Voice Interface, Manage Leads, Approvals

---

## Agent Chat Components

All four agent chat components follow the same pattern:

### Common Pattern

```
┌──────────────────────────────────────┐
│  Agent Name + Capabilities Dropdown  │
├──────────────────────────────────────┤
│                                      │
│  Chat Message History                │
│  (scrollable, auto-scroll to bottom) │
│                                      │
├──────────────────────────────────────┤
│  [Input field]  [Send button]        │
└──────────────────────────────────────┘
```

**Shared behavior:**
- Maintains message history array (`ChatMessage[]`)
- Initializes agent + database on mount
- Shows loading indicator while agent processes
- Capabilities list shows available tools (collapsible)
- Auto-scrolls to latest message

### ITAgentChat (`components/ITAgentChat.tsx`)

- Uses `ITAgent` class (requires `DatabaseService` injection)
- 14 capability descriptions shown
- Supports database CRUD, schema modification, code generation, snapshots

### SalesAgentChat (`components/SalesAgentChat.tsx`)

- Uses `salesAgent` singleton
- Shows sales-specific capabilities (lead creation, pipeline management, forecasting)

### MarketingAgentChat (`components/MarketingAgentChat.tsx`)

- Uses `marketingAgent` singleton
- Shows marketing capabilities (campaigns, emails, social posts, Google Ads)

### CEOAgentChat (`components/CEOAgentChat.tsx`)

- Uses `ceoAgent` singleton
- Shows executive capabilities (dashboards, budget review, agent coordination)

---

## Data & Management Components

### DataBrowser (`components/DataBrowser.tsx`)

Universal table viewer. Reads `:tableName` from URL params and renders any CRM table.

**Features:**
- Schema-driven columns via `adapter.getTableSchema(tableName)`
- Data fetching via entity-specific methods (e.g., `databaseService.getLeads()`)
- Client-side search across all visible columns
- Column header click to sort (asc/desc toggle)
- Pagination (20 rows/page) with Previous/Next buttons
- Hides `user_id` column, shortens UUID `id` to first 8 characters
- Row numbers, record count, matching count on search
- Refresh button, loading spinner, empty state, error state

**Supported tables:** leads, contacts, accounts, opportunities, orders, products

**Key fix:** Uses `useCallback` with `[tableName, user?.id]` + `loadingRef` guard to prevent infinite re-render loops.

### LeadManagement (`components/LeadManagement.tsx`)

Dedicated lead management page with richer interaction than DataBrowser:
- Lead list with status filters
- Add new lead form
- Edit lead inline
- Status update buttons
- Lead qualification

### ApprovalQueue (`components/ApprovalQueue.tsx`)

Displays pending change requests from the `change_log` table:
- List of pending approvals
- Approve / Reject buttons
- Shows agent name, change type, description, timestamp

### VoiceAgentHub (`components/VoiceAgentHub.tsx`)

Voice interface using Gemini's live audio API:
- Microphone input with Web Speech API
- Audio playback of agent responses
- Agent selector (which agent to talk to)
- Transcript display

**Status:** Currently non-functional; planned for overhaul in v3.

### SettingsPage (`components/SettingsPage.tsx`)

Admin-only settings page with three tabs:

1. **Access Management** — View/edit org members, change roles, invite new members
2. **System Settings** — Configuration options
3. **Rollback** — Create snapshots, list snapshots, restore to previous state, factory reset

---

## Auth Components

### LoginPage (`components/LoginPage.tsx`)

- Email + password form
- "Sign In" button
- Link to registration
- Error display
- Uses `useAuth().signIn()`

### RegisterPage (`components/RegisterPage.tsx`)

- Email + password + confirm password form
- "Create Account" button
- Link to login
- Auto-creates organization on signup (via AuthContext)
- Uses `useAuth().signUp()`

---

## Component Dependencies

```
App.tsx
 ├── AuthProvider (context)
 │    └── OrgProvider (context)
 │         └── Router
 │              ├── LoginPage
 │              ├── RegisterPage
 │              └── PrivateRoute → Layout
 │                   ├── DashboardPage
 │                   ├── ITAgentChat → ITAgent → DatabaseService
 │                   ├── SalesAgentChat → salesAgent (singleton)
 │                   ├── MarketingAgentChat → marketingAgent (singleton)
 │                   ├── CEOAgentChat → ceoAgent (singleton)
 │                   ├── VoiceAgentHub → geminiService
 │                   ├── LeadManagement → databaseService
 │                   ├── ApprovalQueue → databaseService
 │                   ├── SettingsPage → accessControl + databaseService
 │                   └── DataBrowser → databaseService
```

---

## Adding a New Page

1. Create `components/MyPage.tsx` as a functional component
2. Use dark theme classes (`bg-gray-900`, `bg-gray-800`, etc.)
3. Import in `App.tsx`, add a `<Route>` inside the Layout wrapper
4. Add nav item in `Layout.tsx` navItems array (choose section: main, Agents, Management, or Database)
5. If it needs database access, call `initializeDatabase(user.id)` on mount
