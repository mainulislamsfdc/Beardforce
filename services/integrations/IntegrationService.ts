/**
 * IntegrationService — Facade for managing all integrations.
 *
 * Responsibilities:
 * - Registry of available integrations
 * - Load/save tenant configs from Supabase
 * - Route execute() calls to the correct adapter
 * - Provide integration metadata to the UI
 */

import { supabase } from '../supabase/client';
import {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationMeta,
  IntegrationResult,
} from './IntegrationAdapter';
import { StripeAdapter } from './adapters/StripeAdapter';
import { SendGridAdapter } from './adapters/SendGridAdapter';
import { SlackAdapter } from './adapters/SlackAdapter';

class IntegrationService {
  private adapters: Map<string, IntegrationAdapter> = new Map();
  private configCache: Map<string, IntegrationConfig> = new Map();
  private userId: string | null = null;

  constructor() {
    // Register all available integrations
    this.register(new StripeAdapter());
    this.register(new SendGridAdapter());
    this.register(new SlackAdapter());
  }

  private register(adapter: IntegrationAdapter) {
    this.adapters.set(adapter.meta.id, adapter);
  }

  /** Set the current user for scoping config queries. */
  setUserId(userId: string) {
    this.userId = userId;
    this.configCache.clear();
  }

  /** Get metadata for all available integrations. */
  getAvailableIntegrations(): IntegrationMeta[] {
    return Array.from(this.adapters.values()).map(a => a.meta);
  }

  /** Get metadata for a specific integration. */
  getIntegrationMeta(integrationId: string): IntegrationMeta | undefined {
    return this.adapters.get(integrationId)?.meta;
  }

  // ─── Config CRUD ────────────────────────────────────────────

  /** Load all integration configs for the current user. */
  async loadConfigs(): Promise<IntegrationConfig[]> {
    if (!this.userId) return [];

    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('user_id', this.userId);

    if (error) {
      console.warn('Failed to load integration configs:', error.message);
      return [];
    }

    const configs = (data || []) as IntegrationConfig[];
    this.configCache.clear();
    for (const cfg of configs) {
      this.configCache.set(cfg.integration_id, cfg);
    }
    return configs;
  }

  /** Get config for a specific integration. */
  async getConfig(integrationId: string): Promise<IntegrationConfig | null> {
    if (this.configCache.has(integrationId)) {
      return this.configCache.get(integrationId)!;
    }

    if (!this.userId) return null;

    const { data } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('integration_id', integrationId)
      .single();

    if (data) {
      this.configCache.set(integrationId, data as IntegrationConfig);
    }
    return (data as IntegrationConfig) || null;
  }

  /** Save (upsert) integration config. */
  async saveConfig(
    integrationId: string,
    config: Record<string, string>,
    enabled: boolean
  ): Promise<IntegrationResult> {
    if (!this.userId) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('integration_configs')
      .upsert(
        {
          user_id: this.userId,
          integration_id: integrationId,
          config,
          enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,integration_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    // Update cache
    this.configCache.delete(integrationId);
    return { success: true };
  }

  /** Delete integration config (disconnect). */
  async deleteConfig(integrationId: string): Promise<IntegrationResult> {
    if (!this.userId) return { success: false, error: 'Not authenticated' };

    const adapter = this.adapters.get(integrationId);
    if (adapter) {
      await adapter.disconnect();
    }

    const { error } = await supabase
      .from('integration_configs')
      .delete()
      .eq('user_id', this.userId)
      .eq('integration_id', integrationId);

    if (error) {
      return { success: false, error: error.message };
    }

    this.configCache.delete(integrationId);
    return { success: true };
  }

  // ─── Connection Lifecycle ───────────────────────────────────

  /** Connect an integration: validate config, test connection, save. */
  async connect(
    integrationId: string,
    config: Record<string, string>
  ): Promise<IntegrationResult> {
    const adapter = this.adapters.get(integrationId);
    if (!adapter) {
      return { success: false, error: `Unknown integration: ${integrationId}` };
    }

    // Validate required fields
    for (const field of adapter.meta.requiredConfig) {
      if (field.required && !config[field.key]) {
        return { success: false, error: `Missing required field: ${field.label}` };
      }
    }

    // Test connection via adapter
    const result = await adapter.connect(config);
    if (!result.success) return result;

    // Persist config
    const saveResult = await this.saveConfig(integrationId, config, true);
    if (!saveResult.success) return saveResult;

    return { success: true, data: { connected: true } };
  }

  /** Disconnect an integration. */
  async disconnect(integrationId: string): Promise<IntegrationResult> {
    return this.deleteConfig(integrationId);
  }

  /** Test if an integration is currently connected and working. */
  async testConnection(integrationId: string): Promise<boolean> {
    const adapter = this.adapters.get(integrationId);
    const config = await this.getConfig(integrationId);
    if (!adapter || !config?.enabled) return false;
    return adapter.testConnection(config.config);
  }

  // ─── Action Execution ──────────────────────────────────────

  /**
   * Execute an action on an integration.
   * Loads the config, checks if enabled, and delegates to the adapter.
   */
  async execute(
    integrationId: string,
    action: string,
    params: Record<string, any> = {}
  ): Promise<IntegrationResult> {
    const adapter = this.adapters.get(integrationId);
    if (!adapter) {
      return { success: false, error: `Unknown integration: ${integrationId}` };
    }

    const config = await this.getConfig(integrationId);
    if (!config?.enabled) {
      return { success: false, error: `${adapter.meta.name} is not connected. Enable it in Settings > Integrations.` };
    }

    if (!adapter.meta.supportedActions.includes(action)) {
      return { success: false, error: `Action '${action}' is not supported by ${adapter.meta.name}` };
    }

    const result = await adapter.execute(action, params, config.config);

    // Log the action as a webhook event for audit trail
    if (this.userId) {
      await supabase.from('webhook_events').insert({
        user_id: this.userId,
        integration_id: integrationId,
        direction: 'outbound',
        event_type: action,
        payload: { params, result: result.success ? 'ok' : result.error },
        status: result.success ? 'processed' : 'failed',
        processed_at: new Date().toISOString(),
      });
    }

    return result;
  }

  // ─── Convenience Methods ───────────────────────────────────

  /** Send an email via the configured email provider. */
  async sendEmail(to: string, subject: string, body: string): Promise<IntegrationResult> {
    return this.execute('sendgrid', 'send_email', { to, subject, html: body });
  }

  /** Post a message to Slack. */
  async notifySlack(message: string): Promise<IntegrationResult> {
    return this.execute('slack', 'send_message', { text: message });
  }

  /** Check if a specific integration is enabled. */
  async isEnabled(integrationId: string): Promise<boolean> {
    const config = await this.getConfig(integrationId);
    return config?.enabled ?? false;
  }

  /** Get connection status summary for all integrations. */
  async getStatusSummary(): Promise<Array<{ id: string; name: string; enabled: boolean; error?: string }>> {
    const configs = await this.loadConfigs();
    return this.getAvailableIntegrations().map(meta => {
      const cfg = configs.find(c => c.integration_id === meta.id);
      return {
        id: meta.id,
        name: meta.name,
        enabled: cfg?.enabled ?? false,
        error: cfg?.error_message,
      };
    });
  }
}

// Singleton
export const integrationService = new IntegrationService();
