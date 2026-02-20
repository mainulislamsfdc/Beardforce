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

/** Agent ordering — CEO always goes first when present. */
const AGENT_ORDER: string[] = ['ceo', 'sales', 'marketing', 'it'];

/**
 * Parse @mentions from a user message.
 * Supports: @CEO, @Sales, @Marketing, @IT, @all, @everyone, @team
 * Returns the list of agent IDs to route to, or null if no mentions found.
 */
export function parseMentions(
  message: string,
  participants: AgentParticipant[]
): string[] | null {
  const lower = message.toLowerCase();

  // @all / @everyone / @team → all agents
  if (/@(all|everyone|team)\b/i.test(message)) {
    return AGENT_ORDER.filter(id => participants.some(p => p.id === id));
  }

  const mentioned: string[] = [];
  for (const p of participants) {
    // Match @id (e.g. @ceo, @it) or @name (e.g. @"Sales Manager", @sales)
    const nameWords = p.name.toLowerCase().split(/\s+/);
    const patterns = [p.id, ...nameWords];
    for (const pat of patterns) {
      if (new RegExp(`@${pat}\\b`, 'i').test(message)) {
        if (!mentioned.includes(p.id)) mentioned.push(p.id);
        break;
      }
    }
  }

  if (mentioned.length === 0) return null;

  // Sort by AGENT_ORDER (CEO first)
  return mentioned.sort((a, b) => AGENT_ORDER.indexOf(a) - AGENT_ORDER.indexOf(b));
}

/** Detect if an agent response ends with a question directed at the user. */
function responseAsksQuestion(text: string): boolean {
  const trimmed = text.trim();
  // Must end with a question mark
  if (!trimmed.endsWith('?')) return false;
  // Check last sentence contains question-like patterns
  const lastSentence = trimmed.split(/[.!]\s+/).pop() || trimmed;
  const questionPatterns = /\b(would you|could you|can you|do you|shall I|should I|what do you|how do you|what would|which|would that|does that|is there|are there|want me to|like me to|prefer|need me|clarif)/i;
  return questionPatterns.test(lastSentence);
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
   * Resolve which agents should respond to a message.
   * If @mentions are found, route to those agents.
   * Otherwise, default to CEO only.
   * Returns { agentIds, mentionedExplicitly }.
   */
  resolveTargets(
    userMessage: string,
    selectedParticipants: string[]
  ): { agentIds: string[]; mentionedExplicitly: boolean } {
    const mentioned = parseMentions(userMessage, this.participants);
    if (mentioned && mentioned.length > 0) {
      // Only include agents that are actually in the meeting
      const filtered = mentioned.filter(id => selectedParticipants.includes(id));
      if (filtered.length > 0) {
        return { agentIds: filtered, mentionedExplicitly: true };
      }
    }
    // Default: CEO only (if in meeting), otherwise first participant
    const defaultAgent = selectedParticipants.includes('ceo')
      ? 'ceo'
      : selectedParticipants[0];
    return { agentIds: defaultAgent ? [defaultAgent] : [], mentionedExplicitly: false };
  }

  /**
   * Ask a question to specific agents. Agents respond one at a time.
   * If an agent asks a clarifying question, the chain stops (yields a
   * `stoppedForQuestion` flag on the last message) so the UI can wait
   * for user input before continuing.
   */
  async *askAgents(
    userMessage: string,
    agentIds: string[] = ['ceo'],
    onStatusChange?: (agentId: string, status: 'thinking' | 'speaking' | 'idle') => void
  ): AsyncGenerator<MeetingMessage & { stoppedForQuestion?: boolean }> {
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

    const isSoloResponse = agentIds.length === 1;

    // Updated prompt — encourages interactive behavior
    const meetingPrompt = (agentName: string) =>
      `[TEAM MEETING] You are ${agentName} in a live team meeting with the user (your boss/colleague).

Rules:
- Respond concisely (2-4 sentences) from your role's perspective.
- Don't repeat what others have already said.
- If the user's request is unclear or you need more details to give a good answer, ASK a clarifying question instead of guessing. End your response with the question.
- Be conversational and natural — this is a real-time discussion, not a report.
${isSoloResponse ? '- You are the only one responding right now. Give a focused, complete answer.' : '- Other team members may also respond after you. Stay in your lane.'}

Recent discussion:
${recentContext}

User says: ${userMessage}`;

    // Route to each agent sequentially
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
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

        // Check if the agent is asking the user a question
        const asksQuestion = responseAsksQuestion(response);
        const hasMoreAgents = i < agentIds.length - 1;

        const msg: MeetingMessage & { stoppedForQuestion?: boolean } = {
          id: `msg-${Date.now()}-${agentId}`,
          agentId,
          agentName: this.participants.find(a => a.id === agentId)?.name || agentId,
          role: 'agent',
          content: response,
          timestamp: new Date(),
          // Signal the UI to pause for user input
          stoppedForQuestion: asksQuestion && hasMoreAgents ? true : undefined,
        };

        this.transcript.push(msg);
        onStatusChange?.(agentId, 'idle');
        yield msg;

        // If agent asked a question and there are more agents waiting, stop the chain
        if (asksQuestion && hasMoreAgents) {
          return;
        }
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
