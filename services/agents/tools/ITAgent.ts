// ============================================================================
// 2. IT AGENT IMPLEMENTATION
// ============================================================================
// services/agents/ITAgent.ts

import { GoogleGenAI, Type } from '@google/genai';
import { DatabaseService } from '../../database/DatabaseService';
import { ITAgentTools } from './itAgentTools';

export class ITAgent {
  private genAI: GoogleGenAI;
  private tools: ITAgentTools;
  private conversationHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  private modelName = 'gemini-2.0-flash';

  constructor(apiKey: string, dbService: DatabaseService) {
    // Use VITE_GEMINI_API_KEY if available, else fall back to provided apiKey
    const key = ((import.meta as any).env.VITE_GEMINI_API_KEY as string) || apiKey;
    this.genAI = new GoogleGenAI({ apiKey: key });
    this.tools = new ITAgentTools(dbService);
  }

  private getSystemInstruction(): string {
    return `You are an expert IT Manager for BeardForce CRM. Your responsibilities:
- Database schema design and optimization
- Data integrity and validation
- Performance monitoring and tuning
- Reading and displaying records from tables
- Inserting new records into tables
- Writing code: generating React components, workflows, and modifications
- Creating system restore points for rollback safety
- Security best practices

You have access to these tools - ALWAYS use the appropriate tool:

DATABASE TOOLS:
- read_all_records: Show/list/view/display all records from any table (leads, contacts, accounts, etc.)
- insert_record: Add/insert/create new records into any table
- list_tables: Show all available tables
- get_table_schema: Show the structure/columns of a table
- search_records: Search for specific records by keyword
- analyze_table: Table statistics and insights
- create_table, add_column, modify_column, drop_column: Schema modifications
- create_index: Performance optimization
- backup_table: Create table backups
- import_data: Bulk import records
- performance_report: Database-wide performance analysis

CODE GENERATION TOOLS:
- generate_component: Generate a React + TypeScript + Tailwind CSS component (page, widget, form, table, card)
- generate_workflow: Create automation workflow code with triggers, conditions, and actions
- modify_component: Generate code modifications for an existing component
- list_code_snippets: List all previously generated code snippets

SYSTEM TOOLS:
- create_restore_point: Create a system restore point (snapshot of all CRM data) before major changes
- list_restore_points: List all available system restore points/snapshots

IMPORTANT RULES:
1. When the user asks to "show", "list", "view", or "get" records, ALWAYS use the read_all_records tool
2. When the user asks to "add", "insert", or "create" a record, ALWAYS use the insert_record tool
3. Table names should be lowercase (e.g., "leads", not "Leads")
4. Warn about destructive operations
5. Always use a tool when one is available - never say you cannot do something if a tool exists for it
6. When the user asks to "write code", "create a component", "build a page", or "generate", use generate_component or generate_workflow
7. Always display generated code in your response so the user can review and copy it
8. When generating code, follow project conventions: React functional components, TypeScript, Tailwind CSS dark theme (bg-gray-900, bg-gray-800, text-white, border-gray-700)
9. Before major database changes, suggest creating a restore point first`;
  }

  async chat(userMessage: string): Promise<string> {
    try {
      // Build conversation history for context
      const conversationContext = this.conversationHistory.length > 0
        ? `Previous conversation:\n${this.conversationHistory.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}\n\n`
        : '';

      // First AI call with tools
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [
          { role: 'user', parts: [{ text: `${conversationContext}User Input: ${userMessage}` }] }
        ],
        config: {
          systemInstruction: this.getSystemInstruction(),
          tools: [{
            functionDeclarations: this.tools.getTools().map((tool: any) => {
              // Transform parameters to Gemini format
              const properties: any = {};
              const required: string[] = [];

              // Convert parameter format: { param_name: { type: 'string', required: true } }
              // To Gemini format: { properties: { param_name: { type: Type.STRING } }, required: ['param_name'] }
              Object.entries(tool.parameters || {}).forEach(([key, value]: [string, any]) => {
                const typeMap: any = {
                  'string': Type.STRING,
                  'number': Type.NUMBER,
                  'boolean': Type.BOOLEAN,
                  'array': Type.ARRAY,
                  'object': Type.OBJECT
                };

                const paramType = typeMap[value.type] || Type.STRING;

                // Arrays need an items field specifying what's in the array
                if (value.type === 'array') {
                  properties[key] = {
                    type: paramType,
                    items: { type: Type.OBJECT }  // Default to object items
                  };
                } else {
                  properties[key] = {
                    type: paramType
                  };
                }

                if (value.required === true) {
                  required.push(key);
                }
              });

              return {
                name: tool.name,
                description: tool.description,
                parameters: {
                  type: Type.OBJECT,
                  properties: properties,
                  required: required
                }
              };
            })
          }]
        }
      });

      let finalText = response.text || "";
      const functionCalls = response.functionCalls;

      // Handle function calls
      if (functionCalls && functionCalls.length > 0) {
        const toolOutputs: string[] = [];

        for (const call of functionCalls) {
          const tool = this.tools.getTools().find(t => t.name === call.name);
          if (tool) {
            try {
              // Parse args if they're a string
              let args = (call as any).args;
              if (typeof args === 'string') {
                try { args = JSON.parse(args); } catch (e) { args = {}; }
              }

              const result = await tool.execute(args);
              toolOutputs.push(`Tool ${call.name} executed successfully. Result: ${JSON.stringify(result)}`);
            } catch (error: any) {
              toolOutputs.push(`Tool ${call.name} failed with error: ${error.message}`);
            }
          } else {
            toolOutputs.push(`Tool ${call.name} not found`);
          }
        }

        // Second AI call with tool results
        const finalResponse = await this.genAI.models.generateContent({
          model: this.modelName,
          contents: [
            { role: 'user', parts: [{ text: `${conversationContext}User Input: ${userMessage}` }] },
            { role: 'model', parts: [{ text: `I will use these tools: ${functionCalls.map(fc => fc.name).join(', ')}` }] },
            { role: 'user', parts: [{ text: `System Tool Output:\n${toolOutputs.join('\n')}\n\nProvide a final summary to the user.` }] }
          ],
          config: {
            systemInstruction: this.getSystemInstruction()
          }
        });
        finalText = finalResponse.text || "Operations completed.";
      }

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: finalText }] }
      );

      // Keep history manageable (last 10 exchanges)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return finalText;
    } catch (error: any) {
      console.error('IT Agent error:', error);

      // Provide more helpful error messages
      if (error.message?.includes('API key')) {
        return `❌ API Key Error: Please make sure VITE_GEMINI_API_KEY is set in your .env.local file.\n\nError: ${error.message}`;
      }
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        return `❌ API Quota Exceeded: You've hit your API rate limit. Please wait a few moments and try again.`;
      }

      return `I encountered an error: ${error.message}\n\nPlease check:\n1. Your Gemini API key is valid\n2. You have API quota remaining\n3. Your internet connection is working`;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getAvailableCommands(): string[] {
    return this.tools.getTools().map(t => `${t.name}: ${t.description}`);
  }
}
