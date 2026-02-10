import { supabase } from './supabase/client'
import type { AppNotification } from '../types'

export const notificationService = {
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: AppNotification['type'] = 'info',
    source?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<AppNotification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        source: source || null,
        reference_id: referenceId || null,
        reference_type: referenceType || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getNotifications(userId: string, limit = 20): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw error
    return count || 0
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
    if (error) throw error
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw error
  },
}
