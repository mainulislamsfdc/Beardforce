import { supabase } from './supabase/client';
import type { OrgRole, Organization, OrgMember, OrgInvite } from '../types';

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
      .order('joined_at', { ascending: false })
      .limit(1)
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
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.user_id };
  },

  // ── Invite System ────────────────────────────────────────────────────────────

  /** Create an invite record and return the token. Admin copies/shares the link. */
  async createInvite(orgId: string, email: string, role: OrgRole, invitedBy: string): Promise<string> {
    const { data, error } = await supabase
      .from('org_invites')
      .insert({ org_id: orgId, email, role, invited_by: invitedBy })
      .select('token')
      .single();
    if (error) throw error;
    return data.token;
  },

  /** List all pending (non-expired) invites for an org. */
  async getPendingInvites(orgId: string): Promise<OrgInvite[]> {
    const { data, error } = await supabase
      .from('org_invites')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** Cancel a pending invite (admin action). */
  async cancelInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('org_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);
    if (error) throw error;
  },

  /** Accept an invite: add user to org_members, mark invite accepted. */
  async acceptInvite(token: string, userId: string): Promise<void> {
    const { data: invite, error: fetchError } = await supabase
      .from('org_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();
    if (fetchError || !invite) throw new Error('Invalid or expired invite link.');

    // Add to org_members (may already exist — ignore duplicate key error)
    const { error: memberError } = await supabase.from('org_members').insert({
      org_id: invite.org_id,
      user_id: userId,
      role: invite.role,
      invited_by: invite.invited_by,
    });
    if (memberError && !memberError.message.includes('duplicate')) throw memberError;

    // Mark invite as accepted
    await supabase.from('org_invites').update({ status: 'accepted' }).eq('id', invite.id);
  },

  /** Fetch invite details via SECURITY DEFINER RPC — works unauthenticated. */
  async getInviteDetails(token: string): Promise<{
    invite_id: string; org_id: string; org_name: string;
    role: OrgRole; email: string; expires_at: string; status: string;
  } | null> {
    const { data, error } = await supabase.rpc('get_invite_details', { invite_token: token });
    if (error || !data || data.length === 0) return null;
    return data[0];
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
