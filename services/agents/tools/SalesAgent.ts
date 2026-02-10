import { GoogleGenerativeAI, FunctionDeclaration, SchemaType as Type } from '@google/generative-ai';
import { databaseService } from '../../database';
import { notificationService } from '../../notificationService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Dynamic config (updated by constructor for per-component instances)
let _orgName = 'RunwayCRM';

interface ToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

// Define Sales Agent Tools
const salesTools: ToolDefinition[] = [
  {
    name: 'create_lead',
    description: 'Create a new lead in the CRM. Use this when a user wants to add a new lead, prospect, or potential customer.',
    parameters: {
      name: { type: 'string', required: true, description: 'Full name of the lead' },
      email: { type: 'string', required: false, description: 'Email address' },
      phone: { type: 'string', required: false, description: 'Phone number' },
      company: { type: 'string', required: false, description: 'Company name' },
      source: { type: 'string', required: false, description: 'Lead source (website, referral, social_media, cold_call, event, other)' },
      status: { type: 'string', required: false, description: 'Lead status (new, contacted, qualified, unqualified, converted)' },
      beard_type: { type: 'string', required: false, description: 'Beard type for grooming products (full, goatee, stubble, mustache, none)' },
      notes: { type: 'string', required: false, description: 'Additional notes about the lead' }
    },
    handler: async ({ name, email, phone, company, source, status, beard_type, notes }) => {
      try {
        const lead = await databaseService.createLead({
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          source: source || 'other',
          status: status || 'new',
          beard_type: beard_type || null,
          score: 0,
          notes: notes || null
        });

        try {
          await notificationService.createNotification(
            databaseService.getUserId(), 'New Lead Created',
            `Lead "${name}" added${company ? ` from ${company}` : ''}`,
            'success', 'Sales', lead.id, 'lead'
          );
        } catch {}

        return {
          success: true,
          lead_id: lead.id,
          message: `Lead "${name}" created successfully! ${email ? `Email: ${email}` : ''} ${company ? `Company: ${company}` : ''}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'get_all_leads',
    description: 'Get all leads in the CRM with optional status filtering',
    parameters: {
      status: { type: 'string', required: false, description: 'Filter by status (new, contacted, qualified, unqualified, converted)' }
    },
    handler: async ({ status }) => {
      try {
        const filters = status ? [{ column: 'status', operator: '=', value: status }] : [];
        const leads = await databaseService.getLeads(filters);

        return {
          success: true,
          count: leads.length,
          leads: leads.map(lead => ({
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            status: lead.status,
            score: lead.score,
            source: lead.source
          })),
          message: `Found ${leads.length} lead${leads.length !== 1 ? 's' : ''}${status ? ` with status "${status}"` : ''}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'qualify_lead',
    description: 'Qualify a lead by analyzing their data and assigning a score (0-100). Updates lead status and score.',
    parameters: {
      lead_id: { type: 'string', required: true, description: 'ID of the lead to qualify' },
      qualification_notes: { type: 'string', required: false, description: 'Notes about qualification decision' }
    },
    handler: async ({ lead_id, qualification_notes }) => {
      try {
        const leads = await databaseService.getLeads([{ column: 'id', operator: '=', value: lead_id }]);
        if (leads.length === 0) return { error: 'Lead not found' };

        const lead = leads[0];
        let score = 0;

        // Scoring logic
        if (lead.email) score += 20;
        if (lead.phone) score += 20;
        if (lead.company) score += 20;
        if (lead.beard_type && lead.beard_type !== 'none') score += 20;
        if (lead.source) score += 10;
        if (lead.notes) score += 10;

        const newStatus = score >= 60 ? 'qualified' : lead.status;

        await databaseService.updateLead(lead_id, {
          score,
          status: newStatus,
          notes: lead.notes ? `${lead.notes}\n\n${qualification_notes || 'Auto-qualified'}` : qualification_notes
        });

        return {
          success: true,
          lead_name: lead.name,
          score,
          status: newStatus,
          message: `Lead ${lead.name} qualified with score ${score}/100`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'create_opportunity',
    description: 'Create a new sales opportunity from a qualified lead',
    parameters: {
      lead_id: { type: 'string', required: true, description: 'ID of the lead' },
      title: { type: 'string', required: true, description: 'Opportunity title' },
      amount: { type: 'number', required: true, description: 'Expected deal amount' },
      stage: { type: 'string', required: false, description: 'Pipeline stage (prospecting, qualification, proposal, negotiation, closed_won, closed_lost)' },
      close_date: { type: 'string', required: false, description: 'Expected close date (YYYY-MM-DD)' },
      notes: { type: 'string', required: false, description: 'Opportunity notes' }
    },
    handler: async ({ lead_id, title, amount, stage, close_date, notes }) => {
      try {
        const leads = await databaseService.getLeads([{ column: 'id', operator: '=', value: lead_id }]);
        if (leads.length === 0) return { error: 'Lead not found' };

        const lead = leads[0];
        const opportunity = await databaseService.createOpportunity({
          title,
          amount,
          stage: stage || 'prospecting',
          close_date: close_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          probability: stage === 'closed_won' ? 100 : stage === 'closed_lost' ? 0 : 50,
          lead_id,
          contact_name: lead.name,
          contact_email: lead.email,
          notes
        });

        try {
          await notificationService.createNotification(
            databaseService.getUserId(), 'New Opportunity Created',
            `"${title}" worth $${amount.toLocaleString()} for ${lead.name}`,
            'success', 'Sales', opportunity.id, 'opportunity'
          );
        } catch {}

        return {
          success: true,
          opportunity_id: opportunity.id,
          title,
          amount,
          message: `Created opportunity "${title}" for ${lead.name} worth $${amount}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'get_pipeline',
    description: 'Get all opportunities in the sales pipeline with optional filtering by stage',
    parameters: {
      stage: { type: 'string', required: false, description: 'Filter by stage (prospecting, qualification, proposal, negotiation, closed_won, closed_lost)' }
    },
    handler: async ({ stage }) => {
      try {
        const filters = stage ? [{ column: 'stage', operator: '=', value: stage }] : [];
        const opportunities = await databaseService.getOpportunities(filters);

        const total_value = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        const weighted_value = opportunities.reduce((sum, opp) => sum + (opp.amount || 0) * (opp.probability || 0) / 100, 0);

        return {
          success: true,
          count: opportunities.length,
          opportunities: opportunities.map(opp => ({
            id: opp.id,
            title: opp.title,
            amount: opp.amount,
            stage: opp.stage,
            probability: opp.probability,
            close_date: opp.close_date,
            contact_name: opp.contact_name
          })),
          total_value,
          weighted_value: Math.round(weighted_value)
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'update_opportunity_stage',
    description: 'Move an opportunity to a different stage in the sales pipeline',
    parameters: {
      opportunity_id: { type: 'string', required: true, description: 'ID of the opportunity' },
      new_stage: { type: 'string', required: true, description: 'New stage (prospecting, qualification, proposal, negotiation, closed_won, closed_lost)' },
      notes: { type: 'string', required: false, description: 'Notes about the stage change' }
    },
    handler: async ({ opportunity_id, new_stage, notes }) => {
      try {
        const opportunities = await databaseService.getOpportunities([{ column: 'id', operator: '=', value: opportunity_id }]);
        if (opportunities.length === 0) return { error: 'Opportunity not found' };

        const opp = opportunities[0];
        const probability_map: Record<string, number> = {
          'prospecting': 10,
          'qualification': 25,
          'proposal': 50,
          'negotiation': 75,
          'closed_won': 100,
          'closed_lost': 0
        };

        await databaseService.getAdapter().update('opportunities', opportunity_id, {
          stage: new_stage,
          probability: probability_map[new_stage] || 50,
          notes: notes ? `${opp.notes || ''}\n\n[${new Date().toISOString().split('T')[0]}] ${notes}` : opp.notes
        });

        return {
          success: true,
          opportunity_title: opp.title,
          old_stage: opp.stage,
          new_stage,
          message: `Moved "${opp.title}" from ${opp.stage} to ${new_stage}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'forecast_revenue',
    description: 'Generate sales forecast based on current pipeline',
    parameters: {
      period: { type: 'string', required: false, description: 'Forecast period (this_month, this_quarter, this_year)' }
    },
    handler: async ({ period }) => {
      try {
        const opportunities = await databaseService.getOpportunities();
        const now = new Date();

        let filtered = opportunities.filter(opp => {
          if (!opp.close_date) return false;
          const closeDate = new Date(opp.close_date);

          if (period === 'this_month') {
            return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
          } else if (period === 'this_quarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            const oppQuarter = Math.floor(closeDate.getMonth() / 3);
            return oppQuarter === quarter && closeDate.getFullYear() === now.getFullYear();
          } else if (period === 'this_year') {
            return closeDate.getFullYear() === now.getFullYear();
          }
          return closeDate >= now;
        });

        const by_stage: Record<string, any> = {};
        filtered.forEach(opp => {
          if (!by_stage[opp.stage]) {
            by_stage[opp.stage] = { count: 0, total_value: 0, weighted_value: 0 };
          }
          by_stage[opp.stage].count++;
          by_stage[opp.stage].total_value += opp.amount || 0;
          by_stage[opp.stage].weighted_value += (opp.amount || 0) * (opp.probability || 0) / 100;
        });

        const total_pipeline = filtered.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        const weighted_forecast = filtered.reduce((sum, opp) => sum + (opp.amount || 0) * (opp.probability || 0) / 100, 0);

        return {
          success: true,
          period: period || 'all_future',
          total_opportunities: filtered.length,
          total_pipeline_value: total_pipeline,
          weighted_forecast: Math.round(weighted_forecast),
          by_stage,
          message: `Forecast for ${period || 'all future'}: $${Math.round(weighted_forecast)} (weighted) from $${total_pipeline} pipeline`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'schedule_follow_up',
    description: 'Schedule a follow-up task for a lead or opportunity',
    parameters: {
      entity_type: { type: 'string', required: true, description: 'Type of entity (lead or opportunity)' },
      entity_id: { type: 'string', required: true, description: 'ID of the lead or opportunity' },
      follow_up_date: { type: 'string', required: true, description: 'Follow-up date (YYYY-MM-DD)' },
      follow_up_notes: { type: 'string', required: true, description: 'What to do in the follow-up' }
    },
    handler: async ({ entity_type, entity_id, follow_up_date, follow_up_notes }) => {
      try {
        if (entity_type === 'lead') {
          const leads = await databaseService.getLeads([{ column: 'id', operator: '=', value: entity_id }]);
          if (leads.length === 0) return { error: 'Lead not found' };

          const lead = leads[0];
          await databaseService.updateLead(entity_id, {
            notes: `${lead.notes || ''}\n\n[FOLLOW-UP ${follow_up_date}] ${follow_up_notes}`
          });

          return {
            success: true,
            message: `Scheduled follow-up with ${lead.name} on ${follow_up_date}`
          };
        } else if (entity_type === 'opportunity') {
          const opportunities = await databaseService.getOpportunities([{ column: 'id', operator: '=', value: entity_id }]);
          if (opportunities.length === 0) return { error: 'Opportunity not found' };

          const opp = opportunities[0];
          await databaseService.getAdapter().update('opportunities', entity_id, {
            notes: `${opp.notes || ''}\n\n[FOLLOW-UP ${follow_up_date}] ${follow_up_notes}`
          });

          return {
            success: true,
            message: `Scheduled follow-up for "${opp.title}" on ${follow_up_date}`
          };
        }

        return { error: 'Invalid entity_type. Use "lead" or "opportunity"' };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'draft_email',
    description: 'Generate a professional email draft for a lead or opportunity',
    parameters: {
      recipient_name: { type: 'string', required: true, description: 'Name of the recipient' },
      email_type: { type: 'string', required: true, description: 'Type of email (introduction, follow_up, proposal, thank_you, closing)' },
      context: { type: 'string', required: false, description: 'Additional context about the opportunity' }
    },
    handler: async ({ recipient_name, email_type, context }) => {
      const templates: Record<string, string> = {
        introduction: `Subject: Introduction to ${_orgName} CRM Solutions

Dear ${recipient_name},

I hope this email finds you well. My name is [Your Name] from ${_orgName}, and I wanted to reach out to introduce our innovative CRM solutions.

${context || 'We specialize in helping businesses streamline their customer relationships and sales processes.'}

Would you be available for a brief 15-minute call next week to discuss how we can help your organization?

Best regards,
[Your Name]
${_orgName} Sales Team`,

        follow_up: `Subject: Following up on our conversation

Hi ${recipient_name},

Thank you for taking the time to speak with me. I wanted to follow up on our discussion about ${_orgName} CRM.

${context || 'As promised, I wanted to share more information about how we can address your specific needs.'}

Please let me know if you have any questions or would like to schedule a demo.

Looking forward to hearing from you.

Best regards,
[Your Name]`,

        proposal: `Subject: Proposal for ${_orgName} CRM Implementation

Dear ${recipient_name},

Following our conversations, I'm pleased to present our proposal for implementing ${_orgName} CRM for your organization.

${context || 'Our solution will provide you with comprehensive tools for managing leads, opportunities, and customer relationships.'}

I've attached a detailed proposal document. Let's schedule a call to walk through the details.

Best regards,
[Your Name]`,

        thank_you: `Subject: Thank you

Hi ${recipient_name},

Thank you for choosing ${_orgName}! We're excited to partner with you.

${context || 'Our team is ready to ensure a smooth onboarding process.'}

I'll be your primary point of contact. Please don't hesitate to reach out if you need anything.

Best regards,
[Your Name]`,

        closing: `Subject: Moving forward with ${_orgName}

Dear ${recipient_name},

I hope this email finds you well. I wanted to check in regarding our proposal for ${_orgName} CRM.

${context || 'We believe our solution can provide significant value to your organization.'}

Are there any questions I can answer to help move this forward?

Best regards,
[Your Name]`
      };

      return {
        success: true,
        email_draft: templates[email_type] || templates['follow_up'],
        message: `Generated ${email_type} email for ${recipient_name}`
      };
    }
  },
  {
    name: 'create_quote',
    description: 'Generate a price quote for a product or service',
    parameters: {
      opportunity_id: { type: 'string', required: true, description: 'ID of the opportunity' },
      products: { type: 'array', required: true, description: 'Array of product IDs to include' },
      discount_percent: { type: 'number', required: false, description: 'Discount percentage (0-100)' }
    },
    handler: async ({ opportunity_id, products, discount_percent }) => {
      try {
        const opportunities = await databaseService.getOpportunities([{ column: 'id', operator: '=', value: opportunity_id }]);
        if (opportunities.length === 0) return { error: 'Opportunity not found' };

        const opp = opportunities[0];
        const allProducts = await databaseService.getProducts();
        const selectedProducts = allProducts.filter(p => products.includes(p.id));

        if (selectedProducts.length === 0) {
          return { error: 'No valid products found' };
        }

        const subtotal = selectedProducts.reduce((sum, p) => sum + (p.price || 0), 0);
        const discount = discount_percent ? subtotal * (discount_percent / 100) : 0;
        const total = subtotal - discount;

        const quote = {
          quote_id: `Q-${Date.now()}`,
          opportunity_title: opp.title,
          contact_name: opp.contact_name,
          date: new Date().toISOString().split('T')[0],
          items: selectedProducts.map(p => ({
            name: p.name,
            description: p.description,
            price: p.price
          })),
          subtotal,
          discount,
          discount_percent: discount_percent || 0,
          total,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        return {
          success: true,
          quote,
          message: `Generated quote for "${opp.title}" - Total: $${total}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'track_deal',
    description: 'Get detailed tracking information for a specific deal/opportunity',
    parameters: {
      opportunity_id: { type: 'string', required: true, description: 'ID of the opportunity to track' }
    },
    handler: async ({ opportunity_id }) => {
      try {
        const opportunities = await databaseService.getOpportunities([{ column: 'id', operator: '=', value: opportunity_id }]);
        if (opportunities.length === 0) return { error: 'Opportunity not found' };

        const opp = opportunities[0];
        const created = new Date(opp.created_at);
        const closeDate = opp.close_date ? new Date(opp.close_date) : null;
        const now = new Date();

        const age_days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        const days_to_close = closeDate ? Math.floor((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        return {
          success: true,
          opportunity: {
            id: opp.id,
            title: opp.title,
            stage: opp.stage,
            amount: opp.amount,
            probability: opp.probability,
            weighted_value: Math.round((opp.amount || 0) * (opp.probability || 0) / 100),
            contact_name: opp.contact_name,
            contact_email: opp.contact_email,
            created_at: opp.created_at,
            close_date: opp.close_date,
            age_days,
            days_to_close,
            notes: opp.notes
          },
          message: `Tracking "${opp.title}" - ${opp.stage} stage, ${opp.probability}% probability, $${opp.amount}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'revenue_report',
    description: 'Generate a comprehensive revenue report with won deals and trends',
    parameters: {
      period: { type: 'string', required: false, description: 'Report period (this_month, last_month, this_quarter, this_year)' }
    },
    handler: async ({ period }) => {
      try {
        const opportunities = await databaseService.getOpportunities([
          { column: 'stage', operator: '=', value: 'closed_won' }
        ]);

        const now = new Date();
        let filtered = opportunities.filter(opp => {
          if (!opp.close_date) return false;
          const closeDate = new Date(opp.close_date);

          if (period === 'this_month') {
            return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
          } else if (period === 'last_month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return closeDate.getMonth() === lastMonth.getMonth() && closeDate.getFullYear() === lastMonth.getFullYear();
          } else if (period === 'this_quarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            const oppQuarter = Math.floor(closeDate.getMonth() / 3);
            return oppQuarter === quarter && closeDate.getFullYear() === now.getFullYear();
          } else if (period === 'this_year') {
            return closeDate.getFullYear() === now.getFullYear();
          }
          return true;
        });

        const total_revenue = filtered.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        const avg_deal_size = filtered.length > 0 ? total_revenue / filtered.length : 0;

        return {
          success: true,
          period: period || 'all_time',
          deals_won: filtered.length,
          total_revenue,
          average_deal_size: Math.round(avg_deal_size),
          deals: filtered.map(opp => ({
            id: opp.id,
            title: opp.title,
            amount: opp.amount,
            close_date: opp.close_date,
            contact_name: opp.contact_name
          })),
          message: `Revenue Report (${period || 'all time'}): ${filtered.length} deals won, $${total_revenue} total revenue, $${Math.round(avg_deal_size)} avg deal size`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  }
];

// Transform tools for Gemini format
const transformedTools: FunctionDeclaration[] = salesTools.map(tool => {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  Object.entries(tool.parameters || {}).forEach(([key, value]: [string, any]) => {
    const typeMap: any = {
      'string': Type.STRING,
      'number': Type.NUMBER,
      'boolean': Type.BOOLEAN,
      'array': Type.ARRAY,
      'object': Type.OBJECT
    };
    const paramType = typeMap[value.type] || Type.STRING;

    if (value.type === 'array') {
      properties[key] = {
        type: paramType,
        description: value.description,
        items: { type: Type.STRING }
      };
    } else {
      properties[key] = {
        type: paramType,
        description: value.description
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
      properties,
      required
    }
  };
});

export class SalesAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatSession: any;
  private conversationHistory: any[] = [];

  constructor(config?: { agentName?: string; orgName?: string; personality?: string }) {
    if (!GEMINI_API_KEY) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }

    if (config?.orgName) _orgName = config.orgName;
    const agentName = config?.agentName || 'Sales';
    const personality = config?.personality ? `\n\nAdditional personality guidance: ${config.personality}` : '';

    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are the ${agentName} Agent for ${_orgName}. Your role is to:

1. QUALIFY LEADS: Analyze and score leads based on their information
2. MANAGE PIPELINE: Create and track sales opportunities through the pipeline
3. FORECAST REVENUE: Provide accurate sales forecasts based on current opportunities
4. FOLLOW UP: Schedule and track follow-ups with leads and opportunities
5. COMMUNICATE: Draft professional emails for various sales scenarios
6. CREATE QUOTES: Generate price quotes for opportunities
7. TRACK DEALS: Monitor deal progress and provide detailed tracking information
8. REPORT REVENUE: Generate comprehensive revenue reports

You have access to 10 specialized sales tools. Always use these tools to help users manage their sales process effectively.

Be professional, data-driven, and always focus on moving deals forward. When qualifying leads, be thorough. When forecasting, be realistic. When communicating, be persuasive but honest.

Format your responses clearly with headers and bullet points. Always confirm actions taken and provide relevant metrics.${personality}`
    });
  }

  async initialize() {
    this.chatSession = this.model.startChat({
      tools: [{ functionDeclarations: transformedTools }],
      history: []
    });
  }

  async chat(message: string): Promise<string> {
    try {
      if (!this.chatSession) {
        await this.initialize();
      }

      const result = await this.chatSession.sendMessage(message);
      const response = result.response;

      // Handle function calls
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = await Promise.all(
          functionCalls.map(async (call: any) => {
            const tool = salesTools.find(t => t.name === call.name);
            if (!tool) {
              return {
                functionResponse: {
                  name: call.name,
                  response: { error: 'Unknown function' }
                }
              };
            }

            try {
              const result = await tool.handler(call.args);
              return {
                functionResponse: {
                  name: call.name,
                  response: result
                }
              };
            } catch (error: any) {
              return {
                functionResponse: {
                  name: call.name,
                  response: { error: error.message }
                }
              };
            }
          })
        );

        // Send function responses back
        const followUpResult = await this.chatSession.sendMessage(functionResponses);
        return followUpResult.response.text();
      }

      return response.text();
    } catch (error: any) {
      console.error('Sales Agent Error:', error);
      return `❌ Error: ${error.message || 'Failed to process request'}`;
    }
  }

  getConversationHistory() {
    return this.conversationHistory;
  }
}

export const salesAgent = new SalesAgent();
