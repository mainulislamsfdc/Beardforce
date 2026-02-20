/**
 * BillingService — Manages subscriptions, plan tiers, and AI usage metering.
 *
 * Uses the `subscriptions` table (created in 002_integrations.sql).
 * Stripe interactions go through the stripe-proxy Edge Function.
 */

import { supabase } from './supabase/client';
import { integrationService } from './integrations/IntegrationService';

// ── Plan Definitions ────────────────────────────────────────────────────────

export interface PlanTier {
  id: string;
  name: string;
  price: number;          // monthly USD
  aiCallsLimit: number;
  features: string[];
  recommended?: boolean;
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    aiCallsLimit: 100,
    features: [
      '4 AI agents',
      '100 AI calls/month',
      'Basic CRM (leads, contacts, orders)',
      'Single user',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    aiCallsLimit: 5000,
    recommended: true,
    features: [
      'Everything in Free',
      '5,000 AI calls/month',
      'Integrations (Stripe, SendGrid, Slack)',
      'Workflow automation',
      'Team meeting with voice',
      'CSV/PDF export',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    aiCallsLimit: -1, // unlimited
    features: [
      'Everything in Pro',
      'Unlimited AI calls',
      'Custom agent prompts',
      'API access',
      'Dedicated support',
      'SSO/SAML (coming soon)',
      'Custom integrations',
    ],
  },
];

// ── Subscription Type ───────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  ai_calls_used: number;
  ai_calls_limit: number;
  created_at: string;
  updated_at: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

class BillingService {
  private userId: string | null = null;
  private cached: Subscription | null = null;

  setUserId(userId: string) {
    this.userId = userId;
    this.cached = null;
  }

  /** Get or create subscription for the current user. */
  async getSubscription(): Promise<Subscription> {
    if (!this.userId) throw new Error('User not set');

    // Check cache
    if (this.cached) return this.cached;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', this.userId)
      .single();

    if (data) {
      this.cached = data as Subscription;
      return this.cached;
    }

    // Auto-create free subscription if none exists
    if (error?.code === 'PGRST116') { // not found
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: this.userId,
          plan: 'free',
          status: 'active',
          ai_calls_limit: 100,
        })
        .select()
        .single();

      if (newSub) {
        this.cached = newSub as Subscription;
        return this.cached;
      }
    }

    // Return a default if all else fails
    return {
      id: '',
      user_id: this.userId,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      plan: 'free',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      ai_calls_used: 0,
      ai_calls_limit: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /** Get the plan tier definition for a plan ID. */
  getPlanTier(planId: string): PlanTier {
    return PLAN_TIERS.find(p => p.id === planId) || PLAN_TIERS[0];
  }

  /** Check if the user can make more AI calls. */
  async canMakeAICall(): Promise<boolean> {
    const sub = await this.getSubscription();
    if (sub.ai_calls_limit === -1) return true; // unlimited
    return sub.ai_calls_used < sub.ai_calls_limit;
  }

  /** Increment AI call counter. Returns false if limit reached. */
  async recordAICall(): Promise<boolean> {
    if (!this.userId) return false;

    const sub = await this.getSubscription();

    // Check limit (skip for unlimited plans)
    if (sub.ai_calls_limit !== -1 && sub.ai_calls_used >= sub.ai_calls_limit) {
      return false;
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        ai_calls_used: sub.ai_calls_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId);

    if (!error) {
      this.cached = null; // Invalidate cache
    }
    return !error;
  }

  /** Get usage as a percentage (0-100). Returns -1 for unlimited. */
  async getUsagePercent(): Promise<number> {
    const sub = await this.getSubscription();
    if (sub.ai_calls_limit === -1) return -1;
    if (sub.ai_calls_limit === 0) return 100;
    return Math.round((sub.ai_calls_used / sub.ai_calls_limit) * 100);
  }

  /** Create a Stripe Checkout session for upgrading to a paid plan. */
  async createCheckout(planId: string): Promise<{ url: string } | { error: string }> {
    const tier = this.getPlanTier(planId);
    if (tier.price === 0) {
      return { error: 'Cannot checkout for free plan' };
    }

    const result = await integrationService.execute('stripe', 'create_checkout', {
      amount: tier.price * 100, // cents
      product_name: `RunwayCRM ${tier.name} Plan`,
      mode: 'subscription',
      email: undefined, // Will be filled by Stripe
    });

    if (result.success && result.data?.checkout_url) {
      return { url: result.data.checkout_url };
    }

    return { error: result.error || 'Failed to create checkout session' };
  }

  /** Update plan locally (called after Stripe webhook confirms). */
  async updatePlan(planId: string, stripeSubId?: string): Promise<void> {
    if (!this.userId) return;

    const tier = this.getPlanTier(planId);

    await supabase
      .from('subscriptions')
      .update({
        plan: planId,
        ai_calls_limit: tier.aiCallsLimit === -1 ? -1 : tier.aiCallsLimit,
        stripe_subscription_id: stripeSubId || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId);

    this.cached = null;
  }

  /** Cancel subscription (reverts to free). */
  async cancelSubscription(): Promise<void> {
    if (!this.userId) return;

    await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        ai_calls_limit: 100,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId);

    this.cached = null;
  }

  /** Reset monthly usage (called by cron or on period rollover). */
  async resetMonthlyUsage(): Promise<void> {
    if (!this.userId) return;

    await supabase
      .from('subscriptions')
      .update({
        ai_calls_used: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId);

    this.cached = null;
  }
}

// Singleton
export const billingService = new BillingService();
