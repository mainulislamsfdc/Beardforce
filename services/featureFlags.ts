/**
 * FeatureFlags — Per-tenant feature flag system.
 *
 * Enables/disables features per user/org without code changes.
 * Flags are stored in system_config as JSON.
 * Defaults make the system safe if a flag isn't set.
 *
 * Usage:
 *   const enabled = await featureFlags.isEnabled('billing');
 *   if (featureFlags.get('max_ai_calls') > 100) { ... }
 */

import { supabase } from './supabase/client';

// ── Feature flag definitions ────────────────────────────────────────────────

export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean | number | string;
  type: 'boolean' | 'number' | 'string';
  plan?: 'pro' | 'enterprise';  // Minimum plan required
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlag[] = [
  // Core features
  { key: 'meeting_room', label: 'Meeting Room', description: 'Multi-agent team meetings with voice', defaultValue: true, type: 'boolean' },
  { key: 'workflow_automation', label: 'Workflow Automation', description: 'Event-driven workflow engine', defaultValue: true, type: 'boolean' },
  { key: 'data_browser', label: 'Database Explorer', description: 'Full CRUD data browser', defaultValue: true, type: 'boolean' },
  { key: 'audit_trail', label: 'Audit Trail', description: 'Full change history log', defaultValue: true, type: 'boolean' },
  { key: 'voice_output', label: 'Voice Output', description: 'Text-to-speech for agent responses', defaultValue: true, type: 'boolean' },

  // Pro+ features
  { key: 'integrations', label: 'Integrations', description: 'Stripe, SendGrid, Slack connectors', defaultValue: false, type: 'boolean', plan: 'pro' },
  { key: 'api_access', label: 'REST API Access', description: 'Programmatic API with API keys', defaultValue: false, type: 'boolean', plan: 'pro' },
  { key: 'csv_export', label: 'CSV Export', description: 'Export data to CSV', defaultValue: true, type: 'boolean', plan: 'pro' },
  { key: 'approval_queue', label: 'Approval Queue', description: 'CEO approval workflow for major decisions', defaultValue: true, type: 'boolean' },

  // Enterprise features
  { key: 'white_label', label: 'White Label', description: 'Custom branding and domain', defaultValue: false, type: 'boolean', plan: 'enterprise' },
  { key: 'custom_agents', label: 'Custom Agent Prompts', description: 'Override agent personalities per tenant', defaultValue: false, type: 'boolean', plan: 'enterprise' },
  { key: 'agent_templates', label: 'Agent Templates', description: 'Industry-specific agent configs', defaultValue: true, type: 'boolean' },

  // Limits
  { key: 'max_leads', label: 'Max Leads', description: 'Maximum lead records per tenant', defaultValue: 1000, type: 'number' },
  { key: 'max_contacts', label: 'Max Contacts', description: 'Maximum contact records', defaultValue: 500, type: 'number' },
  { key: 'max_workflows', label: 'Max Workflows', description: 'Maximum active workflows', defaultValue: 10, type: 'number' },
  { key: 'max_api_keys', label: 'Max API Keys', description: 'Maximum API keys per tenant', defaultValue: 3, type: 'number', plan: 'pro' },
];

class FeatureFlagService {
  private userId: string | null = null;
  private flags: Record<string, boolean | number | string> = {};
  private loaded = false;

  setUserId(userId: string) {
    if (this.userId !== userId) {
      this.userId = userId;
      this.flags = {};
      this.loaded = false;
    }
  }

  /** Load flags from system_config. Falls back to defaults. */
  async load(): Promise<void> {
    if (this.loaded || !this.userId) return;

    try {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('user_id', this.userId)
        .eq('key', 'feature_flags')
        .single();

      if (data?.value && typeof data.value === 'object') {
        this.flags = data.value as Record<string, boolean | number | string>;
      }
    } catch {
      // No flags stored yet — use defaults
    }

    this.loaded = true;
  }

  /** Get a flag value (boolean | number | string). Returns default if not set. */
  get(key: string): boolean | number | string {
    const def = FEATURE_FLAG_DEFINITIONS.find(f => f.key === key);
    return this.flags[key] ?? def?.defaultValue ?? false;
  }

  /** Check if a boolean feature flag is enabled. */
  isEnabled(key: string): boolean {
    return Boolean(this.get(key));
  }

  /** Get a numeric limit flag. */
  getLimit(key: string): number {
    const val = this.get(key);
    return typeof val === 'number' ? val : parseInt(String(val)) || 0;
  }

  /** Set a flag value and persist to system_config. */
  async set(key: string, value: boolean | number | string): Promise<void> {
    if (!this.userId) return;
    this.flags[key] = value;

    await supabase.from('system_config').upsert({
      user_id: this.userId,
      key: 'feature_flags',
      value: this.flags,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,key' });
  }

  /** Override multiple flags at once (e.g., when upgrading to a plan). */
  async applyPlanDefaults(plan: 'free' | 'pro' | 'enterprise'): Promise<void> {
    const updates: Record<string, boolean | number | string> = {};

    for (const flag of FEATURE_FLAG_DEFINITIONS) {
      if (!flag.plan) continue; // always-available flags, skip

      if (flag.plan === 'pro') {
        updates[flag.key] = plan === 'pro' || plan === 'enterprise';
      } else if (flag.plan === 'enterprise') {
        updates[flag.key] = plan === 'enterprise';
      }
    }

    // Plan-based limits
    if (plan === 'pro') {
      updates['max_leads'] = 10000;
      updates['max_contacts'] = 5000;
      updates['max_workflows'] = 50;
      updates['max_api_keys'] = 10;
    } else if (plan === 'enterprise') {
      updates['max_leads'] = 999999;
      updates['max_contacts'] = 999999;
      updates['max_workflows'] = 999;
      updates['max_api_keys'] = 999;
    }

    this.flags = { ...this.flags, ...updates };

    if (!this.userId) return;
    await supabase.from('system_config').upsert({
      user_id: this.userId,
      key: 'feature_flags',
      value: this.flags,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,key' });
  }

  /** Get all flag values with their definitions (for admin UI). */
  getAllFlags(): Array<FeatureFlag & { currentValue: boolean | number | string }> {
    return FEATURE_FLAG_DEFINITIONS.map(def => ({
      ...def,
      currentValue: this.get(def.key),
    }));
  }

  reset() {
    this.flags = {};
    this.loaded = false;
  }
}

export const featureFlags = new FeatureFlagService();
