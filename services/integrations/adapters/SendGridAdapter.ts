/**
 * SendGridAdapter — Email delivery via SendGrid (or Resend).
 *
 * Actions:
 *   send_email       — Send a single email
 *   send_template    — Send using a SendGrid template
 *   get_stats        — Get delivery statistics
 *
 * Webhooks:
 *   delivered, opened, clicked, bounced, spam_report
 *
 * This adapter calls the SendGrid API directly from the client
 * via a Supabase Edge Function proxy (to keep API key server-side).
 */

import {
  IntegrationAdapter,
  IntegrationMeta,
  IntegrationResult,
} from '../IntegrationAdapter';

const SENDGRID_PROXY_URL = '/functions/v1/email-proxy';

export class SendGridAdapter extends IntegrationAdapter {
  readonly meta: IntegrationMeta = {
    id: 'sendgrid',
    name: 'SendGrid Email',
    description: 'Send emails from agents, track opens/clicks, manage templates.',
    category: 'communication',
    icon: 'Mail',
    requiredConfig: [
      {
        key: 'api_key',
        label: 'SendGrid API Key',
        type: 'password',
        placeholder: 'SG.xxxxx',
        required: true,
      },
      {
        key: 'from_email',
        label: 'Default From Email',
        type: 'text',
        placeholder: 'noreply@yourdomain.com',
        required: true,
      },
      {
        key: 'from_name',
        label: 'Default From Name',
        type: 'text',
        placeholder: 'RunwayCRM',
        required: false,
      },
    ],
    supportedActions: ['send_email', 'send_template', 'get_stats'],
  };

  async connect(config: Record<string, string>): Promise<IntegrationResult> {
    if (!config.api_key?.startsWith('SG.')) {
      return { success: false, error: 'Invalid SendGrid key. Must start with SG.' };
    }
    if (!config.from_email?.includes('@')) {
      return { success: false, error: 'Please provide a valid from email address.' };
    }
    return { success: true, data: { connected: true } };
  }

  async disconnect(): Promise<void> {}

  async testConnection(config: Record<string, string>): Promise<boolean> {
    // SendGrid doesn't have a simple ping endpoint; validate key format
    return !!config.api_key?.startsWith('SG.');
  }

  async execute(
    action: string,
    params: Record<string, any>,
    config: Record<string, string>
  ): Promise<IntegrationResult> {
    try {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return { success: false, error: 'Supabase URL not configured' };
      }

      const response = await fetch(`${supabaseUrl}${SENDGRID_PROXY_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          params: {
            ...params,
            from_email: params.from_email || config.from_email,
            from_name: params.from_name || config.from_name || 'RunwayCRM',
          },
          api_key: config.api_key,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `SendGrid error: ${error}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Email send failed' };
    }
  }

  async handleWebhook(
    payload: unknown,
  ): Promise<IntegrationResult> {
    // SendGrid sends arrays of events
    const events = Array.isArray(payload) ? payload : [payload];
    return {
      success: true,
      data: {
        events_processed: events.length,
        event_types: events.map((e: any) => e.event).filter(Boolean),
      },
    };
  }
}
