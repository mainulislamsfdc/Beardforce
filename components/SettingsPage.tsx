import React, { useState, useEffect } from 'react';
import { Settings, Users, Shield, RotateCcw, Trash2, Plus, Save, AlertTriangle, Clock, Database, ChevronDown, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { accessControl } from '../services/accessControl';
import { databaseService, initializeDatabase } from '../services/database';
import type { OrgRole, OrgMember } from '../types';

type Tab = 'access' | 'system' | 'rollback';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { org, role, isAdmin, refresh } = useOrg();
  const [activeTab, setActiveTab] = useState<Tab>('access');

  // Access management state
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('viewer');
  const [showInvite, setShowInvite] = useState(false);

  // Snapshot state
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database state
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbStats, setDbStats] = useState<{ table: string; count: number }[]>([]);

  useEffect(() => {
    const initDB = async () => {
      if (user?.id && !dbInitialized) {
        try {
          await initializeDatabase(user.id);
          setDbInitialized(true);
        } catch (error) {
          console.error('Database init failed:', error);
        }
      }
    };
    initDB();
  }, [user, dbInitialized]);

  useEffect(() => {
    if (org?.id) loadMembers();
  }, [org?.id]);

  useEffect(() => {
    if (dbInitialized && activeTab === 'rollback') loadSnapshots();
    if (dbInitialized && activeTab === 'system') loadDbStats();
  }, [dbInitialized, activeTab]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadMembers = async () => {
    if (!org?.id) return;
    setMembersLoading(true);
    try {
      const m = await accessControl.getOrgMembers(org.id);
      setMembers(m);
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setMembersLoading(false);
    }
  };

  const loadSnapshots = async () => {
    setSnapshotsLoading(true);
    try {
      const s = await databaseService.getSnapshots();
      setSnapshots(s);
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const loadDbStats = async () => {
    try {
      const tables = ['leads', 'contacts', 'accounts', 'opportunities', 'orders', 'products'];
      const stats = [];
      for (const t of tables) {
        try {
          const count = await databaseService.getAdapter().count(t);
          stats.push({ table: t, count });
        } catch {
          stats.push({ table: t, count: 0 });
        }
      }
      setDbStats(stats);
    } catch (err) {
      console.error('Failed to load DB stats:', err);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    try {
      await accessControl.updateMemberRole(memberId, newRole);
      showMessage('success', 'Role updated successfully');
      loadMembers();
      refresh();
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await accessControl.removeMember(memberId);
      showMessage('success', 'Member removed');
      loadMembers();
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!snapshotLabel.trim()) return;
    setActionLoading(true);
    try {
      await databaseService.createSnapshot(snapshotLabel, snapshotDesc, 'admin');
      showMessage('success', `Snapshot "${snapshotLabel}" created successfully`);
      setSnapshotLabel('');
      setSnapshotDesc('');
      setShowCreateSnapshot(false);
      loadSnapshots();
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    setActionLoading(true);
    try {
      const result = await databaseService.restoreSnapshot(snapshotId);
      showMessage('success', `Restored ${result.tablesRestored} tables with ${result.rowsRestored} rows`);
      setRestoreConfirm(null);
      loadSnapshots();
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Delete this snapshot?')) return;
    try {
      await databaseService.deleteSnapshot(snapshotId);
      showMessage('success', 'Snapshot deleted');
      loadSnapshots();
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const handleResetToDefault = async () => {
    if (resetConfirmText !== 'RESET') return;
    setActionLoading(true);
    try {
      await databaseService.resetToDefault();
      showMessage('success', 'System reset to default. A backup was created automatically.');
      setShowResetDialog(false);
      setResetConfirmText('');
      loadSnapshots();
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Shield size={48} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only administrators can access settings.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'access', label: 'Access Management', icon: Users },
    { id: 'system', label: 'System', icon: Database },
    { id: 'rollback', label: 'Reset / Rollback', icon: RotateCcw },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-700 rounded-lg">
            <Settings size={24} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-sm text-gray-400">{org?.name || 'Organization'} administration</p>
          </div>
        </div>
      </div>

      {/* Message banner */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'access' && (
        <div className="space-y-4">
          {/* Members header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Organization Members</h2>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
            >
              <Plus size={16} />
              Add Member
            </button>
          </div>

          {/* Invite form */}
          {showInvite && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Invite New Member</h3>
              <p className="text-xs text-gray-400 mb-3">The user must register first, then you can add them to your organization.</p>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="User email address"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => {
                    showMessage('success', `Invite flow: user "${inviteEmail}" would be added as ${inviteRole}. (Requires Supabase org_members table)`);
                    setInviteEmail('');
                    setShowInvite(false);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Members table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">Loading members...</td></tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No members found. {!org ? 'Organization not set up yet - tables may need to be created in Supabase.' : ''}
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const isCurrentUser = member.user_id === user?.id;
                    const roleBg = member.role === 'admin' ? 'bg-orange-900/50 text-orange-300' : member.role === 'editor' ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-300';
                    return (
                      <tr key={member.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {(member.email || member.user_id).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{member.email || member.user_id.slice(0, 8) + '...'}</p>
                              {isCurrentUser && <p className="text-xs text-gray-500">You</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${roleBg}`}>
                            {member.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isCurrentUser && (
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1 text-red-400 hover:text-red-300 transition"
                                title="Remove member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Role descriptions */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Role Permissions</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-orange-900/50 text-orange-300">ADMIN</span>
                <p className="text-xs text-gray-400 mt-2">Full access: manage members, settings, all data, agents, reset/rollback</p>
              </div>
              <div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-300">EDITOR</span>
                <p className="text-xs text-gray-400 mt-2">Can use agents, create/edit/delete CRM data, view reports</p>
              </div>
              <div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">VIEWER</span>
                <p className="text-xs text-gray-400 mt-2">Read-only access to CRM data, can chat with agents</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          {/* Organization info */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Organization</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Name</p>
                <p className="text-white font-medium">{org?.name || 'Not configured'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Members</p>
                <p className="text-white font-medium">{members.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Created</p>
                <p className="text-white font-medium">{org?.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Your Role</p>
                <p className="text-orange-400 font-medium">{role?.toUpperCase() || 'MEMBER'}</p>
              </div>
            </div>
          </div>

          {/* Database stats */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Database Statistics</h2>
            <div className="grid grid-cols-3 gap-3">
              {dbStats.map((stat) => (
                <div key={stat.table} className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 capitalize">{stat.table}</p>
                  <p className="text-xl font-bold text-white">{stat.count}</p>
                  <p className="text-xs text-gray-500">records</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agent info */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">AI Agents</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'IT Manager', tools: 20, color: 'text-blue-400' },
                { name: 'Sales Manager', tools: 12, color: 'text-green-400' },
                { name: 'Marketing Manager', tools: 10, color: 'text-purple-400' },
                { name: 'CEO', tools: 10, color: 'text-amber-400' },
              ].map((agent) => (
                <div key={agent.name} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                  <span className={`text-sm font-medium ${agent.color}`}>{agent.name}</span>
                  <span className="text-xs text-gray-400">{agent.tools} tools</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rollback' && (
        <div className="space-y-4">
          {/* Create snapshot */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">System Snapshots</h2>
            <button
              onClick={() => setShowCreateSnapshot(!showCreateSnapshot)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Save size={16} />
              Create Snapshot
            </button>
          </div>

          {showCreateSnapshot && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Create Restore Point</h3>
              <p className="text-xs text-gray-400 mb-3">Snapshots save all CRM data (leads, contacts, accounts, opportunities, orders, products). Max 10 snapshots stored.</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  placeholder="Snapshot label (e.g., 'Before Q1 cleanup')"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSnapshot}
                    disabled={actionLoading || !snapshotLabel.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Creating...' : 'Create Snapshot'}
                  </button>
                  <button
                    onClick={() => setShowCreateSnapshot(false)}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Snapshots list */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Label</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Rows</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">By</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshotsLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">Loading snapshots...</td></tr>
                ) : snapshots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No snapshots yet. Create one to enable rollback.
                    </td>
                  </tr>
                ) : (
                  snapshots.map((snap) => (
                    <tr key={snap.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{snap.label}</p>
                        {snap.description && <p className="text-xs text-gray-500">{snap.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{snap.total_rows}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(snap.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{snap.created_by_agent || 'admin'}</td>
                      <td className="px-4 py-3 text-right">
                        {restoreConfirm === snap.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-yellow-400">Restore this?</span>
                            <button
                              onClick={() => handleRestore(snap.id)}
                              disabled={actionLoading}
                              className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 disabled:opacity-50"
                            >
                              {actionLoading ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setRestoreConfirm(null)}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setRestoreConfirm(snap.id)}
                              className="px-2 py-1 bg-blue-600/80 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteSnapshot(snap.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Danger zone - Reset to Default */}
          <div className="bg-gray-800 border-2 border-red-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-red-400" />
              <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Reset all CRM data to default (empty state). This will delete all leads, contacts, accounts, opportunities, orders, and products.
              An automatic backup will be created before the reset.
            </p>
            {showResetDialog ? (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-300 mb-3">
                  Type <strong>RESET</strong> to confirm. This action cannot be undone (but a backup will be created).
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Type RESET"
                    className="px-3 py-2 bg-gray-700 border border-red-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={handleResetToDefault}
                    disabled={actionLoading || resetConfirmText !== 'RESET'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                  <button
                    onClick={() => { setShowResetDialog(false); setResetConfirmText(''); }}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetDialog(true)}
                className="px-4 py-2 bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-sm font-medium hover:bg-red-900/70 transition"
              >
                Reset to Default
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
