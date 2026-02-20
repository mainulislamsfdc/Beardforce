// ============================================================================
// SUPABASE EDGE FUNCTION: Stripe API Proxy
// ============================================================================
// Keeps the Stripe secret key server-side — never exposed to the browser.
// The StripeAdapter calls this function; it proxies to the Stripe REST API.
//
// Deploy: supabase functions deploy stripe-proxy --no-verify-jwt
// Set secret: supabase secrets set STRIPE_SECRET_KEY=sk_live_...
// ============================================================================

const STRIPE_API = 'https://api.stripe.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function stripeRequest(
  path: string,
  method: string,
  apiKey: string,
  body?: Record<string, any>
): Promise<any> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = { method, headers };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = new URLSearchParams(flattenParams(body)).toString();
  }

  const res = await fetch(`${STRIPE_API}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe API error: ${res.status}`);
  }

  return data;
}

/** Flatten nested objects for Stripe's form-encoded API. */
function flattenParams(obj: Record<string, any>, prefix = ''): [string, string][] {
  const entries: [string, string][] = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (val != null && typeof val === 'object' && !Array.isArray(val)) {
      entries.push(...flattenParams(val, fullKey));
    } else if (val != null) {
      entries.push([fullKey, String(val)]);
    }
  }
  return entries;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use server-side secret, falling back to Authorization header (for testing)
    const apiKey = Deno.env.get('STRIPE_SECRET_KEY')
      || req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);
    }

    const { action, params = {} } = await req.json();

    switch (action) {
      // ── Checkout Sessions ───────────────────────────────────────
      case 'create_checkout': {
        const data = await stripeRequest('/checkout/sessions', 'POST', apiKey, {
          mode: params.mode || 'payment',
          success_url: params.success_url || `${req.headers.get('origin')}/dashboard?payment=success`,
          cancel_url: params.cancel_url || `${req.headers.get('origin')}/dashboard?payment=cancelled`,
          'line_items[0][price_data][currency]': params.currency || 'usd',
          'line_items[0][price_data][unit_amount]': params.amount, // in cents
          'line_items[0][price_data][product_data][name]': params.product_name || 'CRM Order',
          'line_items[0][quantity]': params.quantity || 1,
          customer_email: params.email,
        });
        return json({ checkout_url: data.url, session_id: data.id });
      }

      // ── Payment Intents ─────────────────────────────────────────
      case 'create_payment': {
        const data = await stripeRequest('/payment_intents', 'POST', apiKey, {
          amount: params.amount,
          currency: params.currency || 'usd',
          description: params.description,
          receipt_email: params.email,
          metadata: params.metadata || {},
        });
        return json({ client_secret: data.client_secret, payment_intent_id: data.id, status: data.status });
      }

      // ── Balance ─────────────────────────────────────────────────
      case 'get_balance': {
        const data = await stripeRequest('/balance', 'GET', apiKey);
        return json({
          available: data.available?.map((b: any) => ({ amount: b.amount / 100, currency: b.currency })),
          pending: data.pending?.map((b: any) => ({ amount: b.amount / 100, currency: b.currency })),
        });
      }

      // ── Invoices ────────────────────────────────────────────────
      case 'list_invoices': {
        const limit = params.limit || 10;
        const data = await stripeRequest(`/invoices?limit=${limit}`, 'GET', apiKey);
        return json({
          invoices: data.data?.map((inv: any) => ({
            id: inv.id,
            amount_due: inv.amount_due / 100,
            amount_paid: inv.amount_paid / 100,
            currency: inv.currency,
            status: inv.status,
            customer_email: inv.customer_email,
            created: new Date(inv.created * 1000).toISOString(),
          })),
        });
      }

      // ── Refunds ─────────────────────────────────────────────────
      case 'refund': {
        if (!params.payment_intent_id) {
          return json({ error: 'Missing payment_intent_id' }, 400);
        }
        const data = await stripeRequest('/refunds', 'POST', apiKey, {
          payment_intent: params.payment_intent_id,
          amount: params.amount, // optional — partial refund in cents
        });
        return json({ refund_id: data.id, status: data.status, amount: data.amount / 100 });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    return json({ error: err.message || 'Stripe proxy error' }, 500);
  }
});
