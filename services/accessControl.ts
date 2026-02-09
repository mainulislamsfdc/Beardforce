import { supabase } from './supabase/client';
import type { OrgRole, Organization, OrgMember } from '../types';

export const accessControl = {
  async createOrganization(name: string, userId: string): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name, created_by: userId })
      .select()
      .single();
    if (error) throw error;

    // Add creator as admin
    const { error: memberError } = await supabase.from('org_members').insert({
      org_id: data.id,
      user_id: userId,
      role: 'admin',
      invited_by: userId,
    });
    if (memberError) throw memberError;

    return data;
  },

  async getCurrentMembership(userId: string): Promise<OrgMember | null> {
    const { data, error } = await supabase
      .from('org_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getOrganization(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    const { data, error } = await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async updateMemberRole(memberId: string, newRole: OrgRole): Promise<void> {
    const { error } = await supabase
      .from('org_members')
      .update({ role: newRole })
      .eq('id', memberId);
    if (error) throw error;
  },

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('id', memberId);
    if (error) throw error;
  },

  async addMember(orgId: string, userId: string, role: OrgRole, invitedBy: string): Promise<void> {
    const { error } = await supabase.from('org_members').insert({
      org_id: orgId,
      user_id: userId,
      role,
      invited_by: invitedBy,
    });
    if (error) throw error;
  },

  // Find a user by email (for invite flow)
  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    // Use Supabase's admin API or check org_members
    // Since we can't query auth.users directly from client, we check if user exists
    // by attempting to look up existing members. For now, we store email in org_members.
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.user_id };
  },

  // Permission helpers
  canAccessSettings(role: OrgRole | null): boolean {
    return role === 'admin';
  },

  canEditData(role: OrgRole | null): boolean {
    return role === 'admin' || role === 'editor';
  },

  canViewData(_role: OrgRole | null): boolean {
    return true;
  },
};
