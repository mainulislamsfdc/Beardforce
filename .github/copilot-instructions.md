# Beardforce CRM - AI Agent Instructions

## Architecture Overview

**Beardforce** is a **role-based autonomous CRM dashboard** built with React + TypeScript + Vite, featuring AI-driven workflow automation via Google Gemini, Firebase backend support, and dynamically generated custom modules.

### Core Data Flow
```
User Login (Auth.tsx) 
  → Firebase/LocalStorage Auth (DatabaseService)
  → StoreContext loads user + config
  → App.tsx renders role-specific dashboards
  → Components dispatch actions through StoreContext
  → DatabaseService persists to Firebase or localStorage
```

## Project Structure & Key Files

### Root Files
- **App.tsx**: Main routing logic with 3-stage initialization (loading → auth check → config check → main app). Uses `currentView` state to render conditional UI for 10+ dashboard views.
- **package.json**: React 18, Vite 5, Firebase 10, Recharts for graphs, Tailwind CSS, TypeScript strict mode enabled.
- **vite.config.ts**: React plugin configured; loads `process.env.API_KEY` from environment.

### Context & State Management (`context/`)
- **StoreContext.tsx**: Single source of truth for all app state. Manages users, leads, campaigns, tickets, expenses, custom pages, logs, traces, metrics. Provides `useStore()` hook used throughout. Init happens in `useEffect` via `DatabaseService.initialize()`.

### Services (`services/`)
- **db.ts**: Dual-mode persistence layer. Auto-detects Firebase config in localStorage; falls back to localStorage simulation. Contains `DatabaseService` class (static methods for login, register, CRUD operations). Default backdoor for local dev: `admin@test.com` / `123`.
- **geminiService.ts**: Integrates Google Gemini API. Defines tool declarations (createTicket, createLead, createCampaign, changeDashboard, getRecentItems, deployAppModule, logChangeRequest). Used by IDE/MeetingRoom for AI-driven chat interactions.

### Components (`components/`)
- **Auth.tsx**: Login/register form. Calls `DatabaseService.login/register()`, updates `StoreContext` via `setUser()`.
- **Sidebar.tsx**: Navigation hub. Hard-coded nav items (meeting, ceo, sales, marketing, it, projects) + dynamic custom pages rendered from `customPages[]`. Handles logout.
- **DynamicPageRenderer.tsx**: Renders custom modules. Accepts `DynamicPage` object with widgets (header, form, chart, list). Forms call `executeAction()` from store to trigger arbitrary business logic.
- **IDE.tsx**: AI chat interface. Calls Gemini API with tool declarations, handles tool call responses. Central AI automation hub.
- **MeetingRoom.tsx**: Real-time collaboration space. Calls Gemini for multi-agent conversations with specific agent personalities (CEO, Sales, Marketing, IT).
- **Dashboards** (`components/dashboards/`):
  - **CEOView.tsx**: Executive metrics (total leads, revenue, campaign performance).
  - **SalesView.tsx**: Lead pipeline, conversion rates, sales forecasts.
  - **MarketingView.tsx**: Campaign ROI, engagement metrics.
  - **ITView.tsx**: System logs, traces, metrics dashboard (observability).

## Data Model (`types.ts`)

### Core Entities
```typescript
User { id, email, name, role: 'admin'|'viewer' }
Lead { id, name, email, value, status: 'New'|'Contacted'|'Qualified', source }
Campaign { id, name, platform, budget, status, clicks, conversions }
Ticket { id, title, description, assignee, status: TicketStatus, createdAt }
Expense { id, category, amount, description, date }
DynamicPage { id, name, icon, widgets: PageWidget[] }
```

### System Observability
```typescript
SystemLog { id, timestamp, action, agent, level: 'info'|'warn'|'error' }
Trace { id, timestamp, agent, operation, duration, status }
Metric { id, name, value, unit, timestamp }
```

## Critical Workflows

### Authentication & Initialization
1. **Local dev**: Default user `admin@test.com` / password `123` works in localStorage mode.
2. **Firebase**: If `AppConfig.firebaseConfig` exists in localStorage, `DatabaseService` initializes Firebase and uses real auth.
3. **First-time setup**: After login, user sees `SetupWizard` if `config` is null. Wizard creates initial `AppConfig` with business name, industry, agent names, theme color.

### Adding Data
- All CRUD operations flow through `StoreContext` methods: `addLead()`, `addTicket()`, `addCampaign()`, etc.
- Each adds to in-memory state AND calls `DatabaseService.insert()` for persistence.
- `DatabaseService.insert()` auto-routes to Firebase `addDoc()` or localStorage.

### AI Automation (Gemini Integration)
- **IDE Component** and **MeetingRoom** instantiate Gemini client with tool declarations.
- User prompts trigger multi-turn conversations with AI.
- AI can call tools (e.g., `createTicket`, `changeDashboard`) which are mapped to StoreContext actions.
- Tool responses feed back into conversation loop.

### Custom Module Deployment
- Users can create **custom pages** with widgets (forms, charts, lists).
- `DynamicPageRenderer` dynamically renders these based on `PageWidget` schema.
- Forms call `executeAction(actionName, data)` to trigger arbitrary backend logic.

## Styling & Design Conventions

- **Dark theme**: Slate 950/900 backgrounds, amber 500 accent color (customizable via `AppConfig.themeColor`).
- **Tailwind CSS** for all styling. No CSS modules or styled-components.
- **Icons**: Lucide React for consistent icon library.
- **Charts**: Recharts for data visualization (bar, pie, line charts).
- **Responsive**: Flexbox-based layout. Sidebar + main area on desktop. Mobile-friendly with hidden elements (`hidden md:block`).

## Important Patterns & Conventions

### useStore Hook Pattern
```tsx
const { user, config, currentView, leads, addLead, navigateTo } = useStore();
```
All components use this pattern. Never pass props deeply; prefer store context.

### Component Structure
1. Props interface (if any).
2. Hook calls at top (`useStore`, `useState`, `useEffect`).
3. Event handlers defined as `const handleX = async () => {}`.
4. JSX return with Tailwind classes. Avoid inline styles.

### Error Handling
- Try/catch in async operations; set error state.
- User-facing errors displayed via toast or inline error messages.
- System errors logged via `addLog(action, agent, 'error')`.

### Type Safety
- Strict TypeScript enabled in `tsconfig.json`.
- All entities have `id` and timestamp fields.
- Use enums for statuses: `TicketStatus`, `AgentRole`.

## Build & Development

### Scripts
- `npm install`: Install dependencies.
- `npm run dev`: Start Vite dev server (http://localhost:5173).
- `npm run build`: TypeScript check + Vite production build.
- `npm run preview`: Preview production build locally.

### Environment Variables
- `GEMINI_API_KEY` must be set in `.env.local` for Gemini features. (Loaded via `vite.config.ts` define plugin; accessed as `process.env.API_KEY` or passed to Gemini client initialization.)

### Firebase Setup
- If using Firebase, create a config object with `apiKey`, `authDomain`, `projectId`, etc.
- Pass to `SetupWizard` and save in `AppConfig.firebaseConfig` in localStorage.
- `DatabaseService` auto-initializes Firebase on app load if config exists.

## Common Tasks

### Adding a New Dashboard View
1. Create component in `components/dashboards/NewDashView.tsx`.
2. Export it from the component.
3. Add case to `App.tsx` renderView switch.
4. Add nav item to Sidebar.tsx navItems array.
5. Use `navigateTo('new-dash')` to trigger navigation.

### Creating a Custom Form Widget
1. In `DynamicPageRenderer.tsx`, extend the `WidgetRenderer` switch to handle new widget types.
2. Define `PageWidget` type in `types.ts` with appropriate `config` properties.
3. Call `executeAction(actionName, formData)` from StoreContext to persist.

### Integrating New Gemini Tools
1. Define tool schema in `geminiService.ts` (FunctionDeclaration).
2. Add tool handler in IDE.tsx or MeetingRoom.tsx (in tool call response handler).
3. Map tool calls to `StoreContext` actions (e.g., `addLead()`, `navigateTo()`).

### Debugging Local Storage Data
- Open browser DevTools → Application → Local Storage.
- Keys prefixed with `bf_crm_db_` (e.g., `bf_crm_db_config`, `bf_crm_db_user`).
- Parse JSON to inspect persisted state.

## Notes for AI Agents

- **Preserve state structure**: Never flatten nested objects in `AppConfig` or `DynamicPage` without updating all readers.
- **Consistency**: Always use `StoreContext` for state mutations; never manage local component state for shared data.
- **Database dual-mode**: When testing, understand that localStorage mode is deterministic; Firebase mode depends on network.
- **Gemini API errors**: Check `GEMINI_API_KEY` and network. Tool calls that fail should gracefully degrade.
- **Custom page icons**: Must match keys in `Sidebar.tsx` iconMap (e.g., 'box', 'database', 'activity', 'globe', 'server', 'briefcase').
