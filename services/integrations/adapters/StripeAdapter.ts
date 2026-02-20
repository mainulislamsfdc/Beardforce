/**
 * StripeAdapter — Payments & subscriptions via Stripe.
 *
 * Actions:
 *   create_checkout    — Create a Stripe Checkout session
 *   create_payment     — Create a one-time payment intent
 *   get_balance        — Get account balance
 *   list_invoices      — List recent invoices
 *   refund             — Refund a payment
 *
 * Webhooks:
 *   payment_intent.succeeded, customer.subscription.updated, invoice.paid
 *
 * Note: Actual Stripe API calls should go through a Supabase Edge Function
 * to keep the secret key server-side. This adapter calls the edge function.
 */

import {
  IntegrationAdapter,
  IntegrationMeta,
  IntegrationResult,
} from '../IntegrationAdapter';

const STRIPE_PROXY_URL = '/functions/v1/stripe-proxy';

export class StripeAdapter extends IntegrationAdapter {
  readonly meta: IntegrationMeta = {
    id: 'stripe',
    name: 'Stripe Payments',
    description: 'Process payments, manage subscriptions, and handle invoices.',
    category: 'payment',
    icon: 'CreditCard',
    requiredConfig: [
      {
        key: 'api_key',
        label: 'Stripe Secret Key',
        type: 'password',
        placeholder: 'sk_live_...',
        required: true,
      },
      {
        key: 'webhook_secret',
        label: 'Webhook Signing Secret',
        type: 'password',
        placeholder: 'whsec_...',
        required: false,
      },
    ],
    supportedActions: [
      'create_checkout',
      'create_payment',
      'get_balance',
      'list_invoices',
      'refund',
    ],
  };

  async connect(config: Record<string, string>): Promise<IntegrationResult> {
    if (!config.api_key?.startsWith('sk_')) {
      return { success: false, error: 'Invalid Stripe key. Must start with sk_live_ or sk_test_' };
    }
    const alive = await this.testConnection(config);
    if (!alive) {
      return { success: false, error: 'Could not connect to Stripe. Check your API key.' };
    }
    return { success: true, data: { connected: true } };
  }

  async disconnect(): Promise<void> {
    // No persistent connection to tear down
  }

  async testConnection(config: Record<string, string>): Promise<boolean> {
    try {
      const result = await this.execute('get_balance', {}, config);
      return result.success;
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
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return { success: false, error: 'Supabase URL not configured' };
      }

      const response = await fetch(`${supabaseUrl}${STRIPE_PROXY_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
        },
        body: JSON.stringify({ action, params }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Stripe API error: ${error}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Stripe request failed' };
    }
  }

  async handleWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<IntegrationResult> {
    // Webhook signature verification happens in the edge function
    const event = payload as { type?: string; data?: any };
    if (!event?.type) {
      return { success: false, error: 'Invalid webhook payload' };
    }

    return {
      success: true,
      data: {
        event_type: event.type,
        processed: true,
      },
    };
  }
}
