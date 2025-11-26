import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality } from "@google/genai";
import { AgentRole, AppConfig } from "../types";

export interface ToolCalls {
  createTicket?: (title: string, description: string, assignee: string) => string;
  createLead?: (name: string, email: string, value: number) => string;
  createCampaign?: (name: string, platform: string, budget: number) => string;
  changeDashboard?: (view: string) => string;
  getRecentItems?: (type: string) => Promise<string>;
  deployAppModule?: (schema: string) => string;
}

const createTicketTool: FunctionDeclaration = {
  name: 'createTicket',
  description: 'Create a new requirement ticket or task in the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      assignee: { type: Type.STRING, description: "Name of the agent assigned" }
    },
    required: ['title', 'description', 'assignee']
  }
};

const createLeadTool: FunctionDeclaration = {
  name: 'createLead',
  description: 'Add a new potential client/lead to the CRM.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      email: { type: Type.STRING },
      value: { type: Type.NUMBER }
    },
    required: ['name', 'email', 'value']
  }
};

const createCampaignTool: FunctionDeclaration = {
  name: 'createCampaign',
  description: 'Launch a new marketing ad campaign.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      platform: { type: Type.STRING },
      budget: { type: Type.NUMBER }
    },
    required: ['name', 'platform', 'budget']
  }
};

const changeDashboardTool: FunctionDeclaration = {
  name: 'changeDashboard',
  description: 'Navigate the user interface to a specific dashboard view.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      view: { type: Type.STRING, description: "One of: 'sales', 'marketing', 'it', 'ceo', 'projects', 'meeting', OR a custom page ID if created." }
    },
    required: ['view']
  }
};

const getRecentItemsTool: FunctionDeclaration = {
    name: 'getRecentItems',
    description: 'Retrieve the most recent data items from the database.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, description: "One of: 'leads', 'tickets', 'campaigns', 'pages'" }
        },
        required: ['type']
    }
};

const deployAppModuleTool: FunctionDeclaration = {
    name: 'deployAppModule',
    description: 'IT MANAGER ONLY. Deploy a new custom page/module. Schema JSON must follow DynamicPage interface: { id, name, route, description, icon, widgets: [{id, type, title, dataSource, config, gridColSpan}] }.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            schema: { type: Type.STRING, description: "Valid JSON string defining the DynamicPage." }
        },
        required: ['schema']
    }
};

export class GeminiService {
  private ai: GoogleGenAI;
  private tools: ToolCalls;
  private config: AppConfig;
  private modelName = 'gemini-2.5-flash';
  private liveModelName = 'gemini-2.5-flash-native-audio-preview-09-2025';
  
  private logTrace?: (input: string, output: string, latency: number, status: 'success' | 'error') => void;

  constructor(config: AppConfig, tools: ToolCalls, logTrace?: (i:string, o:string, l:number, s:any)=>void) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.tools = tools;
    this.config = config;
    this.logTrace = logTrace;
  }

  private getSystemInstruction(): string {
    const { businessName, industry, agentNames } = this.config;
    return `
      You are an elite executive team running "${businessName}", a company in the "${industry}" industry.
      
      THE TEAM (Your Personas):
      1. IT/Tech: "${agentNames[AgentRole.IT]}". Precise, data-driven, maintains the system. CAN DEPLOY NEW PAGES using 'deployAppModule'.
      2. Sales: "${agentNames[AgentRole.SALES]}". Aggressive, charming, focuses on revenue.
      3. Marketing: "${agentNames[AgentRole.MARKETING]}". Creative, trendy, focuses on brand.
      4. CEO: "${agentNames[AgentRole.CEO]}". Strategic, decisive, keeps the team focused.
      
      PROTOCOL:
      - The user is the Owner/Founder.
      - Use the "[Agent Name]" prefix when speaking.
      - You can NAVIGATE the UI using 'changeDashboard'.
      - You can READ data using 'getRecentItems'.
      - If user asks for a new feature/page (e.g. "Create an Inventory page"), the IT Manager should generate a valid JSON schema and call 'deployAppModule'.
    `;
  }

  async sendMessage(history: string[], message: string): Promise<string> {
    const startTime = performance.now();
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [
          { role: 'user', parts: [{ text: `Conversation History:\n${history.join('\n')}\n\nUser Input: ${message}` }] }
        ],
        config: {
          systemInstruction: this.getSystemInstruction(),
          tools: [{ functionDeclarations: [createTicketTool, createLeadTool, createCampaignTool, changeDashboardTool, getRecentItemsTool, deployAppModuleTool] }]
        }
      });

      let finalText = response.text || "";
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        let toolOutputs: string[] = [];
        
        for (const call of functionCalls) {
          const { name, args } = call;
          let result = "Done.";
          
          if (name === 'createTicket' && this.tools.createTicket) {
            result = this.tools.createTicket(args.title as string, args.description as string, args.assignee as string);
          } else if (name === 'createLead' && this.tools.createLead) {
             result = this.tools.createLead(args.name as string, args.email as string, args.value as number);
          } else if (name === 'createCampaign' && this.tools.createCampaign) {
             result = this.tools.createCampaign(args.name as string, args.platform as string, args.budget as number);
          } else if (name === 'changeDashboard' && this.tools.changeDashboard) {
             result = this.tools.changeDashboard(args.view as string);
          } else if (name === 'getRecentItems' && this.tools.getRecentItems) {
             result = await this.tools.getRecentItems(args.type as string);
          } else if (name === 'deployAppModule' && this.tools.deployAppModule) {
             result = this.tools.deployAppModule(args.schema as string);
          }
          toolOutputs.push(`Tool ${name} executed. Result: ${result}`);
        }
        
        const finalResponse = await this.ai.models.generateContent({
          model: this.modelName,
          contents: [
            { role: 'user', parts: [{ text: `History:\n${history.join('\n')}\n\nUser Input: ${message}` }] },
            { role: 'model', parts: [{ functionCall: functionCalls[0] }] }, 
            { role: 'user', parts: [{ text: `System Tool Output: ${toolOutputs.join('\n')}. Provide final update to user.` }] }
          ]
        });
        finalText = finalResponse.text || "Operations completed.";
      }

      const latency = performance.now() - startTime;
      if (this.logTrace) {
        this.logTrace(message, finalText, latency, 'success');
      }

      return finalText;
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const latency = performance.now() - startTime;
      if (this.logTrace) this.logTrace(message, error.message, latency, 'error');
      return "[System Error]: Unable to reach the AI agents.";
    }
  }

  async connectLive(
    onAudioData: (base64Audio: string) => void,
    onTranscript: (text: string, isUser: boolean) => void
  ): Promise<(blob: Blob) => void> {
    
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    await outputAudioContext.resume();
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);
    let nextStartTime = 0;

    const sessionPromise = this.ai.live.connect({
      model: this.liveModelName,
      callbacks: {
        onopen: () => console.log("Live Session Opened"),
        onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                onTranscript(message.serverContent.outputTranscription.text, false);
            } else if (message.serverContent?.inputTranscription) {
                onTranscript(message.serverContent.inputTranscription.text, true);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                onAudioData(base64Audio);
                nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                const audioBytes = this.decode(base64Audio);
                const audioBuffer = await this.decodeAudioData(audioBytes, outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.start(nextStartTime);
                nextStartTime += audioBuffer.duration;
            }
            
             if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                   let result = "Success";
                   if (fc.name === 'createTicket' && this.tools.createTicket) {
                        result = this.tools.createTicket(fc.args.title as string, fc.args.description as string, fc.args.assignee as string);
                   } else if (fc.name === 'createLead' && this.tools.createLead) {
                        result = this.tools.createLead(fc.args.name as string, fc.args.email as string, fc.args.value as number);
                   } else if (fc.name === 'createCampaign' && this.tools.createCampaign) {
                        result = this.tools.createCampaign(fc.args.name as string, fc.args.platform as string, fc.args.budget as number);
                   } else if (fc.name === 'changeDashboard' && this.tools.changeDashboard) {
                        result = this.tools.changeDashboard(fc.args.view as string);
                   } else if (fc.name === 'deployAppModule' && this.tools.deployAppModule) {
                        result = this.tools.deployAppModule(fc.args.schema as string);
                   }
                   
                   sessionPromise.then(session => {
                       session.sendToolResponse({
                           functionResponses: {
                               id: fc.id,
                               name: fc.name,
                               response: { result }
                           }
                       });
                   });
                }
             }
        },
        onclose: () => console.log("Live Session Closed"),
        onerror: (e) => console.error("Live Session Error", e)
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        systemInstruction: this.getSystemInstruction(),
        tools: [{ functionDeclarations: [createTicketTool, createLeadTool, createCampaignTool, changeDashboardTool, deployAppModuleTool] }],
        inputAudioTranscription: {},
        outputAudioTranscription: {} 
      }
    });

    return async (pcmBlob: Blob) => {
        try {
            const session = await sessionPromise;
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = (reader.result as string).split(',')[1];
                try {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64data
                        }
                    });
                } catch (e) { console.error(e); }
            };
            reader.readAsDataURL(pcmBlob);
        } catch (e) { console.warn("Session not ready"); }
    };
  }

  private decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}

export function createPCMBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return new Blob([int16], { type: 'audio/pcm' });
}