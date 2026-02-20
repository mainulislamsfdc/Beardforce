// ============================================================================
// SUPABASE EDGE FUNCTION: REST API v1
// ============================================================================
// Public REST API for programmatic CRM access.
// Authenticates via API key (X-API-Key header) or Supabase JWT.
//
// Endpoints:
//   GET    /functions/v1/api/leads          — List leads
//   GET    /functions/v1/api/leads/:id       — Get a lead
//   POST   /functions/v1/api/leads           — Create a lead
//   PATCH  /functions/v1/api/leads/:id       — Update a lead
//   DELETE /functions/v1/api/leads/:id       — Delete a lead
//   (same pattern for contacts, orders, opportunities, accounts, products)
//
// Deploy: supabase functions deploy api --no-verify-jwt
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const ALLOWED_TABLES = ['leads', 'contacts', 'orders', 'opportunities', 'accounts', 'products'];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/** Authenticate request via X-API-Key header. Returns user_id and scopes. */
async function authenticateApiKey(
  apiKey: string
): Promise<{ userId: string; scopes: string[] } | null> {
  if (!apiKey) return null;

  const supabase = getSupabaseAdmin();
  const prefix = apiKey.slice(0, 8);

  // Look up key by prefix
  const { data: keys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', prefix)
    .eq('is_active', true);

  if (!keys || keys.length === 0) return null;

  // Hash the provided key and compare
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const matchedKey = keys.find((k: any) => k.key_hash === hashHex);
  if (!matchedKey) return null;

  // Check expiry
  if (matchedKey.expires_at && new Date(matchedKey.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', matchedKey.id)
    .then(() => {});

  return {
    userId: matchedKey.user_id,
    scopes: matchedKey.scopes || ['read'],
  };
}

/** Parse route: /functions/v1/api/{table}/{id?} */
function parseRoute(url: URL): { table: string; id?: string } | null {
  const path = url.pathname;
  // Match /functions/v1/api/{table} or /functions/v1/api/{table}/{id}
  const match = path.match(/\/functions\/v1\/api\/([a-z_]+)(?:\/([a-zA-Z0-9-]+))?/);
  if (!match) return null;

  const table = match[1];
  if (!ALLOWED_TABLES.includes(table)) return null;

  return { table, id: match[2] };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Authentication ──────────────────────────────────────────
    const apiKey = req.headers.get('x-api-key');
    let userId: string | null = null;
    let scopes: string[] = ['read'];

    if (apiKey) {
      const auth = await authenticateApiKey(apiKey);
      if (!auth) {
        return json({ error: 'Invalid or expired API key' }, 401);
      }
      userId = auth.userId;
      scopes = auth.scopes;
    } else {
      // Fall back to Supabase JWT
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          scopes = ['read', 'write', 'delete', 'admin'];
        }
      }
    }

    if (!userId) {
      return json({ error: 'Authentication required. Provide X-API-Key header or Bearer token.' }, 401);
    }

    // ── Route Parsing ───────────────────────────────────────────
    const url = new URL(req.url);
    const route = parseRoute(url);

    if (!route) {
      return json({
        error: 'Invalid endpoint',
        available: ALLOWED_TABLES.map(t => `/functions/v1/api/${t}`),
      }, 404);
    }

    const supabase = getSupabaseAdmin();
    const { table, id } = route;

    // ── GET (list or single) ────────────────────────────────────
    if (req.method === 'GET') {
      if (!scopes.includes('read')) {
        return json({ error: 'Insufficient scope: read required' }, 403);
      }

      if (id) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error || !data) return json({ error: 'Not found' }, 404);
        return json({ data });
      }

      // List with pagination
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = (page - 1) * limit;
      const orderBy = url.searchParams.get('order_by') || 'created_at';
      const order = url.searchParams.get('order') || 'desc';

      let query = supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order(orderBy, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      // Simple filtering: ?status=active&source=web
      for (const [key, value] of url.searchParams) {
        if (['page', 'limit', 'order_by', 'order'].includes(key)) continue;
        query = query.eq(key, value);
      }

      const { data, error, count } = await query;

      if (error) return json({ error: error.message }, 400);

      return json({
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // ── POST (create) ───────────────────────────────────────────
    if (req.method === 'POST') {
      if (!scopes.includes('write')) {
        return json({ error: 'Insufficient scope: write required' }, 403);
      }

      const body = await req.json();
      delete body.id;
      delete body.user_id;
      delete body.created_at;

      const { data, error } = await supabase
        .from(table)
        .insert({ ...body, user_id: userId })
        .select()
        .single();

      if (error) return json({ error: error.message }, 400);
      return json({ data }, 201);
    }

    // ── PATCH (update) ──────────────────────────────────────────
    if (req.method === 'PATCH') {
      if (!scopes.includes('write')) {
        return json({ error: 'Insufficient scope: write required' }, 403);
      }
      if (!id) return json({ error: 'Record ID required for PATCH' }, 400);

      const body = await req.json();
      delete body.id;
      delete body.user_id;

      const { data, error } = await supabase
        .from(table)
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: 'Not found' }, 404);
      return json({ data });
    }

    // ── DELETE ──────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!scopes.includes('delete')) {
        return json({ error: 'Insufficient scope: delete required' }, 403);
      }
      if (!id) return json({ error: 'Record ID required for DELETE' }, 400);

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) return json({ error: error.message }, 400);
      return json({ deleted: true });
    }

    return json({ error: `Method ${req.method} not allowed` }, 405);

  } catch (err: any) {
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
