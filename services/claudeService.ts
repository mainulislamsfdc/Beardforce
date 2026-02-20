// ============================================================================
// CLAUDE CODE GENERATION SERVICE
// ============================================================================
// Constructs rich prompts from the manifest + change log, sends to Claude API
// via Supabase Edge Function proxy, returns structured code responses.
// This is what makes the IT Agent capable of writing real, context-aware code.

import { supabase } from './supabase/client';
import { manifestService, changeLogService } from './manifestService';
import type {
  ClaudeCodeRequest,
  ClaudeCodeResponse,
  CodebaseManifest,
  StructuredChangeEntry
} from '../types';

// ---------------------------------------------------------------------------
// Prompt Construction
// ---------------------------------------------------------------------------

function buildSystemPrompt(manifest: CodebaseManifest, changes: StructuredChangeEntry[]): string {
  const manifestContext = manifestService.serializeForAI(manifest, changes);

  return `You are an expert full-stack developer working inside RunwayCRM, an AI-powered CRM platform.
You have complete knowledge of the codebase via the manifest below. When you write code, you MUST:

1. Follow the exact conventions documented (React FC, TypeScript, Tailwind dark theme, hook patterns).
2. Use existing services (databaseService, authService, etc.) — never create new DB abstractions.
3. Auto-inject user_id via DatabaseService — never pass user_id manually.
4. Match the existing component pattern: useAuth/useOrg hooks, initializeDatabase guard, dark theme classes.
5. Import from the correct paths (relative to project root).
6. Return COMPLETE, working code — no TODOs, no placeholders, no "implement here" comments.
7. Include all necessary imports at the top.
8. Handle loading states and errors using the established patterns.

${manifestContext}

When generating code, output ONLY the code block. No explanations before or after unless specifically asked.
For multi-file changes, clearly separate each file with a header comment: // FILE: path/to/file.tsx`;
}

function buildUserPrompt(request: ClaudeCodeRequest): string {
  let prompt = `Task: ${request.task}\nType: ${request.task_type}\n`;

  if (request.target_files && request.target_files.length > 0) {
    prompt += `Target files: ${request.target_files.join(', ')}\n`;
  }

  if (request.context_hint) {
    prompt += `Additional context: ${request.context_hint}\n`;
  }

  if (request.constraints && request.constraints.length > 0) {
    prompt += `Constraints:\n${request.constraints.map(c => `- ${c}`).join('\n')}\n`;
  }

  prompt += `\nRespond with a JSON object matching this schema:
{
  "code": "the complete generated code",
  "explanation": "brief explanation of what was built and why",
  "files_affected": ["list", "of", "files"],
  "change_summary": "one-line summary for the change log",
  "confidence": "high" | "medium" | "low"
}`;

  return prompt;
}

// ---------------------------------------------------------------------------
// Claude API Communication (via Supabase Edge Function)
// ---------------------------------------------------------------------------

async function callClaudeProxy(
  systemPrompt: string,
  userPrompt: string
): Promise<ClaudeCodeResponse> {
  // Call our Supabase Edge Function which proxies to Claude API
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: {
      system: systemPrompt,
      message: userPrompt,
      max_tokens: 8192,
      model: 'claude-sonnet-4-5-20250929'
    }
  });

  if (error) {
    throw new Error(`Claude proxy error: ${error.message}`);
  }

  // The edge function returns { error, details } on Anthropic API failures
  if (data?.error) {
    const details = data.details || '';
    // Try to extract the human-readable error from Anthropic's response
    let readableError = data.error;
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (parsed?.error?.message) {
        readableError = parsed.error.message;
      }
    } catch {
      // details might not be JSON — use as-is
      if (typeof details === 'string' && details.length > 0) {
        readableError = details;
      }
    }
    throw new Error(readableError);
  }

  // The edge function returns Claude's response text
  const responseText: string = data?.response || data?.content || '';

  // Parse the JSON response from Claude
  try {
    // Extract JSON from response (Claude may wrap it in markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON found, treat the whole response as code
      return {
        success: true,
        code: responseText,
        explanation: 'Code generated successfully.',
        files_affected: [],
        change_summary: 'AI-generated code',
        confidence: 'medium'
      };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      code: parsed.code || responseText,
      explanation: parsed.explanation || '',
      files_affected: parsed.files_affected || [],
      change_summary: parsed.change_summary || 'AI-generated code',
      confidence: parsed.confidence || 'medium'
    };
  } catch {
    // JSON parse failed — return raw response as code
    return {
      success: true,
      code: responseText,
      explanation: 'Code generated (raw response).',
      files_affected: [],
      change_summary: 'AI-generated code',
      confidence: 'low'
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const claudeService = {
  /**
   * Generate code using Claude with full codebase context.
   * This is the main entry point — the IT Agent calls this for complex code tasks.
   */
  async generateCode(
    userId: string,
    request: ClaudeCodeRequest
  ): Promise<ClaudeCodeResponse> {
    // 1. Load the manifest (or use defaults if not yet stored)
    let manifest = await manifestService.getManifest(userId);
    if (!manifest) {
      // Use in-memory defaults — manifest hasn't been persisted yet
      manifest = {
        id: 'default',
        user_id: userId,
        org_id: null,
        version: '3.0',
        locked: false,
        locked_at: null,
        sections: manifestService.getDefaultSections(),
        total_tokens: manifestService.getDefaultTotalTokens(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // 2. Load recent structured changes for additional context
    const recentChanges = await changeLogService.getRecentChanges(userId, 30);

    // 3. Build prompts
    const systemPrompt = buildSystemPrompt(manifest, recentChanges);
    const userPrompt = buildUserPrompt(request);

    // 4. Call Claude
    const response = await callClaudeProxy(systemPrompt, userPrompt);

    // 5. Log this generation as a structured change
    try {
      await changeLogService.addEntry(userId, {
        category: 'ai_generated',
        agent: 'IT (Claude)',
        title: request.task.slice(0, 100),
        description: request.task,
        files_affected: response.files_affected,
        code_diff: response.code.slice(0, 10000),
        context_summary: response.change_summary,
        status: 'pending',
        parent_id: null
      });
    } catch {
      // Change log write failed — non-critical, continue
      console.warn('Failed to log Claude generation to structured_changes');
    }

    return response;
  },

  /**
   * Quick code task — skips change log, lighter weight.
   * Use for small modifications, explanations, bug analysis.
   */
  async quickTask(
    userId: string,
    task: string,
    taskType: ClaudeCodeRequest['task_type'] = 'explain'
  ): Promise<string> {
    const response = await this.generateCode(userId, {
      task,
      task_type: taskType
    });
    return response.code || response.explanation;
  },

  /**
   * Check if Claude proxy is configured and available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('claude-proxy', {
        body: { ping: true }
      });
      return !error;
    } catch {
      return false;
    }
  }
};
