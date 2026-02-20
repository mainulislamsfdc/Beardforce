import { Database, TrendingUp, Megaphone, Crown } from 'lucide-react';
import type { AgentId } from '../../types';

export interface AgentCapability {
  name: string;
  command: string;
  desc: string;
}

export interface AgentVisualConfig {
  agentId: AgentId;
  icon: any;
  gradient: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  ringColor: string;
  thinkingBg: string;
  userBubbleGradient: string;
  description: string;
  placeholder: string;
  capabilities: AgentCapability[];
}

export const AGENT_REGISTRY: Record<AgentId, AgentVisualConfig> = {
  it: {
    agentId: 'it',
    icon: Database,
    gradient: 'from-blue-600 to-indigo-700',
    accentColor: 'text-blue-400',
    bgColor: 'bg-blue-600',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-400',
    ringColor: 'focus:ring-blue-500',
    thinkingBg: 'bg-blue-900/30',
    userBubbleGradient: 'from-blue-600 to-blue-700',
    description: 'Database & infrastructure management',
    placeholder: 'Ask about database, schemas, or code...',
    capabilities: [
      { name: 'Show All Records', command: 'Show all leads', desc: 'View all records from any table' },
      { name: 'Insert Record', command: 'Insert a new lead named John with email john@test.com', desc: 'Add new records to any table' },
      { name: 'List Tables', command: 'List all tables in the database', desc: 'Show all available database tables' },
      { name: 'Table Schema', command: 'Show me the schema for the leads table', desc: 'View structure/columns of a table' },
      { name: 'Search Records', command: 'Search leads for John', desc: 'Search records by keyword' },
      { name: 'Analyze Table', command: 'Analyze the leads table', desc: 'Get table statistics and insights' },
      { name: 'Create Table', command: 'Create a new table called tasks', desc: 'Create new database tables' },
      { name: 'Add Column', command: 'Add a priority column to the leads table', desc: 'Add columns to existing tables' },
      { name: 'Generate Component', command: 'Create a new dashboard widget component called CustomerCard', desc: 'Generate React + TypeScript components' },
      { name: 'Generate Workflow', command: 'Create an automation workflow for lead follow-ups', desc: 'Build automation workflow code' },
      { name: 'Code Snippets', command: 'Show all saved code snippets', desc: 'View previously generated code' },
      { name: 'Create Restore Point', command: 'Create a restore point called Before Changes', desc: 'Snapshot all CRM data for rollback' },
      { name: 'List Restore Points', command: 'Show all restore points', desc: 'View available system snapshots' },
      { name: 'Performance Report', command: 'Generate a database performance report', desc: 'Database-wide performance analysis' },
    ],
  },
  sales: {
    agentId: 'sales',
    icon: TrendingUp,
    gradient: 'from-green-500 to-blue-600',
    accentColor: 'text-green-400',
    bgColor: 'bg-green-600',
    borderColor: 'border-green-500',
    textColor: 'text-green-400',
    ringColor: 'focus:ring-green-500',
    thinkingBg: 'bg-green-900/30',
    userBubbleGradient: 'from-green-500 to-blue-600',
    description: 'Pipeline, revenue & lead management',
    placeholder: 'Ask about leads, deals, or pipeline...',
    capabilities: [
      { name: 'Create Lead', command: 'Create a new lead named John Smith with email john@company.com', desc: 'Add new prospects to the CRM' },
      { name: 'View All Leads', command: 'Show me all leads in the CRM', desc: 'List all leads with details' },
      { name: 'Qualify Lead', command: 'Qualify and score all unqualified leads', desc: 'Score leads 0-100 based on data' },
      { name: 'Create Opportunity', command: 'Create a new opportunity from a qualified lead', desc: 'Convert leads to opportunities' },
      { name: 'View Pipeline', command: 'Show the current sales pipeline', desc: 'View all pipeline stages' },
      { name: 'Update Deal Stage', command: 'Move opportunity to negotiation stage', desc: 'Advance deals through stages' },
      { name: 'Revenue Forecast', command: 'Generate a revenue forecast for this month', desc: 'Predict sales performance' },
      { name: 'Schedule Follow-up', command: 'Schedule a follow-up for my top leads', desc: 'Plan next touchpoints' },
      { name: 'Draft Email', command: 'Draft a follow-up email for a qualified lead', desc: 'Generate professional emails' },
      { name: 'Create Quote', command: 'Create a price quote for our premium plan', desc: 'Generate price quotes' },
      { name: 'Track Deal', command: 'Track the progress of my latest deal', desc: 'Detailed deal tracking' },
      { name: 'Revenue Report', command: 'Generate a comprehensive revenue report', desc: 'Won deals and trend analysis' },
    ],
  },
  marketing: {
    agentId: 'marketing',
    icon: Megaphone,
    gradient: 'from-purple-500 to-pink-600',
    accentColor: 'text-purple-400',
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-400',
    ringColor: 'focus:ring-purple-500',
    thinkingBg: 'bg-purple-900/30',
    userBubbleGradient: 'from-purple-500 to-pink-600',
    description: 'Campaigns, content & growth',
    placeholder: 'Ask about campaigns, content, or audiences...',
    capabilities: [
      { name: 'Create Campaign', command: 'Create an email marketing campaign for lead generation', desc: 'Multi-channel marketing campaigns' },
      { name: 'Segment Audience', command: 'Segment my leads by qualification score', desc: 'Target audiences by criteria' },
      { name: 'Draft Email', command: 'Draft a promotional email for our CRM platform', desc: 'Professional marketing emails' },
      { name: 'Social Media Post', command: 'Schedule a LinkedIn post about our product launch', desc: 'Schedule posts across platforms' },
      { name: 'Lead Magnet', command: 'Create a lead magnet idea for our product line', desc: 'Ebooks, guides, templates' },
      { name: 'Campaign Analytics', command: 'Analyze the performance of our latest campaign', desc: 'Performance reports & ROI' },
      { name: 'A/B Testing', command: 'Set up an A/B test for our email subject lines', desc: 'Test email subjects & content' },
      { name: 'Landing Page', command: 'Optimize our product landing page', desc: 'Landing page recommendations' },
      { name: 'Content Calendar', command: 'Create a 1-month content calendar for social media', desc: 'Plan content ahead' },
      { name: 'Google Ads', command: 'Set up a Google Ads campaign for our products', desc: 'PPC campaign configuration' },
    ],
  },
  ceo: {
    agentId: 'ceo',
    icon: Crown,
    gradient: 'from-amber-500 via-yellow-500 to-orange-600',
    accentColor: 'text-amber-400',
    bgColor: 'bg-amber-600',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-400',
    ringColor: 'focus:ring-amber-500',
    thinkingBg: 'bg-amber-900/30',
    userBubbleGradient: 'from-amber-500 via-yellow-500 to-orange-600',
    description: 'Strategy, oversight & coordination',
    placeholder: 'Ask about strategy, KPIs, or budgets...',
    capabilities: [
      { name: 'Executive Dashboard', command: 'Generate the executive dashboard with all KPIs', desc: 'Comprehensive KPIs & metrics' },
      { name: 'Agent Activity', command: 'Monitor the activity of all agents', desc: 'Track agent performance' },
      { name: 'Budget Review', command: 'Review current AI budget status with projections', desc: 'Spending & cost analysis' },
      { name: 'Coordinate Agents', command: 'Coordinate sales and marketing for a product launch', desc: 'Cross-agent workflows' },
      { name: 'Set Goals & KPIs', command: 'Set Q1 goals and KPIs for the sales team', desc: 'Organizational goal setting' },
      { name: 'Approve Decision', command: 'Review and approve pending major decisions', desc: 'Approval workflow management' },
      { name: 'System Health', command: 'Perform a comprehensive system health check', desc: 'Full system diagnostics' },
      { name: 'Strategic Report', command: 'Generate a monthly strategic report', desc: 'Insights & recommendations' },
      { name: 'Allocate Resources', command: 'Allocate budget across departments for Q1', desc: 'Resource management' },
      { name: 'Performance Analytics', command: 'Analyze performance trends across all departments', desc: 'Predictive insights' },
    ],
  },
};
