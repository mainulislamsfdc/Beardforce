import { supabase } from './supabase/client'

export interface AuditEntry {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, any> | null
  ip_address: string | null
  created_at: string
}

export const auditService = {
  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('audit_log').insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
      })
    } catch (err) {
      console.warn('Audit log failed:', err)
    }
  },

  async getAuditLogs(
    userId: string,
    filters?: {
      action?: string
      entityType?: string
      startDate?: string
      endDate?: string
    },
    limit = 100
  ): Promise<AuditEntry[]> {
    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters?.action) query = query.eq('action', filters.action)
    if (filters?.entityType) query = query.eq('entity_type', filters.entityType)
    if (filters?.startDate) query = query.gte('created_at', filters.startDate)
    if (filters?.endDate) query = query.lte('created_at', filters.endDate)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async logLogin(
    userId: string,
    eventType: 'login' | 'logout' | 'failed_login',
    provider?: string
  ): Promise<void> {
    try {
      await supabase.from('login_history').insert({
        user_id: userId,
        event_type: eventType,
        provider: provider || 'email',
        user_agent: navigator.userAgent,
      })
    } catch (err) {
      console.warn('Login history log failed:', err)
    }
  },

  async getLoginHistory(userId: string, limit = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },
}
