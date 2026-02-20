/**
 * IntegrationAdapter — Base interface for all third-party integrations.
 * Follows the same adapter pattern as DatabaseAdapter.
 *
 * Each integration (Stripe, SendGrid, Slack, etc.) implements this interface.
 * The IntegrationService facade manages lifecycle and routing.
 */

export type IntegrationCategory = 'payment' | 'communication' | 'data' | 'reporting';

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface IntegrationMeta {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;                    // Lucide icon name
  requiredConfig: ConfigField[];
  supportedActions: string[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  placeholder?: string;
  required: boolean;
  options?: string[];              // For 'select' type
}

export interface IntegrationConfig {
  id: string;
  user_id: string;
  integration_id: string;
  enabled: boolean;
  config: Record<string, string>;
  webhook_url?: string;
  last_synced_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export abstract class IntegrationAdapter {
  abstract readonly meta: IntegrationMeta;

  /**
   * Connect the integration with provided credentials.
   * Validates the config and tests the connection.
   */
  abstract connect(config: Record<string, string>): Promise<IntegrationResult>;

  /**
   * Disconnect / revoke the integration.
   */
  abstract disconnect(): Promise<void>;

  /**
   * Test if the current connection is alive.
   */
  abstract testConnection(config: Record<string, string>): Promise<boolean>;

  /**
   * Execute a named action with parameters.
   * Each adapter defines its own supported actions.
   */
  abstract execute(
    action: string,
    params: Record<string, any>,
    config: Record<string, string>
  ): Promise<IntegrationResult>;

  /**
   * Handle an inbound webhook payload.
   * Optional — only integrations that receive webhooks implement this.
   */
  async handleWebhook(
    _payload: unknown,
    _headers: Record<string, string>
  ): Promise<IntegrationResult> {
    return { success: false, error: 'Webhooks not supported by this integration' };
  }
}
