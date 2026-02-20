// ============================================================================
// SUPABASE EDGE FUNCTION: Gemini API Proxy
// ============================================================================
// Keeps the Gemini API key server-side — never exposed to the browser.
// Acts as a transparent proxy to the Gemini generateContent REST endpoint.
//
// Deploy: supabase functions deploy gemini-proxy --no-verify-jwt
// Set secret: supabase secrets set GEMINI_API_KEY=AIzaSy...
//
// Client usage (see services/geminiProxyClient.ts):
//   POST /functions/v1/gemini-proxy
//   Body: { model, contents, systemInstruction?, tools? }
// ============================================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return json({
        error: 'GEMINI_API_KEY not configured. Run: supabase secrets set GEMINI_API_KEY=AIzaSy...'
      }, 500);
    }

    const body = await req.json();

    // Health check
    if (body.ping) {
      return json({ status: 'ok', provider: 'gemini-proxy-active' });
    }

    const { model = 'gemini-2.0-flash', ...requestBody } = body;

    if (!requestBody.contents || !Array.isArray(requestBody.contents)) {
      return json({ error: 'Missing required field: contents (array)' }, 400);
    }

    // Forward to Gemini REST generateContent endpoint
    const geminiUrl = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return json(
        { error: `Gemini API error: ${geminiResponse.status}`, details: result },
        geminiResponse.status
      );
    }

    return json(result);

  } catch (err: any) {
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
