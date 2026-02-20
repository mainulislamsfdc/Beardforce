/**
 * agentFactory — Creates agent instances for workflow execution.
 *
 * This is separate from the UI's createAgent.ts to avoid importing
 * React-dependent code into the workflow engine.
 * Returns a minimal { chat(msg): Promise<string> } interface.
 */

import { ITAgent } from '../agents/tools/ITAgent';
import { SalesAgent } from '../agents/tools/SalesAgent';
import { MarketingAgent } from '../agents/tools/MarketingAgent';
import { CEOAgent } from '../agents/tools/CEOAgent';
import { databaseService } from '../database';

interface ChatAgent {
  chat(message: string): Promise<string>;
}

/**
 * Create an agent instance by ID.
 * Returns null if the agent ID is unknown.
 */
export function createAgentInstance(agentId: string): ChatAgent | null {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

  switch (agentId) {
    case 'ceo':
      return new CEOAgent();
    case 'sales':
      return new SalesAgent();
    case 'marketing':
      return new MarketingAgent();
    case 'it':
      return new ITAgent(apiKey, databaseService);
    default:
      return null;
  }
}
