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