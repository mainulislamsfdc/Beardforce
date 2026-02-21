import React, { useState, useEffect } from 'react';
import { Brain, Lock, Unlock, RefreshCw, Cpu, FileCode, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import { manifestService, changeLogService } from '../../services/manifestService';
import { claudeService } from '../../services/claudeService';
import type { CodebaseManifest, ManifestSection, StructuredChangeEntry } from '../../types';

const ManifestTab: React.FC = () => {
  const { user } = useAuth();
  const { org } = useOrg();
  const [manifest, setManifest] = useState<CodebaseManifest | null>(null);
  const [changes, setChanges] = useState<StructuredChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        manifestService.getManifest(user.id),
        changeLogService.getRecentChanges(user.id, 20)
      ]);
      setManifest(m);
      setChanges(c);

      // Check Claude availability (non-blocking)
      claudeService.isAvailable().then(setClaudeAvailable).catch(() => setClaudeAvailable(false));
    } catch {
      // Tables may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleGenerate = async () => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      const m = await manifestService.generateManifest(user.id, org?.id || null);
      setManifest(m);
      showMsg('success', `Manifest v${m.version} generated and stored (~${m.total_tokens} tokens)`);
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLock = async () => {
    if (!manifest) return;
    setActionLoading(true);
    try {
      await manifestService.lockManifest(manifest.id);
      setManifest({ ...manifest, locked: true, locked_at: new Date().toISOString() });
      showMsg('success', 'Manifest locked as baseline. Future changes will be tracked as deltas.');
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!manifest) return;
    setActionLoading(true);
    try {
      await manifestService.unlockManifest(manifest.id);
      setManifest({ ...manifest, locked: false, locked_at: null });
      showMsg('success', 'Manifest unlocked for editing.');
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Show defaults if no manifest stored yet
  const sections: ManifestSection[] = manifest?.sections || manifestService.getDefaultSections();
  const totalTokens = manifest?.total_tokens || manifestService.getDefaultTotalTokens();

  if (loading) {
    return <div className="text-gray-500 text-center py-12">Loading manifest...</div>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Brain size={24} className="text-purple-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Codebase Manifest</h2>
              <p className="text-xs text-gray-400">Compressed specification that gives AI agents full codebase understanding</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {manifest ? (
              manifest.locked ? (
                <button onClick={handleUnlock} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600/20 border border-yellow-700 text-yellow-300 rounded-lg text-xs font-medium hover:bg-yellow-600/30 transition disabled:opacity-50">
                  <Unlock size={14} /> Unlock
                </button>
              ) : (
                <button onClick={handleLock} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-700 text-green-300 rounded-lg text-xs font-medium hover:bg-green-600/30 transition disabled:opacity-50">
                  <Lock size={14} /> Lock as Baseline
                </button>
              )
            ) : null}
            <button onClick={handleGenerate} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50">
              {manifest ? <RefreshCw size={14} /> : <Zap size={14} />}
              {actionLoading ? 'Working...' : manifest ? 'Refresh' : 'Generate & Store'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-700/50 rounded-lg p-2.5">
            <p className="text-xs text-gray-400">Version</p>
            <p className="text-sm font-bold text-white">{manifest?.version || '3.0'}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2.5">
            <p className="text-xs text-gray-400">Tokens</p>
            <p className="text-sm font-bold text-white">~{totalTokens.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2.5">
            <p className="text-xs text-gray-400">Status</p>
            <p className={`text-sm font-bold ${manifest?.locked ? 'text-green-400' : manifest ? 'text-yellow-400' : 'text-gray-500'}`}>
              {manifest?.locked ? 'Locked' : manifest ? 'Draft' : 'Not stored'}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2.5">
            <p className="text-xs text-gray-400">Claude AI</p>
            <div className="flex items-center gap-1.5">
              {claudeAvailable === null ? (
                <p className="text-sm font-bold text-gray-500">Checking...</p>
              ) : claudeAvailable ? (
                <>
                  <CheckCircle size={12} className="text-green-400" />
                  <p className="text-sm font-bold text-green-400">Connected</p>
                </>
              ) : (
                <>
                  <AlertCircle size={12} className="text-gray-500" />
                  <p className="text-sm font-bold text-gray-500">Not configured</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manifest sections */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <FileCode size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-white">Manifest Sections ({sections.length})</span>
        </div>
        {sections.map((section) => {
          const expanded = expandedSections.has(section.key);
          return (
            <div key={section.key} className="border-b border-gray-700/50 last:border-b-0">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/30 transition text-left"
              >
                <div className="flex items-center gap-2">
                  {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span className="text-sm font-medium text-white">{section.title}</span>
                </div>
                <span className="text-xs text-gray-500">~{section.token_estimate} tokens</span>
              </button>
              {expanded && (
                <div className="px-4 pb-3">
                  <pre className="text-xs text-gray-300 bg-gray-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
                    {section.content}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent structured changes */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-orange-400" />
            <span className="text-sm font-semibold text-white">Structured Change Log ({changes.length})</span>
          </div>
          <span className="text-xs text-gray-500">Context fed to AI alongside manifest</span>
        </div>
        {changes.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            No structured changes recorded yet. Changes will appear here as the IT Agent generates code.
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50 max-h-64 overflow-y-auto">
            {changes.map((change) => {
              const categoryColors: Record<string, string> = {
                feature: 'text-green-400 bg-green-900/30',
                bugfix: 'text-red-400 bg-red-900/30',
                schema: 'text-blue-400 bg-blue-900/30',
                config: 'text-yellow-400 bg-yellow-900/30',
                refactor: 'text-purple-400 bg-purple-900/30',
                ai_generated: 'text-cyan-400 bg-cyan-900/30',
              };
              const color = categoryColors[change.category] || 'text-gray-400 bg-gray-700';
              return (
                <div key={change.id} className="px-4 py-2.5 hover:bg-gray-700/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>{change.category}</span>
                      <span className="text-sm text-white">{change.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">{change.agent}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{change.context_summary}</p>
                  {change.files_affected.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">Files: {change.files_affected.join(', ')}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Setup instructions */}
      {claudeAvailable === false && (
        <div className="bg-gray-800 border border-purple-900/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">Enable Claude AI Code Generation</h3>
          <p className="text-xs text-gray-400 mb-3">The IT Agent will use templates as fallback. To enable Claude-powered generation:</p>
          <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
            <li>Install Supabase CLI: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-purple-300">npm i -g supabase</code></li>
            <li>Link your project: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-purple-300">supabase link --project-ref YOUR_PROJECT_REF</code></li>
            <li>Deploy the edge function: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-purple-300">supabase functions deploy claude-proxy --no-verify-jwt</code></li>
            <li>Set the API key: <code className="bg-gray-900 px-1.5 py-0.5 rounded text-purple-300">supabase secrets set ANTHROPIC_API_KEY=sk-ant-...</code></li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default ManifestTab;
