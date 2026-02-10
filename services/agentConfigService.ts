import { supabase } from './supabase/client'
import type { AgentConfig, AgentId, OrgBranding, FieldConfig } from '../types'

// ============================================================================
// Default Configs (fallback when DB has no rows)
// ============================================================================

export const DEFAULT_AGENT_CONFIGS: Record<AgentId, Omit<AgentConfig, 'id' | 'org_id'>> = {
  ceo: {
    agent_id: 'ceo',
    custom_name: 'CEO',
    custom_title: 'Strategy & Oversight',
    avatar_id: 'default',
    color_primary: '#f59e0b',
    color_gradient: 'from-amber-600 to-orange-700',
    personality_prompt: null,
    voice_pitch: 0.85,
    voice_rate: 0.9,
    voice_name: 'Google US English',
    is_active: true,
  },
  sales: {
    agent_id: 'sales',
    custom_name: 'Sales Manager',
    custom_title: 'Pipeline & Revenue',
    avatar_id: 'default',
    color_primary: '#22c55e',
    color_gradient: 'from-green-600 to-blue-700',
    personality_prompt: null,
    voice_pitch: 1.1,
    voice_rate: 1.0,
    voice_name: 'Google US English',
    is_active: true,
  },
  marketing: {
    agent_id: 'marketing',
    custom_name: 'Marketing Manager',
    custom_title: 'Campaigns & Growth',
    avatar_id: 'default',
    color_primary: '#a855f7',
    color_gradient: 'from-purple-600 to-pink-700',
    personality_prompt: null,
    voice_pitch: 1.2,
    voice_rate: 0.95,
    voice_name: 'Google UK English Female',
    is_active: true,
  },
  it: {
    agent_id: 'it',
    custom_name: 'IT Manager',
    custom_title: 'Tech & Data',
    avatar_id: 'default',
    color_primary: '#3b82f6',
    color_gradient: 'from-blue-600 to-indigo-700',
    personality_prompt: null,
    voice_pitch: 1.0,
    voice_rate: 0.95,
    voice_name: 'Google US English',
    is_active: true,
  },
}

export const DEFAULT_BRANDING: Omit<OrgBranding, 'id' | 'org_id'> = {
  app_name: 'RunwayCRM',
  tagline: 'AI-Powered CRM',
  accent_color: '#f97316',
  logo_emoji: '',
  logo_initial: 'R',
}

// ============================================================================
// Agent Config CRUD
// ============================================================================

export const agentConfigService = {
  async getAgentConfigs(orgId: string): Promise<AgentConfig[]> {
    const { data, error } = await supabase
      .from('agent_config')
      .select('*')
      .eq('org_id', orgId)
    if (error) {
      console.warn('Failed to load agent configs:', error.message)
      return []
    }
    return data || []
  },

  async updateAgentConfig(configId: string, updates: Partial<AgentConfig>): Promise<AgentConfig> {
    const { id, org_id, ...safeUpdates } = updates as any
    const { data, error } = await supabase
      .from('agent_config')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', configId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async upsertAgentConfig(orgId: string, agentId: AgentId, updates: Partial<AgentConfig>): Promise<AgentConfig> {
    const { id, org_id, ...safeUpdates } = updates as any
    const { data, error } = await supabase
      .from('agent_config')
      .upsert(
        { org_id: orgId, agent_id: agentId, ...safeUpdates, updated_at: new Date().toISOString() },
        { onConflict: 'org_id,agent_id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ============================================================================
  // Branding CRUD
  // ============================================================================

  async getBranding(orgId: string): Promise<OrgBranding | null> {
    const { data, error } = await supabase
      .from('org_branding')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()
    if (error) {
      console.warn('Failed to load branding:', error.message)
      return null
    }
    return data
  },

  async updateBranding(brandingId: string, updates: Partial<OrgBranding>): Promise<OrgBranding> {
    const { id, org_id, ...safeUpdates } = updates as any
    const { data, error } = await supabase
      .from('org_branding')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', brandingId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async upsertBranding(orgId: string, updates: Partial<OrgBranding>): Promise<OrgBranding> {
    const { id, org_id, ...safeUpdates } = updates as any
    const { data, error } = await supabase
      .from('org_branding')
      .upsert(
        { org_id: orgId, ...safeUpdates, updated_at: new Date().toISOString() },
        { onConflict: 'org_id' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ============================================================================
  // Field Config CRUD
  // ============================================================================

  async getFieldConfigs(orgId: string, entity?: string): Promise<FieldConfig[]> {
    let query = supabase
      .from('field_config')
      .select('*')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: true })
    if (entity) query = query.eq('entity', entity)
    const { data, error } = await query
    if (error) {
      console.warn('Failed to load field configs:', error.message)
      return []
    }
    return data || []
  },

  async updateFieldConfig(configId: string, updates: Partial<FieldConfig>): Promise<FieldConfig> {
    const { id, org_id, ...safeUpdates } = updates as any
    const { data, error } = await supabase
      .from('field_config')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', configId)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
