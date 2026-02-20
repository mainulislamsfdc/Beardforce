import { ITAgent } from '../../services/agents/tools/ITAgent';
import { SalesAgent } from '../../services/agents/tools/SalesAgent';
import { MarketingAgent } from '../../services/agents/tools/MarketingAgent';
import { CEOAgent } from '../../services/agents/tools/CEOAgent';
import { databaseService } from '../../services/database';
import type { AgentId } from '../../types';

export interface AgentInstance {
  chat: (message: string) => Promise<string>;
}

interface AgentFactoryConfig {
  agentName?: string;
  orgName?: string;
  personality?: string;
}

export function createAgent(agentId: AgentId, config?: AgentFactoryConfig): AgentInstance {
  const cfg = config ? {
    agentName: config.agentName,
    orgName: config.orgName,
    personality: config.personality,
  } : undefined;

  switch (agentId) {
    case 'it':
      return new ITAgent(
        '',
        databaseService,
        cfg
      );
    case 'sales':
      return new SalesAgent(cfg);
    case 'marketing':
      return new MarketingAgent(cfg);
    case 'ceo':
      return new CEOAgent(cfg);
    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
}
