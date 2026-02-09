# BeardForce CRM - Developer Documentation

## What is BeardForce?

BeardForce is an **AI-powered multi-agent CRM** built for men's beard & grooming products. Instead of traditional menu-driven CRM workflows, users interact with four specialized AI agents — CEO, Sales Manager, Marketing Manager, and IT Manager — who collaborate to manage the entire business pipeline.

Each agent has its own domain expertise, a dedicated set of tools, and the ability to read/write to a shared Supabase database. Users can chat with any agent in natural language, and the agent will execute real database operations, generate code, or provide strategic analysis.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | SPA with type safety |
| **Styling** | Tailwind CSS 3 | Utility-first dark theme |
| **Build** | Vite 5 | Fast dev server + bundler |
| **AI** | Google Gemini 2.0 Flash | LLM for all 4 agents |
| **Backend** | Supabase (PostgreSQL) | Database, Auth, RLS |
| **Auth** | Supabase Auth | Email/password, sessions |
| **Charts** | Recharts | Dashboard visualizations |
| **Icons** | Lucide React | Consistent iconography |
| **Routing** | React Router 7 | Client-side navigation |

## Project Structure

```
Beardforce-main/
├── docs/                          # Developer documentation (you are here)
│   ├── README.md                  # This file — master overview
│   ├── architecture.md            # System design & data flow diagrams
│   ├── agents.md                  # AI agent system & tool reference
│   ├── database.md                # Schema, adapters, service layer
│   ├── components.md              # UI components guide
│   ├── auth-and-access.md         # Authentication & RBAC
│   ├── setup.md                   # Local dev setup & environment
│   └── api-reference.md           # Full tool & method reference
│
├── components/                    # React UI components
│   ├── Layout.tsx                 # Sidebar + top bar shell
│   ├── DashboardPage.tsx          # Executive meeting room
│   ├── ITAgentChat.tsx            # IT Manager chat interface
│   ├── SalesAgentChat.tsx         # Sales Manager chat interface
│   ├── MarketingAgentChat.tsx     # Marketing Manager chat interface
│   ├── CEOAgentChat.tsx           # CEO chat interface
│   ├── VoiceAgentHub.tsx          # Voice/audio interface
│   ├── LeadManagement.tsx         # Lead CRUD page
│   ├── ApprovalQueue.tsx          # Change request approvals
│   ├── SettingsPage.tsx           # Admin settings (3 tabs)
│   ├── DataBrowser.tsx            # Universal database table viewer
│   ├── LoginPage.tsx              # Login form
│   ├── RegisterPage.tsx           # Registration form
│   └── PrivateRoute.tsx           # Auth guard wrapper
│
├── context/                       # React Context providers
│   ├── AuthContext.tsx             # Supabase auth state
│   ├── OrgContext.tsx              # Organization & role state
│   └── StoreContext.tsx            # Global CRM data store
│
├── services/                      # Business logic & integrations
│   ├── agents/tools/              # AI agent implementations
│   │   ├── ITAgent.ts             # IT Manager (20 tools)
│   │   ├── SalesAgent.ts          # Sales Manager (12 tools)
│   │   ├── MarketingAgent.ts      # Marketing Manager (10 tools)
│   │   ├── CEOAgent.ts            # CEO Agent (10 tools)
│   │   └── itAgentTools.ts        # IT tool declarations for Gemini
│   ├── database/                  # Database abstraction layer
│   │   ├── DatabaseAdapter.ts     # Abstract base class
│   │   ├── SupabaseAdapter.ts     # Supabase implementation
│   │   ├── DatabaseService.ts     # Facade with business logic
│   │   └── index.ts               # Singleton export + init
│   ├── supabase/
│   │   └── client.ts              # Supabase client initialization
│   ├── auth/
│   │   └── authService.ts         # Auth wrapper functions
│   ├── accessControl.ts           # Organization & role management
│   ├── geminiService.ts           # Gemini API + audio streaming
│   └── db.ts                      # Legacy local/Firebase DB
│
├── types.ts                       # All TypeScript interfaces & enums
├── constants.ts                   # Agent colors, initial states
├── App.tsx                        # Route definitions
├── index.tsx                      # React entry point
├── index.html                     # HTML template + CDN imports
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── package.json                   # Dependencies & scripts
```

## Key Concepts

### 1. Multi-Agent Architecture
Four AI agents share a common database but have distinct responsibilities:
- **CEO Agent** — Strategic oversight, KPI dashboards, budget management, agent coordination
- **Sales Agent** — Lead qualification, pipeline management, opportunity tracking
- **Marketing Agent** — Campaign creation, audience segmentation, content planning
- **IT Agent** — Database CRUD, schema management, code generation, system snapshots

See [agents.md](agents.md) for detailed tool documentation.

### 2. Database Adapter Pattern
The database layer uses an **abstract adapter pattern** allowing the backend to be swapped between Supabase, PostgreSQL, MySQL, or SQLite without changing application code. Currently only the `SupabaseAdapter` is implemented.

See [database.md](database.md) for schema and API details.

### 3. Role-Based Access Control (RBAC)
Users belong to an **organization** with one of three roles: `admin`, `editor`, or `viewer`. Admins can access Settings, manage members, and see all data. Role enforcement happens both client-side (UI gating) and server-side (Supabase RLS policies).

See [auth-and-access.md](auth-and-access.md) for the full auth flow.

### 4. Gemini Function Calling
Agents don't just chat — they execute **real operations** via Gemini's function calling feature. Each agent declares its tools as JSON schemas. When Gemini detects a user's intent matches a tool, it returns a structured function call which the agent executes against the database.

See [architecture.md](architecture.md) for the data flow.

## Documentation Index

| Document | What It Covers |
|----------|---------------|
| [architecture.md](architecture.md) | System design, data flow, design patterns |
| [agents.md](agents.md) | AI agent system, tools, prompts, function calling |
| [database.md](database.md) | All 13 tables, adapter pattern, DatabaseService API |
| [components.md](components.md) | Every React component explained |
| [auth-and-access.md](auth-and-access.md) | Auth flow, RBAC, organizations, RLS policies |
| [setup.md](setup.md) | Environment setup, running locally, deployment |
| [api-reference.md](api-reference.md) | Complete tool & method reference |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/mainulislamsfdc/Beardforce.git
cd Beardforce
npm install

# 2. Set up environment variables (see docs/setup.md)
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY

# 3. Run Supabase SQL migrations (see docs/database.md)

# 4. Start development server
npm run dev
```

## Current Status

- **Version:** 2.0 (v2 core complete)
- **Agents:** 4 operational (48+ tools total)
- **Tables:** 13 Supabase tables
- **Auth:** Supabase email/password + RBAC
- **Live Demo:** https://beardforce.vercel.app

See [crm_project_tracker_v6.md](../crm_project_tracker_v6.md) for the full feature tracker and v3 roadmap.
