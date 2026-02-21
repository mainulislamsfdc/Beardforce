# AI Agent System

## Overview

RunwayCRM uses four specialized AI agents, each powered by **Google Gemini 2.0 Flash**. Agents use Gemini's **function calling** feature to execute real operations against the database, rather than just generating text responses.

**v7 API key handling:** The Gemini API key is no longer exposed in the browser. All Gemini requests are proxied through a **Supabase Edge Function** (`gemini-proxy`). The key is stored as a server-side secret (`GEMINI_API_KEY`) and never reaches the client.

All agents follow the same architectural pattern:
1. A `ToolDefinition[]` array defines tools with name, description, parameters, and handler function
2. Tools are transformed into Gemini `FunctionDeclaration[]` format at module load time
3. An agent class manages the Gemini chat session and function call loop
4. A singleton instance is exported for use by UI components

## Agent Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Agent Class                          │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  GeminiProxy     │  │  Chat Session    │            │
│  │  (Edge Function) │  │  (stateful)      │            │
│  └──────────┬───────┘  └────────┬─────────┘            │
│             │                    │                      │
│  ┌──────────┴────────────────────┴─────────────────┐   │
│  │         Tool Definitions + Handlers             │   │
│  │         (function calling declarations)         │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘

User Message
     │
     ▼
Agent.chat(message)
     │
     ▼
POST /functions/v1/gemini-proxy   ← Supabase Edge Function
     │  (Gemini API key server-side only)
     ▼
Gemini 2.0 Flash API
     │
     ├── Text response → return to user
     │
     └── Function call(s) → Agent runs handler(s) → sends results back → final text
```

### Function Calling Flow

```
1. User sends message → agent.chat(message)
2. Agent sends message to Gemini with tool declarations
3. Gemini analyzes intent and returns either:
   a) Text response → return directly to user
   b) Function call(s) → agent executes tool handler(s)
4. Tool results are sent back to Gemini
5. Gemini generates final human-readable response
6. Response displayed in chat UI
```

Multi-tool calls are supported — Gemini can request multiple tools in a single turn, and the agent executes them in parallel via `Promise.all`.

---

## CEO Agent

**File:** `services/agents/tools/CEOAgent.ts`
**Role:** Executive oversight, strategic planning, agent coordination
**Singleton:** `export const ceoAgent = new CEOAgent()`

### System Prompt Summary
Strategic, data-driven executive with oversight of all operations. Monitors KPIs, allocates resources, coordinates cross-agent workflows, and generates executive reports.

### Tools (10)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `generate_executive_dashboard` | KPIs across all departments (sales metrics, AI costs, agent performance) | `period?` |
| `monitor_agent_activity` | Track activities and costs from change_log + ai_budget tables | `agent_name?` |
| `review_budget_status` | AI budget analysis with spending projections | `include_projections?` |
| `coordinate_agents` | Plan multi-agent workflows (lead_to_customer, campaign_launch, system_optimization) | `workflow_type` |
| `set_goals_and_kpis` | Define organizational goals with auto-generated KPIs | `department`, `goal_type`, `target_value` |
| `approve_major_decision` | Approve/reject/request-info on change_log entries | `decision_id`, `action` |
| `system_health_check` | Comprehensive diagnostics (DB, agents, AI, security) | `detailed?` |
| `generate_strategic_report` | Weekly/monthly/quarterly reports with recommendations | `report_type`, `focus_areas?` |
| `allocate_resources` | Manage budget, time, AI quota across departments | `resource_type`, `department`, `amount` |
| `performance_analytics` | Trend analysis, forecasting, comparison, anomaly detection | `analysis_type`, `metric` |

### Data Sources
Reads from: `leads`, `opportunities`, `ai_budget`, `change_log`

---

## Sales Agent

**File:** `services/agents/tools/SalesAgent.ts`
**Role:** Lead management, pipeline tracking, revenue forecasting
**Singleton:** `export const salesAgent = new SalesAgent()`

### System Prompt Summary
Professional, data-driven sales manager. Qualifies leads, manages the pipeline, forecasts revenue, drafts emails, and generates quotes.

### Tools (12)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `create_lead` | Add new lead with beard-product-specific fields | `name`, `email?`, `phone?`, `company?`, `beard_type?` |
| `get_all_leads` | Retrieve leads with optional status filter | `status?` |
| `qualify_lead` | Score lead 0-100 based on data completeness | `lead_id` |
| `create_opportunity` | Create sales opportunity from a lead | `lead_id`, `title`, `amount`, `stage?` |
| `get_pipeline` | View all opportunities with value/weighted totals | `stage?` |
| `update_opportunity_stage` | Move opportunity through pipeline stages | `opportunity_id`, `new_stage` |
| `forecast_revenue` | Revenue forecast based on pipeline probability | `period?` |
| `schedule_follow_up` | Add follow-up notes to lead or opportunity | `entity_type`, `entity_id`, `follow_up_date` |
| `draft_email` | Generate sales email (intro, follow-up, proposal, thank-you, closing) | `recipient_name`, `email_type` |
| `create_quote` | Generate price quote from products | `opportunity_id`, `products`, `discount_percent?` |
| `track_deal` | Detailed deal tracking (age, days-to-close, weighted value) | `opportunity_id` |
| `revenue_report` | Revenue report for won deals by period | `period?` |

### Lead Scoring Logic
```
+20 points: has email
+20 points: has phone
+20 points: has company
+20 points: has beard_type (not "none")
+10 points: has source
+10 points: has notes
Score >= 60 → auto-qualified
```

### Pipeline Stages
`prospecting` → `qualification` → `proposal` → `negotiation` → `closed_won` / `closed_lost`

Each stage has an auto-assigned probability: 10% → 25% → 50% → 75% → 100% / 0%

---

## Marketing Agent

**File:** `services/agents/tools/MarketingAgent.ts`
**Role:** Campaign management, content creation, audience targeting
**Singleton:** `export const marketingAgent = new MarketingAgent()`

### System Prompt Summary
Creative, data-driven marketing manager. Creates campaigns, segments audiences, drafts emails, schedules social posts, and optimizes conversions.

### Tools (10)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `create_campaign` | Define campaign with type, objective, budget, dates | `name`, `type`, `objective` |
| `segment_audience` | Filter leads by criteria (beard_type, score, status) | `segment_name`, `criteria` |
| `draft_marketing_email` | Generate email templates (newsletter, promotion, announcement, nurture, event_invite) | `email_type`, `subject_line`, `key_message` |
| `schedule_social_post` | Schedule posts to social platforms with optimization | `platforms`, `content`, `schedule_time?` |
| `create_lead_magnet` | Generate lead magnet structure (ebook, guide, checklist, template) | `type`, `topic` |
| `analyze_campaign_performance` | Campaign analytics with ROI and recommendations | `campaign_name` |
| `create_ab_test` | A/B test setup for subject lines, CTAs, content, landing pages | `test_name`, `element_type`, `variant_a`, `variant_b` |
| `optimize_landing_page` | Landing page optimization recommendations | `goal` |
| `plan_content_calendar` | Content calendar across channels | `duration`, `channels` |
| `integrate_google_ads` | Google Ads campaign config with projections | `campaign_objective`, `daily_budget`, `target_keywords` |

### Campaign Types
`email`, `social`, `ads`, `content`, `webinar`

### Email Template Types
`newsletter`, `promotion`, `announcement`, `nurture`, `event_invite`

---

## IT Manager Agent

**File:** `services/agents/tools/ITAgent.ts` + `services/agents/tools/itAgentTools.ts`
**Role:** Database management, code generation, system administration
**Class:** `ITAgent` (instantiated per-component, receives `DatabaseService` in constructor)

### Architecture Difference
Unlike the other three agents (which use `@google/generative-ai`), the IT Agent uses `@google/genai` (newer SDK). It takes `DatabaseService` as a constructor parameter rather than importing the singleton directly. All agents route through the `gemini-proxy` Edge Function — the API key is never in the browser bundle.

### System Prompt Summary
Expert IT manager focused on database operations, schema design, code generation, and system reliability. Always uses tools when available.

### Tools (21)

#### Database Tools (14)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `list_tables` | List all database tables | — |
| `get_table_schema` | View column definitions for a table | `table_name` |
| `read_all_records` | Fetch and display all records from a table | `table_name`, `limit?` |
| `insert_record` | Insert a new record into any table | `table_name`, `data` |
| `search_records` | Full-text search across a table | `table_name`, `search_term`, `fields?` |
| `analyze_table` | Table statistics (row count, column types) | `table_name` |
| `create_table` | Create a new table with column definitions | `table_name`, `columns` |
| `add_column` | Add a column to an existing table | `table_name`, `column` |
| `modify_column` | Alter a column definition | `table_name`, `column_name`, `new_definition` |
| `drop_column` | Remove a column from a table | `table_name`, `column_name` |
| `create_index` | Create index for query performance | `table_name`, `columns` |
| `backup_table` | Backup a table's data | `table_name` |
| `import_data` | Bulk import records into a table | `table_name`, `records` |
| `performance_report` | Database-wide performance analysis | — |

#### Code Generation Tools (5) — Claude-Powered

All code generation tools attempt Claude AI first (with full codebase manifest context), falling back to template generators if Claude is unavailable.

| Tool | Description | Key Parameters | Engine |
|------|-------------|---------------|--------|
| `generate_component` | Generate production-ready React component with full project context | `component_name`, `description`, `component_type`, `includes_state`, `includes_api_calls` | Claude → Template |
| `generate_workflow` | Generate automation workflow that integrates with workflowEngine.ts | `workflow_name`, `trigger`, `description`, `actions` | Claude → Template |
| `modify_component` | Generate actual code modifications for an existing component | `component_name`, `modification_description`, `current_behavior` | Claude → Plan-only |
| `smart_code_task` | Universal code task — generate features, fix bugs, refactor, explain code | `task`, `task_type`, `target_files` | Claude only |
| `list_code_snippets` | List all saved code snippets (both Claude and template generated) | `component_type?` | — |

#### System Tools (2)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `create_restore_point` | Create system snapshot of all CRM data | `label`, `description?` |
| `list_restore_points` | List all available system snapshots | — |

### Change Logging
All schema modification tools (`create_table`, `add_column`, `modify_column`, `drop_column`) automatically log changes to the `change_log` table via `databaseService.logChange()`.

---

## Adding a New Agent

To add a new agent (e.g., a "Customer Support Agent"):

1. Create `services/agents/tools/SupportAgent.ts`
2. Define a `ToolDefinition[]` array with tools and handlers
3. Transform tools to Gemini `FunctionDeclaration[]` format
4. Create the agent class with system instruction, chat method, and function call loop
5. Export a singleton instance
6. Add the agent to the `agentRegistry.ts` in `components/meeting/`
7. Add route in `App.tsx` and nav item in `Layout.tsx` if needed

**Note:** The agent should not include `GEMINI_API_KEY` directly. All requests go through the `gemini-proxy` Edge Function. Deploy the proxy before testing: `supabase functions deploy gemini-proxy --no-verify-jwt`.

### Tool Definition Template

```typescript
const myTools: ToolDefinition[] = [
  {
    name: 'tool_name',
    description: 'What this tool does',
    parameters: {
      param1: { type: 'string', required: true, description: 'Parameter description' },
      param2: { type: 'number', required: false, description: 'Optional parameter' }
    },
    handler: async ({ param1, param2 }) => {
      try {
        // Execute operation against databaseService
        const result = await databaseService.getLeads();
        return { success: true, data: result, message: 'Human-readable summary' };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  }
];
```

### Agent Class Template

```typescript
// All Gemini requests now proxy through the gemini-proxy Edge Function.
// Do NOT pass GEMINI_API_KEY from the browser.
export class MyAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatSession: any;

  constructor() {
    // The SDK is pointed at the Edge Function URL, not the Gemini API directly.
    // See services/agents/geminiClient.ts for the proxy client setup.
    this.genAI = new GoogleGenerativeAI('proxy'); // key handled server-side
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `Your system prompt here...`
    });
  }

  async initialize() {
    this.chatSession = this.model.startChat({
      tools: [{ functionDeclarations: transformedTools }],
      history: []
    });
  }

  async chat(message: string): Promise<string> {
    if (!this.chatSession) await this.initialize();

    const result = await this.chatSession.sendMessage(message);
    const response = result.response;

    // Handle function calls
    const functionCalls = response.functionCalls();
    if (functionCalls?.length > 0) {
      const responses = await Promise.all(
        functionCalls.map(async (call) => {
          const tool = myTools.find(t => t.name === call.name);
          const result = await tool.handler(call.args);
          return { functionResponse: { name: call.name, response: result } };
        })
      );
      const followUp = await this.chatSession.sendMessage(responses);
      return followUp.response.text();
    }

    return response.text();
  }
}

export const myAgent = new MyAgent();
```
