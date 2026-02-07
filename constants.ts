import { AgentRole, Campaign, Expense, Lead, Ticket, TicketStatus, SystemLog } from "./types";

// NOTE: These are now used only as fallbacks if the DatabaseService returns empty arrays on first run
// The application logic now relies primarily on the StoreContext and DatabaseService.

export const AGENT_COLORS = {
  [AgentRole.CEO]: 'text-purple-400 border-purple-400 bg-purple-900/20',
  [AgentRole.SALES]: 'text-green-400 border-green-400 bg-green-900/20',
  [AgentRole.MARKETING]: 'text-pink-400 border-pink-400 bg-pink-900/20',
  [AgentRole.IT]: 'text-blue-400 border-blue-400 bg-blue-900/20',
  [AgentRole.USER]: 'text-amber-400 border-amber-400 bg-amber-900/20',
};

// Empty initial states - will be populated by the app logic
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_CAMPAIGNS: Campaign[] = [];
export const INITIAL_TICKETS: Ticket[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_LOGS: SystemLog[] = [];