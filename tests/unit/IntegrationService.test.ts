import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeAdapter } from '../../services/integrations/adapters/StripeAdapter';
import { SendGridAdapter } from '../../services/integrations/adapters/SendGridAdapter';
import { SlackAdapter } from '../../services/integrations/adapters/SlackAdapter';

describe('StripeAdapter', () => {
  const adapter = new StripeAdapter();

  it('has correct metadata', () => {
    expect(adapter.meta.id).toBe('stripe');
    expect(adapter.meta.category).toBe('payment');
    expect(adapter.meta.supportedActions).toContain('create_checkout');
    expect(adapter.meta.supportedActions).toContain('refund');
  });

  it('rejects invalid API key', async () => {
    const result = await adapter.connect({ api_key: 'invalid-key' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid Stripe key/);
  });

  it('accepts key starting with sk_', async () => {
    // Mock fetch for the test connection (get_balance)
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ available: [], pending: [] }),
      text: () => Promise.resolve(''),
      headers: new Headers(),
    } as any);

    const result = await adapter.connect({ api_key: 'sk_test_abc123' });
    expect(result.success).toBe(true);
  });

  it('required config includes api_key', () => {
    const apiKeyField = adapter.meta.requiredConfig.find(f => f.key === 'api_key');
    expect(apiKeyField).toBeDefined();
    expect(apiKeyField?.required).toBe(true);
    expect(apiKeyField?.type).toBe('password');
  });
});

describe('SendGridAdapter', () => {
  const adapter = new SendGridAdapter();

  it('has correct metadata', () => {
    expect(adapter.meta.id).toBe('sendgrid');
    expect(adapter.meta.category).toBe('communication');
    expect(adapter.meta.supportedActions).toContain('send_email');
  });

  it('rejects invalid API key', async () => {
    const result = await adapter.connect({ api_key: 'bad', from_email: 'a@b.com' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid SendGrid key/);
  });

  it('rejects invalid from email', async () => {
    const result = await adapter.connect({ api_key: 'SG.valid', from_email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/valid from email/);
  });

  it('accepts valid config', async () => {
    const result = await adapter.connect({ api_key: 'SG.valid', from_email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('testConnection validates key format', async () => {
    expect(await adapter.testConnection({ api_key: 'SG.valid' })).toBe(true);
    expect(await adapter.testConnection({ api_key: 'invalid' })).toBe(false);
  });
});

describe('SlackAdapter', () => {
  const adapter = new SlackAdapter();

  it('has correct metadata', () => {
    expect(adapter.meta.id).toBe('slack');
    expect(adapter.meta.category).toBe('communication');
    expect(adapter.meta.supportedActions).toContain('send_message');
    expect(adapter.meta.supportedActions).toContain('send_rich');
  });

  it('rejects invalid webhook URL', async () => {
    const result = await adapter.connect({ webhook_url: 'https://example.com/bad' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid Slack webhook/);
  });

  it('connects with valid webhook URL', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('ok'),
    } as any);

    const result = await adapter.connect({
      webhook_url: 'https://hooks.slack.com/services/T123/B456/xyz',
    });
    expect(result.success).toBe(true);
  });

  it('execute send_message calls fetch with correct body', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('ok'),
    } as any);

    const result = await adapter.execute(
      'send_message',
      { text: 'Hello from CRM' },
      { webhook_url: 'https://hooks.slack.com/services/T/B/x', channel: '#general' }
    );

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/T/B/x',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Hello from CRM'),
      })
    );
  });

  it('execute returns error for unknown action', async () => {
    const result = await adapter.execute(
      'unknown_action',
      {},
      { webhook_url: 'https://hooks.slack.com/services/T/B/x' }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unknown action/);
  });
});
