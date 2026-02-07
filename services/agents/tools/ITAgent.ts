// ============================================================================
// 2. IT AGENT IMPLEMENTATION
// ============================================================================
// services/agents/ITAgent.ts

import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from '../../database/DatabaseService';
import { ITAgentTools } from './itAgentTools';

export class ITAgent {
  private genAI: any;
  private model: any;
  private tools: ITAgentTools;
  private conversationHistory: any[] = [];

  constructor(apiKey: string, dbService: DatabaseService) {
    // Use VITE_GEMINI_API_KEY if available, else fall back to provided apiKey
    this.genAI = new (GoogleGenAI as any)({ apiKey: ((import.meta as any).env.VITE_GEMINI_API_KEY as string) || apiKey });
    this.tools = new ITAgentTools(dbService);
    
    // Use Gemini 2.0 Flash for cost efficiency
    this.model = this.genAI.getGenerativeModel ? this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2, // Lower for more precise technical responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
      tools: [{
        functionDeclarations: this.tools.getTools().map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: tool.parameters,
          }
        }))
      }]
    }) : null;
  }

  async chat(userMessage: string): Promise<string> {
    try {
      // Add system context for IT Agent persona
      const systemContext = `You are an expert IT Manager for BeardForce CRM. Your responsibilities:
- Database schema design and optimization
- Data integrity and validation
- Performance monitoring and tuning
- Backup and recovery procedures
- Technical documentation
- Security best practices

You have access to powerful database management tools. Always:
1. Explain what you're going to do before doing it
2. Warn about destructive operations
3. Suggest best practices
4. Log all schema changes
5. Consider data integrity and performance

Current conversation context: ${this.conversationHistory.length} previous messages.`;

      // Build conversation with context
      // If the SDK doesn't expose startChat (some SDK shapes differ), fall back to a single-turn generateContent
      if (!this.model || typeof this.model.startChat !== 'function') {
        console.warn('ITAgent: model.startChat not available; falling back to single-turn generation');
        const combined = `Conversation Context:\n${systemContext}\n\nUser Input: ${userMessage}`;
        const single = await this.genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [ { role: 'user', parts: [{ text: combined }] } ]
        });
        const textResponse = single.text || '';
        // Update history and return
        this.conversationHistory.push(
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: textResponse }] }
        );
        return textResponse;
      }

      const chatSession = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemContext }]
          },
          {
            role: 'model',
            parts: [{ text: 'Understood. I\'m your IT Manager ready to help with database operations and technical tasks.' }]
          },
          ...this.conversationHistory
        ]
      });

      const result = await chatSession.sendMessage(userMessage);
      const response = result.response;

      // Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionResults = [];

        for (const call of response.functionCalls) {
          const tool = this.tools.getTools().find(t => t.name === call.name);
          if (tool) {
            try {
              const result = await tool.execute(call.args);
              functionResults.push({
                functionResponse: {
                  name: call.name,
                  response: result
                }
              });
            } catch (error: any) {
              functionResults.push({
                functionResponse: {
                  name: call.name,
                  response: { error: error.message }
                }
              });
            }
          }
        }

        // Send function results back to model
        const finalResult = await chatSession.sendMessage(functionResults);
        const finalResponse = finalResult.response.text();

        // Update conversation history
        this.conversationHistory.push(
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: finalResponse }] }
        );

        return finalResponse;
      }

      // No function calls, just return text response
      const textResponse = response.text();
      this.conversationHistory.push(
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: textResponse }] }
      );

      return textResponse;
    } catch (error: any) {
      console.error('IT Agent error:', error);
      return `I encountered an error: ${error.message}. Please try again or rephrase your request.`;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getAvailableCommands(): string[] {
    return this.tools.getTools().map(t => `${t.name}: ${t.description}`);
  }
}