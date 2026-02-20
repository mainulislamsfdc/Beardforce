/**
 * WorkflowTemplates — Pre-built workflow definitions ready to import.
 *
 * These are "recipes" — complete workflow definitions that users can
 * import into their org and customise. Surfaced in the Workflows page
 * as a template gallery.
 */

import type { WorkflowStep } from '../workflowEngine';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'marketing' | 'operations' | 'reporting';
  icon: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  steps: WorkflowStep[];
  tags: string[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ── Lead Qualification Pipeline ─────────────────────────────────────────
  {
    id: 'lead-qualification',
    name: 'Lead Qualification Pipeline',
    description: 'Automatically qualify new leads with the Sales agent, create an opportunity for hot leads (score > 80), and notify via Slack.',
    category: 'sales',
    icon: 'UserCheck',
    trigger_type: 'event',
    trigger_config: { event_type: 'leads.created' },
    steps: [
      {
        id: 'qualify',
        type: 'agent',
        config: {
          agentId: 'sales',
          prompt: 'Qualify this new lead and return a lead score 0-100: Name=$trigger.name, Email=$trigger.email, Company=$trigger.company, Source=$trigger.source. Reply with just a number.',
        },
      },
      {
        id: 'check-score',
        type: 'condition',
        config: { field: '$step_qualify.response', operator: '>', value: '79' },
      },
      {
        id: 'notify-hot-lead',
        type: 'integration',
        config: {
          integrationId: 'slack',
          action: 'send_message',
          params: { text: '🔥 Hot lead! $trigger.name ($trigger.email) scored above 80. Check CRM.' },
        },
      },
      {
        id: 'log-qualification',
        type: 'action',
        action: 'log_change',
        config: { description: 'Lead $trigger.name automatically qualified by Sales agent' },
      },
    ],
    tags: ['leads', 'sales', 'automation'],
  },

  // ── Welcome Email ───────────────────────────────────────────────────────
  {
    id: 'welcome-email',
    name: 'New Lead Welcome Email',
    description: 'Send a personalised welcome introduction email when a new lead is created.',
    category: 'sales',
    icon: 'Mail',
    trigger_type: 'event',
    trigger_config: { event_type: 'leads.created' },
    steps: [
      {
        id: 'send-welcome',
        type: 'integration',
        config: {
          integrationId: 'sendgrid',
          action: 'send_email',
          params: {
            to: '$trigger.email',
            subject: 'Welcome — we received your enquiry',
            html: '<p>Hi $trigger.name,</p><p>Thanks for reaching out! A member of our team will be in touch shortly.</p><p>Best regards,<br>The Team</p>',
          },
        },
      },
      {
        id: 'notify-team',
        type: 'action',
        action: 'send_notification',
        config: { title: 'New Lead', message: 'Welcome email sent to $trigger.name ($trigger.email)', type: 'info' },
      },
    ],
    tags: ['email', 'leads', 'onboarding'],
  },

  // ── Monthly Executive Report ────────────────────────────────────────────
  {
    id: 'monthly-report',
    name: 'Monthly Executive Report',
    description: 'CEO generates a full executive dashboard and emails it to the admin on the 1st of each month.',
    category: 'reporting',
    icon: 'BarChart3',
    trigger_type: 'manual',
    trigger_config: { note: 'Set to schedule trigger with cron: 0 9 1 * *' },
    steps: [
      {
        id: 'ceo-report',
        type: 'agent',
        config: {
          agentId: 'ceo',
          prompt: 'Generate a concise monthly executive summary covering: key wins, pipeline health, revenue forecast, main risks, and top 3 priorities for next month. Format as HTML for email.',
        },
      },
      {
        id: 'sales-forecast',
        type: 'agent',
        config: {
          agentId: 'sales',
          prompt: 'Provide a brief revenue forecast for next month based on current pipeline. 2-3 sentences, plain text.',
        },
      },
      {
        id: 'email-report',
        type: 'integration',
        config: {
          integrationId: 'sendgrid',
          action: 'send_email',
          params: {
            to: 'admin@yourcompany.com',
            subject: 'Monthly Executive Report',
            html: '<h2>Executive Summary</h2>$step_ceo-report.response<hr><h3>Revenue Forecast</h3><p>$step_sales-forecast.response</p>',
          },
        },
      },
    ],
    tags: ['reporting', 'executive', 'email'],
  },

  // ── Opportunity Won — Onboarding Trigger ───────────────────────────────
  {
    id: 'opportunity-won',
    name: 'Deal Won → Customer Onboarding',
    description: 'When an opportunity is marked as won, send a thank-you email, create a contact, and notify the team on Slack.',
    category: 'sales',
    icon: 'Trophy',
    trigger_type: 'event',
    trigger_config: { event_type: 'opportunities.status_changed', field: 'status', value: 'won' },
    steps: [
      {
        id: 'thank-you-email',
        type: 'integration',
        config: {
          integrationId: 'sendgrid',
          action: 'send_email',
          params: {
            to: '$trigger.contact_email',
            subject: 'Welcome aboard!',
            html: '<p>Hi $trigger.contact_name,</p><p>Congratulations — you\'re now a customer! Our team is excited to work with you.</p>',
          },
        },
      },
      {
        id: 'slack-celebrate',
        type: 'integration',
        config: {
          integrationId: 'slack',
          action: 'send_message',
          params: { text: '🎉 Deal CLOSED! $trigger.name — $trigger.value. Great work team!' },
        },
      },
      {
        id: 'log-win',
        type: 'action',
        action: 'log_change',
        config: { description: 'Opportunity $trigger.name marked as WON. Onboarding triggered.' },
      },
    ],
    tags: ['deals', 'onboarding', 'celebration'],
  },

  // ── Overdue Follow-up Alert ─────────────────────────────────────────────
  {
    id: 'overdue-followup',
    name: 'Overdue Lead Follow-up Alert',
    description: 'Notify the team when a lead has had no activity for 7+ days.',
    category: 'operations',
    icon: 'AlertTriangle',
    trigger_type: 'manual',
    trigger_config: { note: 'Run daily via cron or manually' },
    steps: [
      {
        id: 'check-inactive',
        type: 'agent',
        config: {
          agentId: 'sales',
          prompt: 'Check the leads database for any leads with no updates in 7 days. List them by name and days inactive. Return a brief summary.',
        },
      },
      {
        id: 'notify',
        type: 'action',
        action: 'send_notification',
        config: {
          title: 'Overdue Follow-ups',
          message: '$step_check-inactive.response',
          type: 'warning',
        },
      },
    ],
    tags: ['leads', 'follow-up', 'alerts'],
  },

  // ── Marketing Campaign Launch ───────────────────────────────────────────
  {
    id: 'campaign-launch',
    name: 'Campaign Launch Checklist',
    description: 'Marketing agent prepares a launch brief, sends to team on Slack, and logs the campaign.',
    category: 'marketing',
    icon: 'Megaphone',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      {
        id: 'brief',
        type: 'agent',
        config: {
          agentId: 'marketing',
          prompt: 'Create a concise campaign launch checklist covering: target audience, key message, channels, success metrics, and timeline. Return as a structured list.',
        },
      },
      {
        id: 'notify-slack',
        type: 'integration',
        config: {
          integrationId: 'slack',
          action: 'send_message',
          params: { text: '📣 Campaign launch initiated!\n$step_brief.response' },
        },
      },
      {
        id: 'log',
        type: 'action',
        action: 'log_change',
        config: { description: 'Marketing campaign launched. Brief generated by Marketing agent.' },
      },
    ],
    tags: ['marketing', 'campaigns', 'launch'],
  },
];

/** Get a template by ID. */
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
}

/** Get templates by category. */
export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category);
}
