// ============================================================================
// SUPABASE EDGE FUNCTION: Email Proxy (SendGrid)
// ============================================================================
// Keeps the SendGrid API key server-side.
// The SendGridAdapter calls this function; it proxies to the SendGrid API.
//
// Deploy: supabase functions deploy email-proxy --no-verify-jwt
// Set secret: supabase secrets set SENDGRID_API_KEY=SG.xxxxx
// ============================================================================

const SENDGRID_API = 'https://api.sendgrid.com/v3';

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, params = {}, api_key } = body;

    // Prefer server-side secret, fall back to per-tenant key from request
    const apiKey = Deno.env.get('SENDGRID_API_KEY') || api_key;

    if (!apiKey) {
      return json({ error: 'SENDGRID_API_KEY not configured' }, 500);
    }

    switch (action) {
      // ── Send Email ──────────────────────────────────────────────
      case 'send_email': {
        const { to, subject, html, text, from_email, from_name } = params;

        if (!to || !subject) {
          return json({ error: 'Missing required fields: to, subject' }, 400);
        }

        const payload = {
          personalizations: [{ to: [{ email: to }] }],
          from: {
            email: from_email || 'noreply@runwaycrm.com',
            name: from_name || 'RunwayCRM',
          },
          subject,
          content: [
            ...(html ? [{ type: 'text/html', value: html }] : []),
            ...(text ? [{ type: 'text/plain', value: text }] : []),
            ...(!html && !text ? [{ type: 'text/plain', value: 'No content' }] : []),
          ],
        };

        const res = await fetch(`${SENDGRID_API}/mail/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          return json({ error: `SendGrid error: ${errorBody}` }, res.status);
        }

        // SendGrid returns 202 with empty body on success
        return json({
          sent: true,
          to,
          subject,
          message_id: res.headers.get('X-Message-Id') || null,
        });
      }

      // ── Send Template ───────────────────────────────────────────
      case 'send_template': {
        const { to, template_id, dynamic_data, from_email, from_name } = params;

        if (!to || !template_id) {
          return json({ error: 'Missing required fields: to, template_id' }, 400);
        }

        const payload = {
          personalizations: [{
            to: [{ email: to }],
            dynamic_template_data: dynamic_data || {},
          }],
          from: {
            email: from_email || 'noreply@runwaycrm.com',
            name: from_name || 'RunwayCRM',
          },
          template_id,
        };

        const res = await fetch(`${SENDGRID_API}/mail/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          return json({ error: `SendGrid template error: ${errorBody}` }, res.status);
        }

        return json({ sent: true, to, template_id });
      }

      // ── Get Stats ───────────────────────────────────────────────
      case 'get_stats': {
        const days = params.days || 7;
        const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

        const res = await fetch(
          `${SENDGRID_API}/stats?start_date=${startDate}`,
          {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          }
        );

        if (!res.ok) {
          return json({ error: 'Failed to fetch stats' }, res.status);
        }

        const data = await res.json();

        // Aggregate stats
        const totals = { requests: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, spam_reports: 0 };
        for (const day of data) {
          for (const stat of day.stats || []) {
            const m = stat.metrics || {};
            totals.requests += m.requests || 0;
            totals.delivered += m.delivered || 0;
            totals.opens += m.opens || 0;
            totals.clicks += m.clicks || 0;
            totals.bounces += m.bounces || 0;
            totals.spam_reports += m.spam_reports || 0;
          }
        }

        return json({
          period_days: days,
          totals,
          daily: data.map((d: any) => ({
            date: d.date,
            ...d.stats?.[0]?.metrics,
          })),
        });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    return json({ error: err.message || 'Email proxy error' }, 500);
  }
});
