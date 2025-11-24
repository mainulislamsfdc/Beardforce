export enum AgentRole {
  CEO = 'CEO',
  SALES = 'Sales Manager',
  MARKETING = 'Market Manager',
  IT = 'IT Manager',
  USER = 'You'
}

export enum TicketStatus {
  BACKLOG = 'Backlog',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  assignee: AgentRole;
  createdAt: string;
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

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  agent: AgentRole;
}

export interface ChatMessage {
  id: string;
  role: AgentRole;
  text: string;
  timestamp: Date;
  isAudio?: boolean;
}
