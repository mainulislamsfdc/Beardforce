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
AI: Google Gemini 2.0 Flash for 4 agents (CEO, Sales, Marketing, IT). IT Agent also uses Claude for code generation.
State: 7 React Context providers nested: AuthProvider > OrgProvider > AgentConfigProvider > BrandingProvider > FieldConfigProvider > NotificationProvider > Router.
Database: Adapter pattern — DatabaseAdapter (abstract) → SupabaseAdapter (impl) → DatabaseService (facade, auto-injects user_id).
Auth: Supabase Auth with auto-org provisioning on signup. RLS on all tables scoped by user_id.
Agents: Gemini function calling. Each agent has ToolDefinition[] with name/description/parameters/execute. IT Agent uses @google/genai (newer SDK), others use @google/generative-ai (older).
White-label: AgentConfigContext (per-agent names/avatars/colors/voice), BrandingContext (app name/logo/colors), FieldConfigContext (per-entity field visibility/labels).
Routing: react-router-dom v7, lazy-loaded routes inside PrivateRoute > Layout shell.
Styling: Dark theme throughout — bg-gray-900 (page), bg-gray-800 (cards), bg-gray-700 (inputs), text-white (primary), text-gray-400 (secondary), border-gray-700.
Icons: lucide-react. Charts: recharts. CSV: papaparse. Voice: Web Speech API.`
  },
  {
    key: 'file_map',
    title: 'File Map',
    token_estimate: 600,
    content: `ROOT:
App.tsx — Router + context provider nesting + lazy routes.
types.ts — All TypeScript interfaces (User, Lead, AgentConfig, OrgBranding, FieldConfig, CodebaseManifest, StructuredChangeEntry, ClaudeCodeRequest/Response, etc).
constants.ts — Agent color maps, empty initial state arrays.

CONTEXT (context/):
AuthContext.tsx — useAuth(): user, session, signUp, signIn, signInWithProvider, signOut, resetPassword. Auto-provisions org.
OrgContext.tsx — useOrg(): org, role, isAdmin, isEditor. Loads org_members.
AgentConfigContext.tsx — useAgentConfig(): getAgent(id), updateAgent(). Fallback defaults if no DB rows.
BrandingContext.tsx — useBranding(): branding, updateBranding(). Sets document.title.
FieldConfigContext.tsx — useFieldConfig(): getFieldConfig(entity, key), getVisibleFields().
NotificationContext.tsx — useNotifications(): notifications, unreadCount, toasts, addToast(), markAsRead().
StoreContext.tsx — Legacy state: leads, campaigns, tickets, expenses, changeRequests.

DATABASE (services/database/):
DatabaseAdapter.ts — Abstract: CRUD, batch, schema ops (getTables, createTable, addColumn, etc), query, count, search.
SupabaseAdapter.ts — Implements all adapter methods. Filter ops: =, !=, >, <, >=, <=, LIKE, IN.
DatabaseService.ts — Facade. Entity methods: createLead/getLeads/etc. Auto-injects user_id. Has createSnapshot/restoreSnapshot/resetToDefault.
index.ts — Exports databaseService singleton + initializeDatabase(userId).

AGENTS (services/agents/tools/):
CEOAgent.ts — 10 tools: executive dashboard, budget review, agent monitoring, forecasting, coordination. Uses @google/generative-ai.
SalesAgent.ts — 12 tools: lead CRUD, qualification, pipeline, orders, quotes. Email templates use dynamic orgName.
MarketingAgent.ts — 10 tools: campaigns, audience segmentation, email sequences, ad copy. Dynamic orgName in templates.
ITAgent.ts — 20 tools via ITAgentTools: 11 DB management, 2 data CRUD, 4 code generation, 2 snapshots, 1 performance report. Uses @google/genai.
itAgentTools.ts — ITAgentTool interface + ITAgentTools class. All tool definitions with execute handlers.
MeetingOrchestrator.ts — Multi-agent meetings: turn-taking, voice synthesis, agent status tracking.

SERVICES (services/):
auth/authService.ts — Supabase auth wrapper: signUp, signIn, signOut, OAuth, password reset.
accessControl.ts — Org RBAC: createOrganization, getOrgMembers, updateMemberRole, addMember.
agentConfigService.ts — CRUD for agent_config, org_branding, field_configs. Default configs.
notificationService.ts — createNotification, getNotifications, markAsRead, getUnreadCount.
auditService.ts — log(action, entityType, entityId, details), getAuditLogs, logLogin, getLoginHistory.
workflowEngine.ts — getWorkflows, createWorkflow, executeWorkflow. Actions: create_record, update_field, send_notification, log_change.
importExport.ts — exportToCSV, exportToJSON, parseCSV via papaparse.
manifestService.ts — THIS FILE. Manages codebase manifest + structured change log.
claudeService.ts — Claude API integration for intelligent code generation.

COMPONENTS (components/):
Layout.tsx — Main shell: collapsible sidebar (nav groups: Main, Agents, Management, Database), notification bell, user menu.
LoginPage.tsx — Email/password + Google OAuth. Branded "RunwayCRM".
RegisterPage.tsx — Registration + auto-org creation.
DashboardPage.tsx — KPI cards (leads, pipeline, revenue), agent cards, charts (pipeline by stage, leads by source).
CEOAgentChat.tsx / SalesAgentChat.tsx / MarketingAgentChat.tsx / ITAgentChat.tsx — Agent chat UIs. Pattern: capabilities showcase + message history + input. useRef for agent instance, recreates on config change.
TeamsMeetingRoom.tsx — Multi-agent voice meeting. Agent selection, voice I/O, turn-taking.
VoiceAgentHub.tsx — Single-agent voice interface with Web Speech API.
LeadManagement.tsx — Lead CRUD with search, filtering, field config integration.
SettingsPage.tsx — Tabs: Access, Agents, Branding, Fields, Manifest, System, Rollback.
DataBrowser.tsx — Browse any table with sort, search, pagination, import/export.
AuditTrailPage.tsx — Timeline view of audit_log + login_history.
WorkflowsPage.tsx — Workflow builder: triggers, steps, enable/disable.
CodeEditorPage.tsx — Code snippet editor with syntax analysis and version history.
ApprovalQueue.tsx — Pending change approvals.
NotificationBell.tsx — Badge + dropdown.
ImportModal.tsx / ExportButton.tsx — CSV/JSON import and export.

AVATARS (components/avatars/):
index.tsx — 20 inline SVG avatar components: Professional (5), Robot (5), Animal (5), Abstract (5). Speaking animation.
AvatarRenderer.tsx — Renders by ID with size/speaking/color. Fallback to initials.
AvatarPickerModal.tsx — Category-tabbed grid picker.

SETTINGS (components/settings/):
AgentSettingsTab.tsx — Edit agent name, title, avatar, colors, voice, personality.
BrandingSettingsTab.tsx — Edit app name, tagline, accent color, logo.
FieldSettingsTab.tsx — Rename/hide lead fields, customize dropdown options.`
  },
  {
    key: 'database_schema',
    title: 'Database Schema (16 tables)',
    token_estimate: 500,
    content: `CRM TABLES (user_id scoped, RLS enabled):
leads(id uuid PK, user_id, name, email, phone, company, status[new/contacted/qualified/lost], source, beard_type, interests text[], score int, assigned_to, notes, created_at, updated_at)
contacts(id, user_id, first_name, last_name, email unique, phone, account_id FK→accounts, title, tags text[], notes, created_at, updated_at)
accounts(id, user_id, name, industry, website, phone, billing_address jsonb, shipping_address jsonb, notes, created_at, updated_at)
opportunities(id, user_id, name, account_id FK, stage[prospecting/qualification/proposal/negotiation/closed_won/closed_lost], amount decimal, probability int, close_date, assigned_to, notes, created_at, updated_at)
orders(id, user_id, order_number unique, account_id FK, contact_id FK, opportunity_id FK, status[pending/processing/shipped/delivered/cancelled], total_amount decimal, items jsonb, shipping_address jsonb, notes, created_at, updated_at)
products(id, user_id, name, category[oil/balm/wax/shampoo/conditioner/kit], description, price decimal, stock_quantity int, image_url, is_active bool, created_at, updated_at)

SYSTEM TABLES:
change_log(id, user_id, agent_name, change_type[schema/data/config/workflow/code_generation], description, before_state jsonb, after_state jsonb, status[pending/approved/rejected/completed/rolled_back], approved_by, created_at, executed_at)
ai_budget(id, user_id, month text, agent_name, request_count int, tokens_used int, estimated_cost decimal, created_at)
database_connections(id, user_id, name, type[supabase/postgresql/mysql/sqlite], config jsonb, is_active bool, created_at, updated_at)

ACCESS TABLES:
organizations(id, name, created_by, created_at, updated_at)
org_members(id, org_id FK, user_id, role[admin/editor/viewer], email, invited_by, joined_at)

WHITE-LABEL TABLES:
agent_config(id, org_id, agent_id[ceo/sales/marketing/it], custom_name, custom_title, avatar_id, color_primary, color_gradient, personality_prompt, voice_pitch, voice_rate, voice_name, is_active)
org_branding(id, org_id, app_name, tagline, accent_color, logo_emoji, logo_initial)
field_configs(id, org_id, entity, field_key, display_name, field_type[text/select/number/hidden], options text[], is_visible, sort_order)

OTHER:
notifications(id, user_id, title, message, type[info/success/warning/error/agent_action], source, reference_id, reference_type, read bool, created_at)
code_snippets(id, user_id, agent_name, title, description, code text, language, component_type, created_at)
system_snapshots(id, user_id, label, description, snapshot_data jsonb, tables_included text[], total_rows int, created_by_agent, created_at)
workflows(id, user_id, name, description, trigger_type[manual/on_create/on_update/on_status_change/schedule], trigger_config jsonb, steps jsonb, is_active, last_run_at, run_count)

NEW TABLES (v4):
codebase_manifest(id, user_id, org_id, version, locked bool, locked_at, sections jsonb, total_tokens int, created_at, updated_at)
structured_changes(id, user_id, category, agent, title, description, files_affected text[], code_diff, context_summary, status, parent_id, created_at)`
  },
  {
    key: 'conventions',
    title: 'Coding Conventions',
    token_estimate: 300,
    content: `COMPONENTS:
- Functional components with React.FC typing.
- Export pattern: named export + default export at bottom.
- Hooks at top: useAuth(), useOrg(), useAgentConfig(), useBranding(), useFieldConfig(), useNotifications().
- DB init pattern: useEffect with initializeDatabase(user.id) before any databaseService calls.
- Dark theme classes: page=bg-gray-900, card=bg-gray-800 border border-gray-700 rounded-lg p-4, input=bg-gray-700 border border-gray-600 rounded-lg text-white, button=bg-orange-600 hover:bg-orange-700 text-white rounded-lg.
- Loading states: text-gray-500 centered with "Loading..." text.
- Error handling: try/catch with showMessage('error', err.message) pattern.

SERVICES:
- DatabaseService auto-injects user_id into all queries — never pass user_id manually in service calls.
- initializeDatabase(userId) MUST be called before any databaseService use.
- Agent constructors accept optional { agentName, orgName, personality } config.
- Module-level _orgName variable in CEO/Sales/Marketing agents for tool handler access.
- IT Agent uses instance fields (this.agentName, etc) — different SDK pattern.

AGENTS:
- Tool definition: { name, description, parameters: { param: { type: 'string', required: true } }, execute: async (params) => result }.
- All schema changes logged via dbService.logChange(agent, type, description, before, after).
- Destructive ops (drop_column) return { requiresApproval: true } instead of executing.
- Code generation returns template strings, does not create actual files.

STATE:
- All data user_id scoped. RLS enforced server-side.
- Contexts provide loading states and refresh() methods.
- useRef + useEffect pattern for agent instances that recreate on config change.`
  },
  {
    key: 'agent_tools',
    title: 'Agent Tool Registry',
    token_estimate: 300,
    content: `IT AGENT (20 tools):
DB: list_tables, get_table_schema, create_table, add_column, modify_column, drop_column(approval), create_index, analyze_table, search_records, backup_table, import_data, performance_report.
Data: read_all_records, insert_record.
Code: generate_component, generate_workflow, modify_component, list_code_snippets.
System: create_restore_point, list_restore_points.

SALES AGENT (12 tools):
create_lead, get_all_leads, qualify_lead, update_lead_status, create_opportunity, get_opportunities, update_opportunity_stage, create_order, get_orders, forecast_revenue, send_followup_email, generate_sales_report.

MARKETING AGENT (10 tools):
create_campaign, get_campaigns, segment_audience, generate_email_sequence, analyze_campaign_performance, create_social_post, generate_ad_copy, track_lead_source, create_landing_page_brief, marketing_budget_analysis.

CEO AGENT (10 tools):
generate_executive_dashboard, monitor_agent_activity, review_budget_allocation, performance_analytics, strategic_recommendations, approve_budget_request, coordinate_agents, generate_report, risk_assessment, forecast_business_outcomes.`
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
      version: '3.0',
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
