// ============================================================================
// GEMINI PROXY CLIENT
// ============================================================================
// Drop-in replacements for @google/generative-ai and @google/genai SDK classes.
// Routes all generateContent calls through the Supabase Edge Function proxy.
// The GEMINI_API_KEY never reaches the browser.
//
// GeminiProxyClient  → replaces GoogleGenerativeAI  (CEO, Sales, Marketing agents)
// GenAIProxy         → replaces GoogleGenAI          (IT Agent)
//
// Exports SchemaType / Type constants so agent files need no other SDK imports.
// ============================================================================

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Schema type constants ─────────────────────────────────────────────────────
// Lowercase to match @google/generative-ai (CEO/Sales/Marketing).
// Gemini REST API accepts both cases; lowercase is the safe default.

export const SchemaType = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
} as const;

// Alias for @google/genai compatibility (import { Type } from ...)
export { SchemaType as Type };

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// ── Internal types ────────────────────────────────────────────────────────────

interface Part {
  text?: string;
  functionCall?: { name: string; args: Record<string, any> };
  functionResponse?: { name: string; response: Record<string, any> };
}

interface GeminiContent {
  role: string;
  parts: Part[];
}

interface GeminiAPIResponse {
  candidates?: Array<{ content: GeminiContent }>;
  error?: { message: string };
}

// ── Core proxy call ───────────────────────────────────────────────────────────

async function callProxy(params: {
  model: string;
  contents: GeminiContent[];
  systemInstruction?: string;
  tools?: any[];
}): Promise<GeminiAPIResponse> {
  const body: Record<string, any> = {
    model: params.model,
    contents: params.contents,
  };

  if (params.systemInstruction) {
    body.systemInstruction = { parts: [{ text: params.systemInstruction }] };
  }

  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
  }

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Gemini proxy HTTP ${res.status}`);
  }

  return res.json();
}

// ── ProxyResponse — matches GenerateContentResponse from @google/generative-ai ─

class ProxyResponse {
  constructor(private raw: GeminiAPIResponse) {}

  /** Returns the text from the model's response. */
  text(): string {
    const parts = this.raw.candidates?.[0]?.content?.parts || [];
    return parts
      .filter(p => p.text !== undefined)
      .map(p => p.text!)
      .join('');
  }

  /** Returns function calls if the model invoked tools, else undefined. */
  functionCalls(): Array<{ name: string; args: Record<string, any> }> | undefined {
    const parts = this.raw.candidates?.[0]?.content?.parts || [];
    const calls = parts
      .filter(p => p.functionCall)
      .map(p => ({ name: p.functionCall!.name, args: p.functionCall!.args }));
    return calls.length > 0 ? calls : undefined;
  }
}

// ── ProxyChatSession — matches ChatSession from @google/generative-ai ─────────

class ProxyChatSession {
  private history: GeminiContent[] = [];

  constructor(
    private model: string,
    private systemInstruction: string,
    private tools: any[],
    initialHistory: GeminiContent[] = []
  ) {
    this.history = [...initialHistory];
  }

  async sendMessage(
    message: string | Array<{ functionResponse: { name: string; response: any } }>
  ): Promise<{ response: ProxyResponse }> {
    // Build parts for this turn
    let parts: Part[];
    if (typeof message === 'string') {
      parts = [{ text: message }];
    } else {
      parts = message.map(m => ({ functionResponse: m.functionResponse }));
    }

    this.history.push({ role: 'user', parts });

    const raw = await callProxy({
      model: this.model,
      contents: this.history,
      systemInstruction: this.systemInstruction,
      tools: this.tools,
    });

    // Append model's response to history for multi-turn continuity
    const modelContent = raw.candidates?.[0]?.content;
    if (modelContent) {
      this.history.push(modelContent);
    }

    return { response: new ProxyResponse(raw) };
  }
}

// ── ProxyGenerativeModel — matches GenerativeModel from @google/generative-ai ──

class ProxyGenerativeModel {
  private systemInstruction: string;

  constructor(
    private modelName: string,
    config: { systemInstruction?: string }
  ) {
    this.systemInstruction = config.systemInstruction || '';
  }

  startChat(config: {
    tools?: any[];
    history?: GeminiContent[];
  }): ProxyChatSession {
    return new ProxyChatSession(
      this.modelName,
      this.systemInstruction,
      config.tools || [],
      config.history || []
    );
  }
}

// ── GeminiProxyClient — replaces GoogleGenerativeAI ──────────────────────────
// Usage:
//   const genAI = new GeminiProxyClient();
//   const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: '...' });
//   const chat  = model.startChat({ tools: [...] });
//   const res   = await chat.sendMessage('hello');
//   res.response.text()          // → string
//   res.response.functionCalls() // → [{ name, args }] | undefined

export class GeminiProxyClient {
  getGenerativeModel(config: {
    model: string;
    systemInstruction?: string;
  }): ProxyGenerativeModel {
    return new ProxyGenerativeModel(config.model, config);
  }
}

// ── GenAIProxy — replaces GoogleGenAI from @google/genai ─────────────────────
// Usage:
//   const genAI = new GenAIProxy();
//   const res = await genAI.models.generateContent({ model, contents, config: { systemInstruction, tools } });
//   res.text           // → string
//   res.functionCalls  // → [{ name, args }] | undefined

export class GenAIProxy {
  models = {
    generateContent: async (params: {
      model: string;
      contents: GeminiContent[];
      config?: {
        systemInstruction?: string;
        tools?: any[];
      };
    }): Promise<{
      text: string;
      functionCalls: Array<{ name: string; args: any }> | undefined;
    }> => {
      const raw = await callProxy({
        model: params.model,
        contents: params.contents,
        systemInstruction: params.config?.systemInstruction,
        tools: params.config?.tools,
      });

      const parts = raw.candidates?.[0]?.content?.parts || [];

      const text = parts
        .filter(p => p.text !== undefined)
        .map(p => p.text!)
        .join('');

      const calls = parts
        .filter(p => p.functionCall)
        .map(p => ({ name: p.functionCall!.name, args: p.functionCall!.args }));

      return {
        text,
        functionCalls: calls.length > 0 ? calls : undefined,
      };
    },
  };
}
