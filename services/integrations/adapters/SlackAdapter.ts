/**
 * SlackAdapter — Team notifications via Slack Incoming Webhooks.
 *
 * Actions:
 *   send_message     — Post a message to a Slack channel
 *   send_rich        — Post a rich message with blocks (attachments)
 *
 * This adapter uses Slack Incoming Webhooks which only require a URL,
 * no OAuth flow needed. For more advanced features (slash commands,
 * interactive messages), the webhook_url would be a Slack App Bot token.
 */

import {
  IntegrationAdapter,
  IntegrationMeta,
  IntegrationResult,
} from '../IntegrationAdapter';

export class SlackAdapter extends IntegrationAdapter {
  readonly meta: IntegrationMeta = {
    id: 'slack',
    name: 'Slack Notifications',
    description: 'Send CRM notifications and agent updates to Slack channels.',
    category: 'communication',
    icon: 'MessageSquare',
    requiredConfig: [
      {
        key: 'webhook_url',
        label: 'Slack Webhook URL',
        type: 'url',
        placeholder: 'https://hooks.slack.com/services/T.../B.../xxx',
        required: true,
      },
      {
        key: 'channel',
        label: 'Default Channel',
        type: 'text',
        placeholder: '#crm-notifications',
        required: false,
      },
    ],
    supportedActions: ['send_message', 'send_rich'],
  };

  async connect(config: Record<string, string>): Promise<IntegrationResult> {
    if (!config.webhook_url?.includes('hooks.slack.com')) {
      return { success: false, error: 'Invalid Slack webhook URL.' };
    }
    const alive = await this.testConnection(config);
    if (!alive) {
      return { success: false, error: 'Could not reach Slack webhook. Check the URL.' };
    }
    return { success: true, data: { connected: true } };
  }

  async disconnect(): Promise<void> {}

  async testConnection(config: Record<string, string>): Promise<boolean> {
    try {
      // Slack webhooks accept POST; a test message confirms it works
      const res = await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'RunwayCRM connected successfully.' }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async execute(
    action: string,
    params: Record<string, any>,
    config: Record<string, string>
  ): Promise<IntegrationResult> {
    try {
      let body: any;

      if (action === 'send_message') {
        body = {
          text: params.text || params.message || 'No message provided',
          channel: params.channel || config.channel,
        };
      } else if (action === 'send_rich') {
        body = {
          text: params.fallback || params.text || '',
          blocks: params.blocks || [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: params.text || params.message || '',
              },
            },
          ],
          channel: params.channel || config.channel,
        };
      } else {
        return { success: false, error: `Unknown action: ${action}` };
      }

      const res = await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `Slack error: ${errorText}` };
      }

      return { success: true, data: { delivered: true } };
    } catch (err: any) {
      return { success: false, error: err.message || 'Slack request failed' };
    }
  }
}
