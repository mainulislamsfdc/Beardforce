/**
 * AgentTracer — Lightweight observability for AI agent calls.
 *
 * Records: which agent was called, which tool was invoked, latency,
 * success/failure, token estimates, and errors.
 *
 * Data is written to the `agent_traces` table and available via
 * the Observability dashboard (Settings > System or a dedicated page).
 *
 * Usage:
 *   const span = agentTracer.startSpan('ceo', 'approve_major_decision');
 *   span.end({ success: true, response: 'Approved' });
 */

import { supabase } from '../supabase/client';

export interface TraceSpan {
  id: string;
  agentId: string;
  tool?: string;
  startedAt: number;
  end(result: { success: boolean; response?: string; error?: string; tokenEstimate?: number }): Promise<void>;
}

export interface AgentTrace {
  id: string;
  user_id: string;
  agent_id: string;
  tool?: string;
  latency_ms: number;
  success: boolean;
  error?: string;
  token_estimate?: number;
  created_at: string;
}

export interface AgentPerformanceSummary {
  agentId: string;
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  errorCount: number;
  totalTokensEstimate: number;
  topTools: Array<{ tool: string; count: number }>;
}

class AgentTracerService {
  private userId: string | null = null;
  private buffer: Omit<AgentTrace, 'id' | 'created_at'>[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private enabled = true;

  setUserId(userId: string) {
    this.userId = userId;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Start a new trace span for an agent call.
   * Returns a span object with an end() method.
   */
  startSpan(agentId: string, tool?: string): TraceSpan {
    const startedAt = Date.now();
    const id = `trace-${startedAt}-${Math.random().toString(36).slice(2, 7)}`;

    return {
      id,
      agentId,
      tool,
      startedAt,
      end: async (result) => {
        if (!this.enabled || !this.userId) return;

        const latencyMs = Date.now() - startedAt;
        // Rough token estimate: 4 chars ≈ 1 token
        const tokenEstimate = result.tokenEstimate
          ?? Math.round(((result.response?.length || 0) + (result.error?.length || 0)) / 4);

        this.buffer.push({
          user_id: this.userId,
          agent_id: agentId,
          tool,
          latency_ms: latencyMs,
          success: result.success,
          error: result.error,
          token_estimate: tokenEstimate,
        });

        // Batch flush every 5 seconds or when buffer reaches 20
        if (this.buffer.length >= 20) {
          await this.flush();
        } else {
          this.scheduleFlush();
        }
      },
    };
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flush();
      this.flushTimer = null;
    }, 5000);
  }

  /** Write buffered traces to Supabase. */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const toWrite = [...this.buffer];
    this.buffer = [];

    try {
      await supabase.from('agent_traces').insert(toWrite);
    } catch {
      // Non-critical — traces are best-effort
    }
  }

  /**
   * Get performance summary for all agents over a time window.
   * @param days Number of days to look back (default 7)
   */
  async getPerformanceSummary(days = 7): Promise<AgentPerformanceSummary[]> {
    if (!this.userId) return [];

    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data } = await supabase
      .from('agent_traces')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) return [];

    // Group by agent
    const byAgent: Record<string, AgentTrace[]> = {};
    for (const trace of data as AgentTrace[]) {
      if (!byAgent[trace.agent_id]) byAgent[trace.agent_id] = [];
      byAgent[trace.agent_id].push(trace);
    }

    return Object.entries(byAgent).map(([agentId, traces]) => {
      const successful = traces.filter(t => t.success);
      const toolCounts: Record<string, number> = {};
      for (const t of traces) {
        if (t.tool) toolCounts[t.tool] = (toolCounts[t.tool] || 0) + 1;
      }

      return {
        agentId,
        totalCalls: traces.length,
        successRate: Math.round((successful.length / traces.length) * 100),
        avgLatencyMs: Math.round(traces.reduce((s, t) => s + t.latency_ms, 0) / traces.length),
        errorCount: traces.filter(t => !t.success).length,
        totalTokensEstimate: traces.reduce((s, t) => s + (t.token_estimate || 0), 0),
        topTools: Object.entries(toolCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([tool, count]) => ({ tool, count })),
      };
    });
  }

  /** Get recent traces for display in admin UI. */
  async getRecentTraces(limit = 50): Promise<AgentTrace[]> {
    if (!this.userId) return [];

    const { data } = await supabase
      .from('agent_traces')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data as AgentTrace[]) || [];
  }

  /** Get daily call volume for charting. */
  async getDailyVolume(days = 14): Promise<Array<{ date: string; calls: number; errors: number }>> {
    if (!this.userId) return [];

    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await supabase
      .from('agent_traces')
      .select('created_at, success')
      .eq('user_id', this.userId)
      .gte('created_at', since);

    if (!data) return [];

    // Group by date
    const byDate: Record<string, { calls: number; errors: number }> = {};
    for (const trace of data) {
      const date = trace.created_at.split('T')[0];
      if (!byDate[date]) byDate[date] = { calls: 0, errors: 0 };
      byDate[date].calls++;
      if (!trace.success) byDate[date].errors++;
    }

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));
  }
}

export const agentTracer = new AgentTracerService();
