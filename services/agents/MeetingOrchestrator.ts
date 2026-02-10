/**
 * MeetingOrchestrator — Coordinates multi-agent "Teams" meetings.
 * Routes user questions to all 4 AI agents and manages turn-taking.
 */

import { ITAgent } from './tools/ITAgent';
import { SalesAgent } from './tools/SalesAgent';
import { MarketingAgent } from './tools/MarketingAgent';
import { CEOAgent } from './tools/CEOAgent';
import { DatabaseService } from '../database/DatabaseService';

export interface MeetingMessage {
  id: string;
  agentId: string;
  agentName: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentParticipant {
  id: string;
  name: string;
  title: string;
  color: string;
  gradient: string;
  avatar: string;
  voiceConfig: { pitch: number; rate: number; volume: number; voiceName?: string };
  status: 'idle' | 'thinking' | 'speaking';
}

export const AGENT_PARTICIPANTS: AgentParticipant[] = [
  {
    id: 'ceo',
    name: 'CEO',
    title: 'Strategy & Oversight',
    color: 'amber',
    gradient: 'from-amber-600 to-orange-700',
    avatar: 'C',
    voiceConfig: { pitch: 0.85, rate: 0.9, volume: 1, voiceName: 'Google US English' },
    status: 'idle',
  },
  {
    id: 'sales',
    name: 'Sales Manager',
    title: 'Pipeline & Revenue',
    color: 'green',
    gradient: 'from-green-600 to-blue-700',
    avatar: 'S',
    voiceConfig: { pitch: 1.1, rate: 1.0, volume: 1, voiceName: 'Google US English' },
    status: 'idle',
  },
  {
    id: 'marketing',
    name: 'Marketing Manager',
    title: 'Campaigns & Growth',
    color: 'purple',
    gradient: 'from-purple-600 to-pink-700',
    avatar: 'M',
    voiceConfig: { pitch: 1.2, rate: 0.95, volume: 1, voiceName: 'Google UK English Female' },
    status: 'idle',
  },
  {
    id: 'it',
    name: 'IT Manager',
    title: 'Tech & Data',
    color: 'blue',
    gradient: 'from-blue-600 to-indigo-700',
    avatar: 'I',
    voiceConfig: { pitch: 1.0, rate: 0.95, volume: 1, voiceName: 'Google US English' },
    status: 'idle',
  },
];

type MeetingMode = 'all' | 'selected';

/** Build dynamic participants from agent configs (falls back to defaults). */
export function buildAgentParticipants(configs: Record<string, any>): AgentParticipant[] {
  return AGENT_PARTICIPANTS.map(p => {
    const cfg = configs[p.id];
    if (!cfg) return p;
    return {
      ...p,
      name: cfg.custom_name || p.name,
      title: cfg.custom_title || p.title,
      gradient: cfg.color_gradient || p.gradient,
      avatar: cfg.avatar_id || p.avatar,
      voiceConfig: {
        pitch: cfg.voice_pitch ?? p.voiceConfig.pitch,
        rate: cfg.voice_rate ?? p.voiceConfig.rate,
        volume: p.voiceConfig.volume,
        voiceName: cfg.voice_name || p.voiceConfig.voiceName,
      },
      status: 'idle' as const,
    };
  });
}

export class MeetingOrchestrator {
  private agents: Record<string, any> = {};
  private dbService: DatabaseService | null = null;
  private transcript: MeetingMessage[] = [];
  private participants: AgentParticipant[] = AGENT_PARTICIPANTS;

  initialize(dbService: DatabaseService, agentConfigs?: Record<string, any>, orgName?: string) {
    this.dbService = dbService;
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || '';

    if (agentConfigs) {
      this.participants = buildAgentParticipants(agentConfigs);
    }

    const mkCfg = (id: string) => {
      const c = agentConfigs?.[id];
      return c ? { agentName: c.custom_name, orgName: orgName || 'RunwayCRM', personality: c.personality_prompt || undefined } : undefined;
    };

    this.agents = {
      it: new ITAgent(apiKey, dbService, mkCfg('it')),
      sales: new SalesAgent(mkCfg('sales')),
      marketing: new MarketingAgent(mkCfg('marketing')),
      ceo: new CEOAgent(mkCfg('ceo')),
    };
  }

  getParticipants(): AgentParticipant[] {
    return this.participants;
  }

  /**
   * Ask a question to specific agents (or all). Agents respond in order.
   * Returns an async generator so the UI can render responses as they arrive.
   */
  async *askAgents(
    userMessage: string,
    agentIds: string[] = ['ceo', 'sales', 'marketing', 'it'],
    onStatusChange?: (agentId: string, status: 'thinking' | 'speaking' | 'idle') => void
  ): AsyncGenerator<MeetingMessage> {
    // Add user message to transcript
    const userMsg: MeetingMessage = {
      id: `msg-${Date.now()}-user`,
      agentId: 'user',
      agentName: 'You',
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.transcript.push(userMsg);

    // Build context from recent transcript (last 10 messages)
    const recentContext = this.transcript
      .slice(-10)
      .map(m => `${m.agentName}: ${m.content}`)
      .join('\n');

    // Wrap each question with meeting context
    const meetingPrompt = (agentName: string) =>
      `[TEAM MEETING] The following is a discussion in a team meeting. Respond concisely (2-4 sentences) from your perspective as ${agentName}. Don't repeat what others said.\n\nRecent discussion:\n${recentContext}\n\nUser's question/topic: ${userMessage}`;

    // Route to each agent sequentially so they can hear each other
    for (const agentId of agentIds) {
      onStatusChange?.(agentId, 'thinking');

      try {
        let response = '';
        const prompt = meetingPrompt(
          this.participants.find(a => a.id === agentId)?.name || agentId
        );

        const agentInstance = this.agents[agentId];
        if (agentInstance) {
          response = await agentInstance.chat(prompt);
        } else {
          response = `${agentId} agent not initialized.`;
        }

        const msg: MeetingMessage = {
          id: `msg-${Date.now()}-${agentId}`,
          agentId,
          agentName: this.participants.find(a => a.id === agentId)?.name || agentId,
          role: 'agent',
          content: response,
          timestamp: new Date(),
        };

        this.transcript.push(msg);
        onStatusChange?.(agentId, 'idle');
        yield msg;
      } catch (error: any) {
        const errorMsg: MeetingMessage = {
          id: `msg-${Date.now()}-${agentId}-err`,
          agentId,
          agentName: this.participants.find(a => a.id === agentId)?.name || agentId,
          role: 'agent',
          content: `Error: ${error.message || 'Failed to respond'}`,
          timestamp: new Date(),
        };
        this.transcript.push(errorMsg);
        onStatusChange?.(agentId, 'idle');
        yield errorMsg;
      }
    }
  }

  getTranscript(): MeetingMessage[] {
    return [...this.transcript];
  }

  clearTranscript() {
    this.transcript = [];
  }
}

export const meetingOrchestrator = new MeetingOrchestrator();
