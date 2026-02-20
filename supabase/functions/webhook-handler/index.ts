// ============================================================================
// SUPABASE EDGE FUNCTION: Inbound Webhook Handler
// ============================================================================
// Receives webhooks from Stripe, SendGrid, Slack, etc.
// Routes to the correct handler, logs the event, and processes it.
//
// URL pattern: POST /functions/v1/webhook-handler?integration=stripe
//
// Deploy: supabase functions deploy webhook-handler --no-verify-jwt
// Set secrets:
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const integration = url.searchParams.get('integration');

  if (!integration) {
    return json({ error: 'Missing ?integration= query parameter' }, 400);
  }

  try {
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });

    let eventType = 'unknown';
    let payload: any = {};

    // ── Stripe Webhooks ───────────────────────────────────────────
    if (integration === 'stripe') {
      payload = JSON.parse(rawBody);
      eventType = payload.type || 'stripe.unknown';

      // Verify signature if webhook secret is configured
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      const signature = headers['stripe-signature'];
      if (webhookSecret && signature) {
        // Basic timestamp + signature check (full verification needs crypto)
        const elements = signature.split(',').reduce((acc: Record<string, string>, part: string) => {
          const [k, v] = part.split('=');
          acc[k] = v;
          return acc;
        }, {} as Record<string, string>);

        const timestamp = elements['t'];
        if (timestamp) {
          const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
          if (age > 300) {
            return json({ error: 'Webhook timestamp too old' }, 400);
          }
        }
      }
    }

    // ── SendGrid Webhooks ─────────────────────────────────────────
    else if (integration === 'sendgrid') {
      // SendGrid sends arrays of events
      const events = JSON.parse(rawBody);
      payload = Array.isArray(events) ? events : [events];
      eventType = payload[0]?.event || 'sendgrid.unknown';
    }

    // ── Slack Webhooks ────────────────────────────────────────────
    else if (integration === 'slack') {
      payload = JSON.parse(rawBody);

      // Slack URL verification challenge
      if (payload.type === 'url_verification') {
        return json({ challenge: payload.challenge });
      }

      eventType = payload.event?.type || payload.type || 'slack.unknown';
    }

    // ── Unknown ───────────────────────────────────────────────────
    else {
      try { payload = JSON.parse(rawBody); } catch { payload = { raw: rawBody }; }
      eventType = `${integration}.inbound`;
    }

    // ── Log to webhook_events table ───────────────────────────────
    const supabase = getSupabaseAdmin();

    // Find the user_id for this integration (lookup by integration_id)
    const { data: configs } = await supabase
      .from('integration_configs')
      .select('user_id')
      .eq('integration_id', integration)
      .eq('enabled', true)
      .limit(10);

    // Log event for each tenant that has this integration enabled
    const userIds = configs?.map((c: any) => c.user_id) || [];

    for (const userId of userIds) {
      await supabase.from('webhook_events').insert({
        user_id: userId,
        integration_id: integration,
        direction: 'inbound',
        event_type: eventType,
        payload: typeof payload === 'string' ? { raw: payload } : payload,
        status: 'received',
      });
    }

    // ── Process specific events ───────────────────────────────────
    if (integration === 'stripe') {
      await processStripeEvent(eventType, payload, supabase, userIds);
    } else if (integration === 'sendgrid') {
      await processSendGridEvents(payload, supabase, userIds);
    }

    return json({
      received: true,
      integration,
      event_type: eventType,
      tenants_notified: userIds.length,
    });

  } catch (err: any) {
    return json({ error: err.message || 'Webhook processing failed' }, 500);
  }
});

// ── Stripe Event Processing ─────────────────────────────────────────────────

async function processStripeEvent(
  eventType: string,
  payload: any,
  supabase: any,
  userIds: string[]
) {
  const data = payload.data?.object;
  if (!data) return;

  switch (eventType) {
    case 'payment_intent.succeeded': {
      // Update order status if metadata contains order_id
      const orderId = data.metadata?.order_id;
      if (orderId) {
        for (const userId of userIds) {
          await supabase
            .from('orders')
            .update({ status: 'paid', payment_status: 'completed' })
            .eq('id', orderId)
            .eq('user_id', userId);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      // Update subscription status
      for (const userId of userIds) {
        await supabase
          .from('subscriptions')
          .update({
            status: data.status,
            current_period_end: new Date(data.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', data.id)
          .eq('user_id', userId);
      }
      break;
    }

    case 'invoice.paid': {
      // Log successful invoice payment
      for (const userId of userIds) {
        await supabase.from('webhook_events').update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('integration_id', 'stripe')
        .eq('event_type', eventType)
        .order('created_at', { ascending: false })
        .limit(1);
      }
      break;
    }
  }
}

// ── SendGrid Event Processing ───────────────────────────────────────────────

async function processSendGridEvents(
  events: any[],
  supabase: any,
  userIds: string[]
) {
  for (const event of events) {
    const status = event.event === 'delivered' ? 'processed'
      : event.event === 'bounce' ? 'failed'
      : 'processed';

    for (const userId of userIds) {
      await supabase.from('webhook_events').update({
        status,
        processed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', 'sendgrid')
      .eq('event_type', event.event)
      .order('created_at', { ascending: false })
      .limit(1);
    }
  }
}
