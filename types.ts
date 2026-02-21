export enum AgentRole {
  CEO = 'CEO',
  SALES = 'Sales Manager',
  MARKETING = 'Market Manager',
  IT = 'IT Manager',
  USER = 'User'
}

export enum TicketStatus {
  BACKLOG = 'Backlog',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

// --- Configuration & Auth ---

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface AppConfig {
  businessName: string;
  industry: string;
  agentNames: {
    [key in AgentRole]?: string;
  };
  themeColor: string;
  firebaseConfig?: FirebaseConfig;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
}

// --- Observability (Logs, Traces, Metrics) ---

export interface Metric {
  id: string;
  name: string; // e.g. 'llm_latency', 'token_usage'
  value: number;
  unit: string;
  timestamp: string;
}

export interface Trace {
  id: string;
  requestId: string;
  input: string;
  output: string;
  latencyMs: number;
  model: string;
  timestamp: string;
  status: 'success' | 'error';
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  agent: string; // Changed from enum to string to support custom names
  level: 'info' | 'warn' | 'error';
}

// --- Domain Entities ---

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  assignee: string; // Dynamic name
  createdAt: string;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'Implemented' | 'Rejected';
  requestedBy: string;
  timestamp: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Customer';
  value: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: 'Facebook' | 'Google' | 'Instagram' | 'Email';
  budget: number;
  status: 'Active' | 'Paused' | 'Draft';
  clicks: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  approved: boolean;
}

export interface ChatMessage {
  id: string;
  role: string; // Dynamic
  roleType: AgentRole; // Fixed enum for logic
  text: string;
  timestamp: Date;
  isAudio?: boolean;
}

// --- Dynamic Low-Code Engine ---

export interface PageWidget {
  id: string;
  type: 'statCard' | 'table' | 'chart' | 'header' | 'form';
  title: string;
  dataSource?: 'leads' | 'tickets' | 'campaigns' | 'expenses' | 'changeRequests'; // Which data store to bind to
  config?: any; // Flexible config for specific widget types (e.g., form fields, chart types)
  gridColSpan?: number; // 1 (full), 2 (half), 3 (third) - based on 3 col grid
}

export interface DynamicPage {
  id: string;
  name: string;
  route: string;
  description: string;
  icon: string; // Lucide icon name string
  widgets: PageWidget[];
}

// --- Access Management ---

export type OrgRole = 'admin' | 'editor' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  email?: string;
  invited_by: string | null;
  joined_at: string;
}

export interface OrgInvite {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  token: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'cancelled';
  expires_at: string;
  created_at: string;
}

// --- Code Generation ---

export interface CodeSnippet {
  id: string;
  user_id: string;
  agent_name: string;
  title: string;
  description: string;
  code: string;
  language: string;
  component_type: string;
  created_at: string;
}

// --- Snapshot / Rollback ---

export interface SystemSnapshot {
  id: string;
  user_id: string;
  label: string;
  description: string;
  snapshot_data: Record<string, any>;
  tables_included: string[];
  total_rows: number;
  created_by_agent: string | null;
  created_at: string;
}

export interface SystemConfig {
  id: string;
  user_id: string;
  config_key: string;
  config_value: any;
  updated_at: string;
}

// --- Notifications ---

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'agent_action';
  source: string | null;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
  created_at: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// --- White-Label / Agent Config ---

export type AgentId = 'ceo' | 'sales' | 'marketing' | 'it';

export interface AgentConfig {
  id: string;
  org_id: string;
  agent_id: AgentId;
  custom_name: string;
  custom_title: string;
  avatar_id: string;
  color_primary: string;
  color_gradient: string;
  personality_prompt: string | null;
  voice_pitch: number;
  voice_rate: number;
  voice_name: string | null;
  is_active: boolean;
}

export interface OrgBranding {
  id: string;
  org_id: string;
  app_name: string;
  tagline: string;
  accent_color: string;
  logo_emoji: string;
  logo_initial: string;
}

export interface FieldConfig {
  id: string;
  org_id: string;
  entity: string;
  field_key: string;
  display_name: string;
  field_type: 'text' | 'select' | 'number' | 'hidden';
  options: string[] | null;
  is_visible: boolean;
  sort_order: number;
}

export interface AvatarProps {
  size: 'sm' | 'md' | 'lg' | 'xl';
  speaking?: boolean;
  color?: string;
}

export interface AvatarDefinition {
  id: string;
  name: string;
  category: 'professional' | 'robot' | 'animal' | 'abstract';
}

// --- Codebase Manifest (AI Context System) ---

export interface ManifestSection {
  key: string;
  title: string;
  content: string;
  token_estimate: number;
}

export interface CodebaseManifest {
  id: string;
  user_id: string;
  org_id: string | null;
  version: string;
  locked: boolean;
  locked_at: string | null;
  sections: ManifestSection[];
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface StructuredChangeEntry {
  id: string;
  user_id: string;
  category: 'feature' | 'bugfix' | 'schema' | 'config' | 'refactor' | 'ai_generated';
  agent: string;
  title: string;
  description: string;
  files_affected: string[];
  code_diff: string | null;
  context_summary: string;
  status: 'pending' | 'approved' | 'rejected' | 'deployed';
  parent_id: string | null;
  created_at: string;
}

export interface ClaudeCodeRequest {
  task: string;
  task_type: 'generate_component' | 'modify_code' | 'fix_bug' | 'add_feature' | 'refactor' | 'explain';
  target_files?: string[];
  context_hint?: string;
  constraints?: string[];
}

export interface ClaudeCodeResponse {
  success: boolean;
  code: string;
  explanation: string;
  files_affected: string[];
  change_summary: string;
  confidence: 'high' | 'medium' | 'low';
}