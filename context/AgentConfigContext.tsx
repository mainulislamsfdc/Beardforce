import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useOrg } from './OrgContext';
import { agentConfigService, DEFAULT_AGENT_CONFIGS } from '../services/agentConfigService';
import type { AgentConfig, AgentId } from '../types';

interface AgentConfigContextType {
  agents: Record<AgentId, AgentConfig>;
  loading: boolean;
  getAgent: (id: AgentId) => AgentConfig;
  updateAgent: (id: AgentId, data: Partial<AgentConfig>) => Promise<void>;
  refresh: () => Promise<void>;
}

const AgentConfigContext = createContext<AgentConfigContextType | undefined>(undefined);

function buildDefaults(): Record<AgentId, AgentConfig> {
  const ids: AgentId[] = ['ceo', 'sales', 'marketing', 'it'];
  const result = {} as Record<AgentId, AgentConfig>;
  for (const id of ids) {
    result[id] = { id: '', org_id: '', ...DEFAULT_AGENT_CONFIGS[id] } as AgentConfig;
  }
  return result;
}

export const AgentConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { org } = useOrg();
  const [agents, setAgents] = useState<Record<AgentId, AgentConfig>>(buildDefaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org?.id) {
      setAgents(buildDefaults());
      setLoading(false);
      return;
    }
    try {
      const rows = await agentConfigService.getAgentConfigs(org.id);
      if (rows.length > 0) {
        const map = { ...buildDefaults() };
        for (const row of rows) {
          map[row.agent_id as AgentId] = row;
        }
        setAgents(map);
      }
    } catch (err) {
      console.warn('Agent config load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const getAgent = useCallback((id: AgentId): AgentConfig => {
    return agents[id] || { id: '', org_id: '', ...DEFAULT_AGENT_CONFIGS[id] } as AgentConfig;
  }, [agents]);

  const updateAgent = useCallback(async (agentId: AgentId, data: Partial<AgentConfig>) => {
    if (!org?.id) return;
    const existing = agents[agentId];
    if (existing?.id) {
      await agentConfigService.updateAgentConfig(existing.id, data);
    } else {
      await agentConfigService.upsertAgentConfig(org.id, agentId, data);
    }
    await load();
  }, [org?.id, agents, load]);

  return (
    <AgentConfigContext.Provider value={{ agents, loading, getAgent, updateAgent, refresh: load }}>
      {children}
    </AgentConfigContext.Provider>
  );
};

export const useAgentConfig = () => {
  const ctx = useContext(AgentConfigContext);
  if (!ctx) throw new Error('useAgentConfig must be used within AgentConfigProvider');
  return ctx;
};
