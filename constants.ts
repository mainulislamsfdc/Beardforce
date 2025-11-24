import { AgentRole, Campaign, Expense, Lead, Ticket, TicketStatus, SystemLog } from "./types";

export const INITIAL_LEADS: Lead[] = [
  { id: '1', name: 'Jack Lumber', email: 'jack@forest.com', status: 'Qualified', value: 120 },
  { id: '2', name: 'Hipster Harry', email: 'harry@brew.co', status: 'New', value: 45 },
  { id: '3', name: 'Captain Beard', email: 'ahoy@sea.net', status: 'Customer', value: 350 },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Rugged Winter', platform: 'Instagram', budget: 1500, status: 'Active', clicks: 450 },
  { id: '2', name: 'Soft Touch Oil', platform: 'Facebook', budget: 800, status: 'Paused', clicks: 120 },
];

export const INITIAL_TICKETS: Ticket[] = [
  { id: '1', title: 'Setup CRM Database', description: 'Initialize main tables for leads and orders', status: TicketStatus.DONE, assignee: AgentRole.IT, createdAt: '2023-10-01' },
  { id: '2', title: 'Q4 Sales Strategy', description: 'Draft outlines for holiday bundles', status: TicketStatus.IN_PROGRESS, assignee: AgentRole.SALES, createdAt: '2023-10-05' },
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: '1', category: 'Software', amount: 299, description: 'Cloud Hosting', date: '2023-10-10', approved: true },
  { id: '2', category: 'Ads', amount: 1500, description: 'Instagram Ad Spend', date: '2023-10-12', approved: false },
];

export const INITIAL_LOGS: SystemLog[] = [
  { id: '1', timestamp: new Date().toISOString(), action: 'System Initialized', agent: AgentRole.IT }
];

export const AGENT_COLORS = {
  [AgentRole.CEO]: 'text-purple-400 border-purple-400 bg-purple-900/20',
  [AgentRole.SALES]: 'text-green-400 border-green-400 bg-green-900/20',
  [AgentRole.MARKETING]: 'text-pink-400 border-pink-400 bg-pink-900/20',
  [AgentRole.IT]: 'text-blue-400 border-blue-400 bg-blue-900/20',
  [AgentRole.USER]: 'text-amber-400 border-amber-400 bg-amber-900/20',
};
