// ============================================================================
// CODEBASE MANIFEST SERVICE
// ============================================================================
// Manages the compressed codebase specification that gives AI agents
// full understanding of the project architecture, patterns, and conventions.
// Stored in Supabase so the IT Agent can read it as context for code generation.

import { supabase } from './supabase/client';
import type { CodebaseManifest, ManifestSection, StructuredChangeEntry } from '../types';

// ---------------------------------------------------------------------------
// The Manifest — a compressed, token-efficient specification of the codebase
// This is the single source of truth that Claude reads before writing code.
// ---------------------------------------------------------------------------

const MANIFEST_V3: ManifestSection[] = [
  {
    key: 'architecture',
    title: 'Architecture & Patterns',
    token_estimate: 400,
    content: `Stack: React 18 + TypeScript + Tailwind CSS + Vite + Supabase (PostgreSQL).
AI: Google Gemini 2.0 Flash for 4 agents (CEO, Sales, Marketing, IT). IT Agent also uses Claude Sonnet for code generation via claude-proxy Edge Function.
Gemini API: Key is server-side only — all agent requests proxy through gemini-proxy Supabase Edge Function (GEMINI_API_KEY secret). Never in browser.
State: React Context providers nested: AuthProvider > OrgProvider > AgentConfigProvider > BrandingProvider > FieldConfigProvider > NotificationProvider > Router.
Database: Adapter pattern — DatabaseAdapter (abstract) → SupabaseAdapter (impl) → DatabaseService (facade, auto-injects org_id + user_id).
Auth: Supabase Auth. Email confirmation required. user.user_metadata.full_name stores display name. Auto-org provisioning on signup.
Multi-tenant: Slack model — each company gets an isolated org. CRM data scoped by org_id via RLS (v7). All org members share CRM data.
Invite system: Admin generates invite link (token in org_invites table). Invitee opens /accept-invite?token=xxx. Pending token saved to localStorage for post-login auto-accept.
RLS: CRM tables use org_id = get_user_org_id() (SECURITY DEFINER). Org tables use separate INSERT/SELECT policies. get_user_org_id() avoids recursive RLS.
Agents: Gemini function calling. Each agent has ToolDefinition[] with name/description/parameters/handler. IT Agent uses @google/genai (newer SDK), others use @google/generative-ai.
White-label: AgentConfigContext (per-agent names/avatars/colors/voice), BrandingContext (app name/logo/colors), FieldConfigContext (per-entity field visibility/labels).
Routing: react-router-dom v7, lazy-loaded routes inside PrivateRoute > Layout shell. Public routes: /, /login, /register, /accept-invite, /terms, /privacy.
Mobile: Layout has mobile drawer sidebar (fixed overlay, -translate-x-full → translate-x-0) and desktop collapsible sidebar. md: breakpoint splits behaviors.
Styling: Dark theme — bg-gray-900 (page), bg-gray-800 (cards), bg-gray-700 (inputs), text-white (primary), text-gray-400 (secondary), border-gray-700. Accent: orange-500/600.
Icons: lucide-react. Charts: recharts. CSV: papaparse. Voice: Web Speech API.`
  },
  {
    key: 'file_map',
    title: 'File Map',
    token_estimate: 600,
    content: `ROOT:
App.tsx — Router + context provider nesting + lazy routes. Public routes: /, /login, /register, /accept-invite, /terms, /privacy. Protected routes inside PrivateRoute > Layout.
types.ts — All TypeScript interfaces: User, Lead, Contact, Account, Opportunity, Order, Product, Organization, OrgMember, OrgInvite, AgentConfig, OrgBranding, FieldConfig, CodebaseManifest, StructuredChangeEntry, ClaudeCodeRequest/Response, etc.

CONTEXT (context/):
AuthContext.tsx — useAuth(): user, session, signUp(email, password, fullName), signIn, signOut, resetPassword. user.user_metadata.full_name = display name.
OrgContext.tsx — useOrg(): org, role, isAdmin, isEditor, refresh(). Loads org_members. Calls databaseService.setOrgId(). Auto-accepts pending invite from localStorage.
AgentConfigContext.tsx — useAgentConfig(): getAgent(id), updateAgent(). Fallback defaults if no DB rows.
BrandingContext.tsx — useBranding(): branding, updateBranding(). Sets document.title.
FieldConfigContext.tsx — useFieldConfig(): getFieldConfig(entity, key), getVisibleFields().
NotificationContext.tsx — useNotifications(): notifications, unreadCount, toasts, addToast(), markAsRead().

DATABASE (services/database/):
DatabaseAdapter.ts — Abstract: CRUD, batch, schema ops (getTables, createTable, addColumn, etc), query, count, search.
SupabaseAdapter.ts — Implements all adapter methods. Filter ops: =, !=, >, <, >=, <=, LIKE, IN.
DatabaseService.ts — Facade. Entity methods: createLead/getLeads/etc. Injects org_id (RLS) + user_id (audit). setOrgId()/getOrgId() — falls back to userId if orgId not set. Has createSnapshot/restoreSnapshot/resetToDefault.
index.ts — Exports databaseService singleton + initializeDatabase(userId, orgId?).

AGENTS (services/agents/tools/):
CEOAgent.ts — 10 tools. Uses @google/generative-ai.
SalesAgent.ts — 12 tools. Lead CRUD, pipeline, quotes. Email via SendGrid integration.
MarketingAgent.ts — 10 tools. Campaigns, segmentation, content.
ITAgent.ts — 21 tools via itAgentTools.ts. DB management + Claude-powered code generation. Uses @google/genai.
itAgentTools.ts — ITAgentTool interface + ITAgentTools class with all handlers.
MeetingOrchestrator.ts — Multi-agent meetings: @mention parsing, turn-taking, voice synthesis.

SERVICES (services/):
accessControl.ts — Org RBAC: createOrganization, getCurrentMembership (order by joined_at desc limit 1), getOrgMembers, updateMemberRole, addMember. Invite: createInvite(→token), getPendingInvites, cancelInvite, acceptInvite(token,userId), getInviteDetails (RPC, unauthenticated).
agentConfigService.ts — CRUD for agent_config, org_branding, field_configs.
notificationService.ts — createNotification, getNotifications, markAsRead, getUnreadCount.
auditService.ts — log(action, entityType, entityId, details), getAuditLogs, logLogin.
workflowEngine.ts — getWorkflows, createWorkflow, executeWorkflow (event-driven steps: action/condition/agent/integration/delay).
integrations/ — IntegrationAdapter (abstract) → StripeAdapter, SendGridAdapter, SlackAdapter.
billingService.ts — Subscription plans (Free/Pro/Enterprise), Stripe checkout, usage metering.
manifestService.ts — THIS FILE. Manages codebase manifest + structured change log.
claudeService.ts — Claude Sonnet API integration via claude-proxy Edge Function.

EDGE FUNCTIONS (supabase/functions/):
gemini-proxy — Forwards Gemini requests server-side. GEMINI_API_KEY secret.
claude-proxy — Forwards Claude requests. ANTHROPIC_API_KEY secret.
stripe-proxy — Stripe API proxy. STRIPE_SECRET_KEY secret.
email-proxy — SendGrid proxy. SENDGRID_API_KEY secret.
webhook-handler — Inbound webhooks (Stripe, SendGrid, Slack).
api — REST API v1 for CRM entities. X-API-Key auth.
provision-tenant — Programmatic tenant creation.

COMPONENTS (components/):
Layout.tsx — Shell: mobile drawer sidebar (hamburger/X, fixed overlay, md:hidden), desktop collapsible sidebar (md:relative). Nav groups: main (Meeting Room), Management, Database. Shows user.user_metadata.full_name || email + role badge.
AcceptInvitePage.tsx — Public /accept-invite?token=xxx. Shows org name + role badge. Accept (logged in) or Login/Register (stores token in localStorage). Uses get_invite_details RPC (unauthenticated).
meeting/MeetingRoomPage.tsx — KPI grid (grid-cols-2 sm:grid-cols-4), mode selector (1-on-1, team), @mention multi-agent.
meeting/AgentChatPanel.tsx — Reusable chat panel.
meeting/agentRegistry.ts — Agent visual config (name, color, avatar).
meeting/createAgent.ts — Agent factory by ID.
SettingsPage.tsx — 9 tabs (Access, Agents, Billing, Branding, Fields, Integrations, Manifest, System, Rollback). Tabs scrollable on mobile. Access tab: invite form → createInvite → clipboard link. Pending invites list with cancel.
settings/BillingTab.tsx — Plan selector, usage meter, Stripe checkout.
settings/IntegrationsTab.tsx — Stripe/SendGrid/Slack config cards.
settings/ManifestTab.tsx — Manifest viewer + Refresh (re-generates) + Lock/Unlock.
HelpPage.tsx — In-app user guide.
DataBrowser.tsx — Browse any table: sort, search, pagination, import/export.
LeadManagement.tsx — Lead CRUD with field config.
ApprovalQueue.tsx — Pending change approvals.
NotificationBell.tsx — Badge + dropdown.

AVATARS (components/avatars/):
20 inline SVG avatars (Professional/Robot/Animal/Abstract). AvatarRenderer.tsx renders by ID. AvatarPickerModal.tsx for picking.`
  },
  {
    key: 'database_schema',
    title: 'Database Schema (14 tables + migrations)',
    token_estimate: 500,
    content: `CRM TABLES (org_id scoped via RLS — all org members share data):
leads(id uuid PK, org_id FK→organizations[RLS], user_id FK→auth.users[audit], name, email, phone, company, status[new/contacted/qualified/unqualified/converted], source, beard_type, score int, notes, created_at, updated_at)
contacts(id, org_id[RLS], user_id[audit], name, email, phone, company, title, notes, created_at, updated_at)
accounts(id, org_id[RLS], user_id[audit], name, industry, website, phone, address, annual_revenue decimal, employee_count int, notes, created_at, updated_at)
opportunities(id, org_id[RLS], user_id[audit], title, amount decimal, stage[prospecting/qualification/proposal/negotiation/closed_won/closed_lost], probability int, close_date, lead_id FK, contact_name, contact_email, notes, created_at, updated_at)
orders(id, org_id[RLS], user_id[audit], order_number, status[pending/processing/shipped/delivered/cancelled], total_amount decimal, items jsonb, notes, created_at, updated_at)
products(id, org_id[RLS], user_id[audit], name, description, price decimal, category, sku, in_stock bool, created_at, updated_at)

SYSTEM TABLES (user_id scoped):
change_log(id, org_id[RLS], user_id[audit], agent_name, change_type, description, before_state jsonb, after_state jsonb, status[pending/approved/rejected], approved_by, approved_at, notes, created_at)
ai_budget(id, user_id, month text, agent_name, request_count int, tokens_used int, estimated_cost decimal, created_at)
database_connections(id, user_id, name, type, config jsonb, created_at)

ACCESS/MULTI-TENANT TABLES:
organizations(id, name, created_by FK→auth.users, created_at, updated_at)
org_members(id, org_id FK→organizations, user_id FK→auth.users, role[admin/editor/viewer], email, invited_by, joined_at)
org_invites(id, org_id FK→organizations[CASCADE], email, role[admin/editor/viewer], token text UNIQUE[64-char hex], invited_by FK→auth.users, status[pending/accepted/cancelled], expires_at[7 days], created_at)

WHITE-LABEL TABLES (org_id scoped):
agent_config(id, org_id, agent_id[ceo/sales/marketing/it], custom_name, custom_title, avatar_id, color_primary, color_gradient, personality_prompt, voice_pitch, voice_rate, voice_name, is_active)
org_branding(id, org_id, app_name, tagline, accent_color, logo_initial)
field_configs(id, org_id, entity, field_key, display_name, field_type, options text[], is_visible, sort_order)

OTHER:
notifications(id, user_id, title, message, type, source, reference_id, read bool, created_at)
code_snippets(id, user_id, agent_name, title, description, code text, language, component_type, created_at)
system_snapshots(id, user_id, label, description, snapshot_data jsonb, tables_included text[], total_rows int, created_by_agent, created_at)
codebase_manifest(id, user_id, org_id, version, locked bool, locked_at, sections jsonb, total_tokens int, created_at, updated_at)
structured_changes(id, user_id, category, agent, title, description, files_affected text[], code_diff, context_summary, status, created_at)

RLS HELPER (avoids infinite recursion):
get_user_org_id() RETURNS uuid SECURITY DEFINER — SELECT org_id FROM org_members WHERE user_id = auth.uid() LIMIT 1.
get_invite_details(token) RETURNS TABLE SECURITY DEFINER — works unauthenticated for /accept-invite page.

MIGRATIONS ORDER: 001_rls_policies → 002_integrations → 003_workflows → 004_api_keys → 005_observability → 006_org_invites_and_org_scope`
  },
  {
    key: 'conventions',
    title: 'Coding Conventions',
    token_estimate: 300,
    content: `COMPONENTS:
- Functional components with React.FC typing.
- Export pattern: named export + default export at bottom (or default only for pages).
- Hooks at top: useAuth(), useOrg(), useAgentConfig(), useBranding(), useFieldConfig(), useNotifications().
- DB init pattern: useEffect with initializeDatabase(user.id) before any databaseService calls. OrgContext sets orgId automatically — no need to pass it.
- Dark theme: page=bg-gray-900, card=bg-gray-800 border border-gray-700 rounded-lg p-4, input=bg-gray-700 border border-gray-600 rounded-lg text-white, button-primary=bg-orange-500 hover:bg-orange-600 text-white rounded-xl.
- Mobile-first: use md: breakpoints. Sidebar is fixed overlay on mobile, inline on desktop.
- Loading: text-gray-500 centered. Error: try/catch with toast/showMessage('error', err.message).

SERVICES:
- DatabaseService auto-injects org_id (RLS) and user_id (audit) — never pass them manually.
- initializeDatabase(userId) MUST be called before any databaseService use. OrgContext.setOrgId() called separately.
- All CRM data is org-scoped — team members share data. Never filter by user_id in business logic.
- Agent constructors accept optional { agentName, orgName, personality } config.
- IT Agent uses instance fields (this.agentName) — different from module-level _orgName in other agents.

AGENTS:
- Gemini API key is server-side (gemini-proxy Edge Function) — never in browser.
- Tool definition: { name, description, parameters: { param: { type, required, description } }, handler: async (params) => result }.
- All schema changes logged via databaseService.logChange(agent, type, description, before, after).
- Destructive ops (drop_column) return { requiresApproval: true } instead of executing.
- Code generation saves to code_snippets table via databaseService, returns code as string.

INVITES:
- accessControl.createInvite(orgId, email, role, invitedBy) → token string.
- Link: window.location.origin + '/accept-invite?token=' + token — copy to clipboard.
- AcceptInvitePage calls supabase.rpc('get_invite_details', { invite_token }) — works unauthenticated.
- If not logged in: localStorage.setItem('pending_invite_token', token) before redirect.
- OrgContext reads and clears pending token after login, calls acceptInvite automatically.

STATE:
- CRM data is org_id scoped (shared across team). RLS enforced server-side.
- Contexts provide loading states and refresh() methods.
- useRef + useEffect pattern for agent instances that recreate on config change.
- useEffect dependencies: use user?.id (primitive) not user (object) to avoid infinite loops.`
  },
  {
    key: 'agent_tools',
    title: 'Agent Tool Registry',
    token_estimate: 300,
    content: `IT AGENT (21 tools — uses @google/genai, DatabaseService injected via constructor):
DB ops: list_tables, get_table_schema, create_table, add_column, modify_column, drop_column(requiresApproval), create_index, analyze_table, search_records, backup_table, import_data, performance_report, read_all_records, insert_record.
Code gen (Claude-powered via claude-proxy): generate_component, generate_workflow, modify_component, smart_code_task, list_code_snippets.
System: create_restore_point, list_restore_points.

SALES AGENT (12 tools — uses @google/generative-ai):
create_lead, get_all_leads, qualify_lead, create_opportunity, get_pipeline, update_opportunity_stage, forecast_revenue, schedule_follow_up, draft_email(send_now→SendGrid), create_quote, track_deal, revenue_report.

MARKETING AGENT (10 tools — uses @google/generative-ai):
create_campaign, segment_audience, draft_marketing_email, schedule_social_post, create_lead_magnet, analyze_campaign_performance, create_ab_test, optimize_landing_page, plan_content_calendar, integrate_google_ads.

CEO AGENT (10 tools — uses @google/generative-ai):
generate_executive_dashboard, monitor_agent_activity, review_budget_status, coordinate_agents, set_goals_and_kpis, approve_major_decision, system_health_check, generate_strategic_report, allocate_resources, performance_analytics.

MEETING ORCHESTRATOR:
MeetingOrchestrator.ts — Parses @mentions, routes messages to correct agent, manages turn-taking and voice synthesis for team meetings.`
  }
];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Manifest Service
// ---------------------------------------------------------------------------

export const manifestService = {
  /** Get the current manifest for this user */
  async getManifest(userId: string): Promise<CodebaseManifest | null> {
    const { data, error } = await supabase
      .from('codebase_manifest')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Manifest fetch failed (table may not exist):', error.message);
      return null;
    }
    return data;
  },

  /** Generate and store the baseline manifest from the hardcoded v3 spec */
  async generateManifest(userId: string, orgId: string | null): Promise<CodebaseManifest> {
    const sections = MANIFEST_V3;
    const totalTokens = sections.reduce((sum, s) => sum + estimateTokens(s.content), 0);

    const manifest: Omit<CodebaseManifest, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      org_id: orgId,
      version: '4.0',
      locked: false,
      locked_at: null,
      sections,
      total_tokens: totalTokens,
    };

    const { data, error } = await supabase
      .from('codebase_manifest')
      .insert(manifest)
      .select()
      .single();

    if (error) throw new Error(`Failed to store manifest: ${error.message}`);
    return data;
  },

  /** Lock the manifest — no further edits. Records the lock timestamp. */
  async lockManifest(manifestId: string): Promise<void> {
    const { error } = await supabase
      .from('codebase_manifest')
      .update({ locked: true, locked_at: new Date().toISOString() })
      .eq('id', manifestId);

    if (error) throw new Error(`Failed to lock manifest: ${error.message}`);
  },

  /** Unlock (admin override) */
  async unlockManifest(manifestId: string): Promise<void> {
    const { error } = await supabase
      .from('codebase_manifest')
      .update({ locked: false, locked_at: null })
      .eq('id', manifestId);

    if (error) throw new Error(`Failed to unlock manifest: ${error.message}`);
  },

  /** Serialize the manifest into a single string for AI context injection */
  serializeForAI(manifest: CodebaseManifest, changeLog?: StructuredChangeEntry[]): string {
    let output = `=== CODEBASE MANIFEST v${manifest.version} ===\n`;
    output += `Locked: ${manifest.locked ? 'YES (baseline)' : 'NO (editable)'}\n\n`;

    for (const section of manifest.sections) {
      output += `--- ${section.title} ---\n${section.content}\n\n`;
    }

    if (changeLog && changeLog.length > 0) {
      output += `--- Changes Since Baseline (${changeLog.length} entries) ---\n`;
      for (const entry of changeLog.slice(-30)) {
        output += `[${entry.category}] ${entry.title}: ${entry.context_summary}\n`;
        if (entry.files_affected.length > 0) {
          output += `  Files: ${entry.files_affected.join(', ')}\n`;
        }
      }
    }

    return output;
  },

  /** Get the hardcoded default sections (for display before DB save) */
  getDefaultSections(): ManifestSection[] {
    return MANIFEST_V3;
  },

  getDefaultTotalTokens(): number {
    return MANIFEST_V3.reduce((sum, s) => sum + estimateTokens(s.content), 0);
  }
};

// ---------------------------------------------------------------------------
// Structured Change Log Service
// ---------------------------------------------------------------------------

export const changeLogService = {
  /** Record a structured change entry */
  async addEntry(
    userId: string,
    entry: Omit<StructuredChangeEntry, 'id' | 'user_id' | 'created_at'>
  ): Promise<StructuredChangeEntry> {
    const { data, error } = await supabase
      .from('structured_changes')
      .insert({ ...entry, user_id: userId })
      .select()
      .single();

    if (error) throw new Error(`Failed to log change: ${error.message}`);
    return data;
  },

  /** Get recent changes (for AI context) */
  async getRecentChanges(userId: string, limit = 50): Promise<StructuredChangeEntry[]> {
    const { data, error } = await supabase
      .from('structured_changes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Structured changes fetch failed:', error.message);
      return [];
    }
    return data || [];
  },

  /** Get changes by category */
  async getByCategory(
    userId: string,
    category: StructuredChangeEntry['category']
  ): Promise<StructuredChangeEntry[]> {
    const { data, error } = await supabase
      .from('structured_changes')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  },

  /** Update status (e.g., pending → deployed) */
  async updateStatus(
    entryId: string,
    status: StructuredChangeEntry['status']
  ): Promise<void> {
    const { error } = await supabase
      .from('structured_changes')
      .update({ status })
      .eq('id', entryId);

    if (error) throw new Error(`Failed to update change status: ${error.message}`);
  }
};
