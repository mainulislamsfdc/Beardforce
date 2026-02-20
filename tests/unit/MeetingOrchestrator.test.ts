import { describe, it, expect } from 'vitest';
import {
  parseMentions,
  AGENT_PARTICIPANTS,
  MeetingOrchestrator,
} from '../../services/agents/MeetingOrchestrator';

describe('parseMentions', () => {
  const participants = AGENT_PARTICIPANTS;

  it('returns null when no mentions found', () => {
    expect(parseMentions('What is the revenue forecast?', participants)).toBeNull();
  });

  it('parses @CEO mention', () => {
    const result = parseMentions('@CEO what do you think?', participants);
    expect(result).toEqual(['ceo']);
  });

  it('parses @IT mention (case insensitive)', () => {
    const result = parseMentions('@it check the database', participants);
    expect(result).toEqual(['it']);
  });

  it('parses @Sales mention by name word', () => {
    const result = parseMentions('@sales show me the pipeline', participants);
    expect(result).toEqual(['sales']);
  });

  it('parses @Marketing mention', () => {
    const result = parseMentions('@marketing run a campaign analysis', participants);
    expect(result).toEqual(['marketing']);
  });

  it('parses multiple mentions in CEO-first order', () => {
    const result = parseMentions('@IT and @CEO please review', participants);
    // CEO should come before IT per AGENT_ORDER
    expect(result).toEqual(['ceo', 'it']);
  });

  it('parses @all to include all agents', () => {
    const result = parseMentions('@all team update please', participants);
    expect(result).toEqual(['ceo', 'sales', 'marketing', 'it']);
  });

  it('parses @everyone as alias for @all', () => {
    const result = parseMentions('@everyone let us discuss', participants);
    expect(result).toEqual(['ceo', 'sales', 'marketing', 'it']);
  });

  it('parses @team as alias for @all', () => {
    const result = parseMentions('@team status report', participants);
    expect(result).toEqual(['ceo', 'sales', 'marketing', 'it']);
  });

  it('deduplicates mentions', () => {
    const result = parseMentions('@CEO @ceo tell me twice', participants);
    expect(result).toEqual(['ceo']);
  });
});

describe('MeetingOrchestrator.resolveTargets', () => {
  const orchestrator = new MeetingOrchestrator();

  it('defaults to CEO when no mentions', () => {
    const result = orchestrator.resolveTargets(
      'How is the company doing?',
      ['ceo', 'sales', 'marketing', 'it']
    );
    expect(result.agentIds).toEqual(['ceo']);
    expect(result.mentionedExplicitly).toBe(false);
  });

  it('routes to mentioned agent', () => {
    const result = orchestrator.resolveTargets(
      '@sales show pipeline',
      ['ceo', 'sales', 'marketing', 'it']
    );
    expect(result.agentIds).toEqual(['sales']);
    expect(result.mentionedExplicitly).toBe(true);
  });

  it('filters out agents not in meeting', () => {
    // Only CEO and Sales in the meeting; mention IT
    const result = orchestrator.resolveTargets(
      '@IT check database',
      ['ceo', 'sales']
    );
    // IT not in meeting, fallback to CEO
    expect(result.agentIds).toEqual(['ceo']);
    expect(result.mentionedExplicitly).toBe(false);
  });

  it('defaults to first participant if CEO not in meeting', () => {
    const result = orchestrator.resolveTargets(
      'Hello team',
      ['sales', 'marketing']
    );
    expect(result.agentIds).toEqual(['sales']);
    expect(result.mentionedExplicitly).toBe(false);
  });

  it('routes @all to all selected participants', () => {
    const result = orchestrator.resolveTargets(
      '@all status update',
      ['ceo', 'it']
    );
    expect(result.agentIds).toEqual(['ceo', 'it']);
    expect(result.mentionedExplicitly).toBe(true);
  });
});
