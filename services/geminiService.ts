import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality } from "@google/genai";
import { AgentRole } from "../types";

// --- Types & Interfaces for Service ---

export interface ToolCalls {
  createTicket?: (title: string, description: string, assignee: string) => string;
  createLead?: (name: string, email: string, value: number) => string;
  createCampaign?: (name: string, platform: string, budget: number) => string;
}

// --- Tool Definitions ---

const createTicketTool: FunctionDeclaration = {
  name: 'createTicket',
  description: 'Create a new requirement ticket or task in the Jira system.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      assignee: { type: Type.STRING, description: "Role must be exactly one of: 'IT Manager', 'Sales Manager', 'Market Manager', 'CEO'" }
    },
    required: ['title', 'description', 'assignee']
  }
};

const createLeadTool: FunctionDeclaration = {
  name: 'createLead',
  description: 'Add a new sales lead to the CRM.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      email: { type: Type.STRING },
      value: { type: Type.NUMBER, description: 'Estimated potential value in USD' }
    },
    required: ['name', 'email', 'value']
  }
};

const createCampaignTool: FunctionDeclaration = {
  name: 'createCampaign',
  description: 'Launch a new marketing campaign.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      platform: { type: Type.STRING, description: "e.g. 'Facebook', 'Instagram', 'Google', 'Email'" },
      budget: { type: Type.NUMBER }
    },
    required: ['name', 'platform', 'budget']
  }
};

// --- Service Implementation ---

export class GeminiService {
  private ai: GoogleGenAI;
  private tools: ToolCalls;
  private modelName = 'gemini-2.5-flash';
  private liveModelName = 'gemini-2.5-flash-native-audio-preview-09-2025';

  constructor(tools: ToolCalls) {
    // Assuming process.env.API_KEY is available
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.tools = tools;
  }

  // --- Standard Chat ---
  async sendMessage(history: string[], message: string): Promise<string> {
    const systemInstruction = `
      You are a simulated team of 4 agents managing a Beard Product CRM.
      Roles: 
      1. IT Manager: Technical, precise, manages database/tickets.
      2. Sales Manager: Energetic, focused on revenue/leads.
      3. Market Manager: Creative, focused on ads/growth.
      4. CEO: Strategic, focuses on overview and expenses.
      
      The user is the Founder/Owner.
      
      When you respond, assume the persona of the most relevant agent for the query. 
      You can also have multiple agents chime in if complex.
      Prefix every paragraph with the Agent's Role like "[Sales Manager]: ...".
      
      If the user asks to do something, use the available tools.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [
          { role: 'user', parts: [{ text: `History:\n${history.join('\n')}\n\nUser Input: ${message}` }] }
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [createTicketTool, createLeadTool, createCampaignTool] }]
        }
      });

      // Handle function calls if any
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
          }
          toolOutputs.push(`${name} executed: ${result}`);
        }
        
        // Send tool response back to get final text
        const finalResponse = await this.ai.models.generateContent({
          model: this.modelName,
          contents: [
            { role: 'user', parts: [{ text: `History:\n${history.join('\n')}\n\nUser Input: ${message}` }] },
            { role: 'model', parts: [{ functionCall: functionCalls[0] }] }, // Simplified for single turn
            { role: 'user', parts: [{ text: `Tool Output: ${toolOutputs.join('\n')}. Now summarize what happened for the user.` }] }
          ]
        });
        return finalResponse.text || "Command executed.";
      }

      return response.text || "I didn't catch that.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "[System]: Error connecting to AI team.";
    }
  }

  // --- Live API (Audio) ---

  async connectLive(
    onAudioData: (base64Audio: string) => void,
    onTranscript: (text: string, isUser: boolean) => void
  ): Promise<(blob: Blob) => void> {
    
    // Setup Audio Contexts for Playback
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);
    
    let nextStartTime = 0;

    const sessionPromise = this.ai.live.connect({
      model: this.liveModelName,
      callbacks: {
        onopen: () => console.log("Live Session Opened"),
        onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.outputTranscription) {
                onTranscript(message.serverContent.outputTranscription.text, false);
            } else if (message.serverContent?.inputTranscription) {
                onTranscript(message.serverContent.inputTranscription.text, true);
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                // Pass to UI for visualizer if needed
                onAudioData(base64Audio);

                // Play Audio
                nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                const audioBytes = this.decode(base64Audio);
                const audioBuffer = await this.decodeAudioData(audioBytes, outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.start(nextStartTime);
                nextStartTime += audioBuffer.duration;
            }
            
            // Handle Tool Calls in Live Mode
             if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                   // Execute tool
                   let result = "Success";
                   if (fc.name === 'createTicket' && this.tools.createTicket) {
                        result = this.tools.createTicket(fc.args.title as string, fc.args.description as string, fc.args.assignee as string);
                   } else if (fc.name === 'createLead' && this.tools.createLead) {
                        result = this.tools.createLead(fc.args.name as string, fc.args.email as string, fc.args.value as number);
                   } else if (fc.name === 'createCampaign' && this.tools.createCampaign) {
                        result = this.tools.createCampaign(fc.args.name as string, fc.args.platform as string, fc.args.budget as number);
                   }
                   
                   // Send response
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
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } // A deep, masculine voice suitable for beard products
        },
        systemInstruction: `You are a group of assistants (Sales, Marketing, IT, CEO) for a Beard Product company. 
        You are in a voice meeting with the founder. Keep responses concise and conversational.
        If the user asks to create a ticket, lead, or campaign, use the tools.`,
        tools: [{ functionDeclarations: [createTicketTool, createLeadTool, createCampaignTool] }],
        inputAudioTranscription: {}, // Corrected: Empty object to enable transcription
        outputAudioTranscription: {} 
      }
    });

    // Return a function to send audio blobs to the session
    return async (pcmBlob: Blob) => {
        const session = await sessionPromise;
        // Convert Blob to base64 and send
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            session.sendRealtimeInput({
                media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64data
                }
            });
        };
        reader.readAsDataURL(pcmBlob);
    };
  }

  // Helper: Decode Base64 to Uint8Array
  private decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Helper: Decode Raw PCM to AudioBuffer
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

// Utility to create PCM blob from Float32Array (Microphone input)
export function createPCMBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return new Blob([int16], { type: 'audio/pcm' });
}