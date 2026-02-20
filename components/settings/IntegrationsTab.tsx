/**
 * IntegrationsTab — Settings tab for managing third-party integrations.
 * Shows available integrations, connection status, and config forms.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Mail, MessageSquare, Plug, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronRight, Trash2, RefreshCw, ExternalLink
} from 'lucide-react';
import { integrationService } from '../../services/integrations/IntegrationService';
import type { IntegrationMeta, IntegrationConfig, ConfigField } from '../../services/integrations/IntegrationAdapter';

const ICON_MAP: Record<string, any> = {
  CreditCard,
  Mail,
  MessageSquare,
};

interface IntegrationCardProps {
  meta: IntegrationMeta;
  config: IntegrationConfig | null;
  onConnect: (id: string, config: Record<string, string>) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<boolean>;
}

function IntegrationCard({ meta, config, onConnect, onDisconnect, onTest }: IntegrationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const Icon = ICON_MAP[meta.icon] || Plug;
  const isConnected = config?.enabled ?? false;

  // Pre-fill form with existing config
  useEffect(() => {
    if (config?.config) {
      setFormValues(config.config);
    }
  }, [config]);

  const handleConnect = async () => {
    setError('');
    setSaving(true);
    try {
      await onConnect(meta.id, formValues);
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await onDisconnect(meta.id);
      setFormValues({});
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await onTest(meta.id);
      setTestResult(ok);
    } finally {
      setTesting(false);
    }
  };

  const categoryColors: Record<string, string> = {
    payment: 'text-green-400 bg-green-900/30 border-green-800',
    communication: 'text-blue-400 bg-blue-900/30 border-blue-800',
    data: 'text-purple-400 bg-purple-900/30 border-purple-800',
    reporting: 'text-amber-400 bg-amber-900/30 border-amber-800',
  };

  return (
    <div className={`bg-gray-800 rounded-xl border ${isConnected ? 'border-green-700' : 'border-gray-700'} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-750 transition"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected ? 'bg-green-900/50' : 'bg-gray-700'}`}>
          <Icon size={20} className={isConnected ? 'text-green-400' : 'text-gray-400'} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">{meta.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[meta.category]}`}>
              {meta.category}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <CheckCircle2 size={14} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-500 text-xs">
              <XCircle size={14} /> Not connected
            </span>
          )}
          {expanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
        </div>
      </button>

      {/* Expanded Config Form */}
      {expanded && (
        <div className="border-t border-gray-700 p-4 space-y-3">
          {meta.requiredConfig.map((field: ConfigField) => (
            <div key={field.key}>
              <label className="block text-xs text-gray-400 mb-1">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>
              <input
                type={field.type === 'password' ? 'password' : 'text'}
                value={formValues[field.key] || ''}
                onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={saving}
              />
            </div>
          ))}

          {error && (
            <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {testResult !== null && (
            <div className={`text-xs rounded-lg px-3 py-2 ${testResult ? 'text-green-400 bg-green-900/20 border border-green-800' : 'text-red-400 bg-red-900/20 border border-red-800'}`}>
              {testResult ? 'Connection test passed!' : 'Connection test failed.'}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {isConnected ? (
              <>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  {testing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Test
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  Disconnect
                </button>
                <button
                  onClick={handleConnect}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 ml-auto"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Update
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                Connect
              </button>
            )}
          </div>

          {/* Supported actions */}
          <div className="pt-2 border-t border-gray-700">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Supported Actions</p>
            <div className="flex flex-wrap gap-1.5">
              {meta.supportedActions.map(action => (
                <span key={action} className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                  {action}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface IntegrationsTabProps {
  userId: string;
}

export default function IntegrationsTab({ userId }: IntegrationsTabProps) {
  const [integrations, setIntegrations] = useState<IntegrationMeta[]>([]);
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    integrationService.setUserId(userId);
    const [metas, cfgs] = await Promise.all([
      Promise.resolve(integrationService.getAvailableIntegrations()),
      integrationService.loadConfigs(),
    ]);
    setIntegrations(metas);
    setConfigs(cfgs);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async (integrationId: string, config: Record<string, string>) => {
    const result = await integrationService.connect(integrationId, config);
    if (!result.success) throw new Error(result.error);
    await load(); // Refresh
  };

  const handleDisconnect = async (integrationId: string) => {
    await integrationService.disconnect(integrationId);
    await load();
  };

  const handleTest = async (integrationId: string) => {
    return integrationService.testConnection(integrationId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-500" size={24} />
      </div>
    );
  }

  const connectedCount = configs.filter(c => c.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Integrations</h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Connect third-party services to extend your CRM.
            {connectedCount > 0 && ` ${connectedCount} active.`}
          </p>
        </div>
        <a
          href="https://docs.runwaycrm.com/integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
        >
          <ExternalLink size={12} />
          Docs
        </a>
      </div>

      {/* Integration Cards */}
      <div className="space-y-3">
        {integrations.map(meta => (
          <IntegrationCard
            key={meta.id}
            meta={meta}
            config={configs.find(c => c.integration_id === meta.id) || null}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onTest={handleTest}
          />
        ))}
      </div>

      {/* Info */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">How integrations work:</strong> Once connected, your AI agents can
          use these services automatically. For example, the Sales agent's "draft email" tool will send
          real emails via SendGrid, and quotes can be processed as Stripe payments.
          All credentials are stored securely and never leave your account.
        </p>
      </div>
    </div>
  );
}
