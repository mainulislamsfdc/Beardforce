/**
 * BillingTab — Settings tab for subscription management & AI usage.
 * Shows current plan, usage meter, plan comparison, and upgrade/cancel controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Zap, CheckCircle2, ArrowUpRight, AlertTriangle,
  Loader2, Crown, Star, Sparkles,
} from 'lucide-react';
import { billingService, PLAN_TIERS, type Subscription, type PlanTier } from '../../services/billingService';

interface BillingTabProps {
  userId: string;
}

export default function BillingTab({ userId }: BillingTabProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    billingService.setUserId(userId);
    const sub = await billingService.getSubscription();
    setSubscription(sub);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const result = await billingService.createCheckout(planId);
      if ('url' in result) {
        window.open(result.url, '_blank');
      }
    } finally {
      setUpgrading('');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will revert to the Free plan.')) return;
    await billingService.cancelSubscription();
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-500" size={24} />
      </div>
    );
  }

  const currentPlan = billingService.getPlanTier(subscription?.plan || 'free');
  const usagePercent = subscription?.ai_calls_limit === -1
    ? -1
    : Math.round(((subscription?.ai_calls_used || 0) / (subscription?.ai_calls_limit || 100)) * 100);
  const isUnlimited = subscription?.ai_calls_limit === -1;

  const planIcons: Record<string, any> = {
    free: Zap,
    pro: Star,
    enterprise: Crown,
  };

  return (
    <div className="space-y-6">
      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              currentPlan.id === 'enterprise' ? 'bg-amber-900/50' :
              currentPlan.id === 'pro' ? 'bg-orange-900/50' : 'bg-gray-700'
            }`}>
              {React.createElement(planIcons[currentPlan.id] || Zap, {
                size: 20,
                className: currentPlan.id === 'enterprise' ? 'text-amber-400' :
                  currentPlan.id === 'pro' ? 'text-orange-400' : 'text-gray-400',
              })}
            </div>
            <div>
              <h4 className="text-white font-semibold">{currentPlan.name} Plan</h4>
              <p className="text-gray-400 text-xs">
                {currentPlan.price === 0 ? 'Free forever' : `$${currentPlan.price}/month`}
              </p>
            </div>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
              subscription?.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-800' :
              subscription?.status === 'past_due' ? 'bg-amber-900/50 text-amber-400 border border-amber-800' :
              'bg-gray-700 text-gray-400 border border-gray-600'
            }`}>
              {subscription?.status || 'active'}
            </span>
          </div>

          {subscription?.current_period_end && (
            <p className="text-gray-500 text-xs">
              Current period ends: {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}

          {currentPlan.id !== 'free' && (
            <button
              onClick={handleCancel}
              className="mt-3 text-xs text-red-400 hover:text-red-300 transition"
            >
              Cancel subscription
            </button>
          )}
        </div>

        {/* Usage Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold text-sm">AI Usage This Month</h4>
            <Sparkles size={16} className="text-orange-400" />
          </div>

          {isUnlimited ? (
            <div>
              <p className="text-2xl font-bold text-white">
                {subscription?.ai_calls_used?.toLocaleString() || 0}
              </p>
              <p className="text-gray-400 text-xs mt-1">Unlimited plan — no cap</p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-white">
                  {subscription?.ai_calls_used?.toLocaleString() || 0}
                </span>
                <span className="text-gray-500 text-sm">
                  / {subscription?.ai_calls_limit?.toLocaleString() || 100}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent >= 90 ? 'bg-red-500' :
                    usagePercent >= 70 ? 'bg-amber-500' :
                    'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>

              <p className="text-gray-500 text-xs mt-1.5">
                {usagePercent}% used
                {usagePercent >= 90 && (
                  <span className="text-amber-400 ml-1">
                    — Consider upgrading
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h3 className="text-white font-semibold mb-3">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_TIERS.map(tier => (
            <PlanCard
              key={tier.id}
              tier={tier}
              isCurrent={tier.id === currentPlan.id}
              isUpgrade={PLAN_TIERS.indexOf(tier) > PLAN_TIERS.findIndex(t => t.id === currentPlan.id)}
              upgrading={upgrading === tier.id}
              onUpgrade={() => handleUpgrade(tier.id)}
            />
          ))}
        </div>
      </div>

      {/* Billing Info */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">How billing works:</strong> AI usage resets on the 1st of each month.
          Upgrades take effect immediately. Downgrades apply at the end of your current billing period.
          All payments are processed securely through Stripe. No credit card required for the Free plan.
        </p>
      </div>
    </div>
  );
}

// ── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({
  tier, isCurrent, isUpgrade, upgrading, onUpgrade,
}: {
  tier: PlanTier;
  isCurrent: boolean;
  isUpgrade: boolean;
  upgrading: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div className={`bg-gray-800 rounded-xl border p-5 flex flex-col ${
      isCurrent ? 'border-orange-600 ring-1 ring-orange-600/30' :
      tier.recommended ? 'border-orange-800' : 'border-gray-700'
    }`}>
      {tier.recommended && !isCurrent && (
        <span className="text-[10px] px-2 py-0.5 bg-orange-900/50 text-orange-400 border border-orange-800 rounded-full w-fit mb-2 font-medium">
          RECOMMENDED
        </span>
      )}

      <h4 className="text-white font-semibold">{tier.name}</h4>
      <div className="flex items-baseline gap-1 mt-1 mb-3">
        <span className="text-2xl font-bold text-white">
          {tier.price === 0 ? 'Free' : `$${tier.price}`}
        </span>
        {tier.price > 0 && <span className="text-gray-500 text-sm">/month</span>}
      </div>

      <ul className="space-y-1.5 flex-1 mb-4">
        {tier.features.map(f => (
          <li key={f} className="flex items-start gap-1.5 text-xs text-gray-400">
            <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="text-center text-xs text-gray-500 py-2 border border-gray-700 rounded-lg">
          Current Plan
        </div>
      ) : isUpgrade ? (
        <button
          onClick={onUpgrade}
          disabled={upgrading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {upgrading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowUpRight size={14} />
          )}
          Upgrade
        </button>
      ) : (
        <div className="text-center text-xs text-gray-500 py-2">
          Downgrade via cancel
        </div>
      )}
    </div>
  );
}
