// ============================================================================
// SUPABASE EDGE FUNCTION: Tenant Provisioning
// ============================================================================
// Creates a new tenant (organisation + admin user + default config).
// Called from the self-service signup flow or admin panel.
//
// POST /functions/v1/provision-tenant
// Body: { email, password, orgName, plan?, industry? }
// Returns: { orgId, userId, loginUrl }
//
// Deploy: supabase functions deploy provision-tenant
// Uses SUPABASE_SERVICE_ROLE_KEY — never expose this to the client.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Only allow POST
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const body = await req.json();
    const { email, password, orgName, plan = 'free', industry = 'General' } = body;

    if (!email || !password || !orgName) {
      return json({ error: 'Missing required fields: email, password, orgName' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── 1. Create Auth User ─────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return json({ error: authError?.message || 'Failed to create user' }, 400);
    }

    const userId = authData.user.id;

    // ── 2. Create Organisation ──────────────────────────────────
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug: `${slug}-${Date.now().toString(36)}`,
        created_by: userId,
      })
      .select()
      .single();

    if (orgError || !org) {
      // Rollback user
      await supabase.auth.admin.deleteUser(userId);
      return json({ error: orgError?.message || 'Failed to create organisation' }, 400);
    }

    const orgId = org.id;

    // ── 3. Add User as Admin Member ─────────────────────────────
    await supabase.from('org_members').insert({
      org_id: orgId,
      user_id: userId,
      role: 'admin',
    });

    // ── 4. Create Default Subscription (Free) ──────────────────
    const planLimits: Record<string, number> = { free: 100, pro: 5000, enterprise: -1 };
    await supabase.from('subscriptions').insert({
      user_id: userId,
      plan,
      status: 'active',
      ai_calls_limit: planLimits[plan] || 100,
    });

    // ── 5. Create Default System Config ────────────────────────
    await supabase.from('system_config').insert([
      {
        user_id: userId,
        key: 'org_info',
        value: { name: orgName, industry, plan },
      },
      {
        user_id: userId,
        key: 'feature_flags',
        value: {
          meeting_room: true,
          workflow_automation: true,
          data_browser: true,
          audit_trail: true,
          voice_output: true,
          integrations: plan !== 'free',
          api_access: plan !== 'free',
          white_label: plan === 'enterprise',
          max_leads: plan === 'enterprise' ? 999999 : plan === 'pro' ? 10000 : 1000,
          max_contacts: plan === 'enterprise' ? 999999 : plan === 'pro' ? 5000 : 500,
          max_workflows: plan === 'enterprise' ? 999 : plan === 'pro' ? 50 : 10,
        },
      },
    ]);

    // ── 6. Create Agent Configs (default personas) ──────────────
    const defaultAgents = ['ceo', 'sales', 'marketing', 'it'];
    for (const agentId of defaultAgents) {
      await supabase.from('agent_configs').insert({
        user_id: userId,
        agent_id: agentId,
        is_active: true,
      });
    }

    return json({
      success: true,
      userId,
      orgId,
      email,
      plan,
      loginUrl: `${req.headers.get('origin') || 'https://beardforce.vercel.app'}/login`,
      message: `Tenant "${orgName}" provisioned successfully`,
    });

  } catch (err: any) {
    return json({ error: err.message || 'Provisioning failed' }, 500);
  }
});
