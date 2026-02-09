# API Reference

Complete reference for all agent tools and service methods.

---

## CEO Agent Tools

### `generate_executive_dashboard`
Generate a comprehensive KPI dashboard.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Reporting period: `today`, `this_week`, `this_month`, `this_quarter` |

**Returns:** Sales metrics (leads, qualified, pipeline, revenue), AI operations (requests, tokens, cost, budget %), agent performance by agent name, health status.

---

### `monitor_agent_activity`
Track agent activities from change_log and ai_budget tables.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_name` | string | No | Filter by agent: `IT`, `Sales`, `Marketing`. Omit for all. |

**Returns:** Activity list, breakdown by agent (total actions, pending/approved/rejected counts, API requests, cost).

---

### `review_budget_status`
Analyze AI spending for current month.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_projections` | boolean | No | Include daily average and projected month-end spend |

**Returns:** Total spent, remaining, % used, cost per request, spending by agent, status (healthy/warning/critical), recommendations.

---

### `coordinate_agents`
Plan multi-agent workflows.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workflow_type` | string | Yes | `lead_to_customer`, `campaign_launch`, `system_optimization` |
| `parameters` | string | No | Additional params as JSON string |

**Returns:** Workflow name, ordered steps (agent + action), expected duration, success metrics.

---

### `set_goals_and_kpis`
Define organizational goals with auto-generated KPIs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `department` | string | Yes | `sales`, `marketing`, `it`, `company_wide` |
| `goal_type` | string | Yes | `revenue`, `growth`, `efficiency`, `quality` |
| `target_value` | number | Yes | Target value |
| `timeframe` | string | No | `monthly`, `quarterly`, `yearly` |

**Returns:** Goal config, auto-generated KPIs (varies by department + goal type), tracking settings.

---

### `approve_major_decision`
Approve or reject a change_log entry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `decision_id` | string | Yes | ID of the change_log record |
| `action` | string | Yes | `approve`, `reject`, `request_info` |
| `notes` | string | No | Notes about the decision |

**Returns:** Action taken, decision details (agent, type, description).

---

### `system_health_check`
Comprehensive system diagnostics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `detailed` | boolean | No | Include connection pool, query performance, backup status |

**Returns:** Component status (database, agents, AI, security), record counts, issues, warnings, overall health.

---

### `generate_strategic_report`
Generate executive reports.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `report_type` | string | Yes | `weekly`, `monthly`, `quarterly`, `annual` |
| `focus_areas` | string[] | No | `sales`, `marketing`, `operations`, `finance` |

**Returns:** Executive summary (achievements, challenges), metrics, strategic recommendations (priority, area, impact, timeline), next steps.

---

### `allocate_resources`
Manage resource allocation across departments.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource_type` | string | Yes | `budget`, `time`, `ai_quota` |
| `department` | string | Yes | `sales`, `marketing`, `it` |
| `amount` | number | Yes | Amount to allocate |
| `justification` | string | No | Reason for allocation |

**Returns:** Allocation record, impact statement, usage guidelines.

---

### `performance_analytics`
Analyze performance trends.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `analysis_type` | string | Yes | `trend`, `forecast`, `comparison`, `anomaly` |
| `metric` | string | Yes | `revenue`, `leads`, `conversion_rate`, `costs` |

**Returns:** Varies by type — trend (direction, strength, confidence), forecast (projected value, confidence interval), comparison (current vs previous vs benchmark).

---

## Sales Agent Tools

### `create_lead`
Add a new lead to the CRM.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Full name |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `company` | string | No | Company name |
| `source` | string | No | `website`, `referral`, `social_media`, `cold_call`, `event`, `other` |
| `status` | string | No | `new`, `contacted`, `qualified`, `unqualified`, `converted` |
| `beard_type` | string | No | `full`, `goatee`, `stubble`, `mustache`, `none` |
| `notes` | string | No | Additional notes |

---

### `get_all_leads`
Retrieve all leads with optional filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status |

---

### `qualify_lead`
Score a lead (0-100) and auto-qualify if score >= 60.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lead_id` | string | Yes | Lead UUID |
| `qualification_notes` | string | No | Notes about qualification |

---

### `create_opportunity`
Create a sales opportunity linked to a lead.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lead_id` | string | Yes | Source lead UUID |
| `title` | string | Yes | Opportunity title |
| `amount` | number | Yes | Expected deal value |
| `stage` | string | No | `prospecting`, `qualification`, `proposal`, `negotiation`, `closed_won`, `closed_lost` |
| `close_date` | string | No | Expected close date (YYYY-MM-DD) |
| `notes` | string | No | Notes |

---

### `get_pipeline`
View all opportunities with totals.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stage` | string | No | Filter by pipeline stage |

**Returns:** Opportunity list, `total_value`, `weighted_value`.

---

### `update_opportunity_stage`
Move an opportunity through the pipeline.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `opportunity_id` | string | Yes | Opportunity UUID |
| `new_stage` | string | Yes | Target stage |
| `notes` | string | No | Notes about the change |

---

### `forecast_revenue`
Revenue forecast based on pipeline probability.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | `this_month`, `this_quarter`, `this_year` |

---

### `schedule_follow_up`
Add follow-up notes to a lead or opportunity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity_type` | string | Yes | `lead` or `opportunity` |
| `entity_id` | string | Yes | Entity UUID |
| `follow_up_date` | string | Yes | Follow-up date (YYYY-MM-DD) |
| `follow_up_notes` | string | Yes | What to do |

---

### `draft_email`
Generate a sales email from templates.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recipient_name` | string | Yes | Recipient name |
| `email_type` | string | Yes | `introduction`, `follow_up`, `proposal`, `thank_you`, `closing` |
| `context` | string | No | Additional context |

---

### `create_quote`
Generate a price quote from products.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `opportunity_id` | string | Yes | Opportunity UUID |
| `products` | string[] | Yes | Array of product UUIDs |
| `discount_percent` | number | No | Discount percentage (0-100) |

---

### `track_deal`
Get detailed tracking for an opportunity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `opportunity_id` | string | Yes | Opportunity UUID |

**Returns:** Full opportunity details, age in days, days to close, weighted value.

---

### `revenue_report`
Revenue report for closed-won deals.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | `this_month`, `last_month`, `this_quarter`, `this_year` |

---

## Marketing Agent Tools

### `create_campaign`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Campaign name |
| `type` | string | Yes | `email`, `social`, `ads`, `content`, `webinar` |
| `objective` | string | Yes | `awareness`, `leads`, `sales`, `engagement` |
| `budget` | number | No | Budget in dollars |
| `start_date` | string | No | Start date (YYYY-MM-DD) |
| `end_date` | string | No | End date (YYYY-MM-DD) |
| `description` | string | No | Campaign description |

---

### `segment_audience`
Filter leads by criteria string.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `segment_name` | string | Yes | Segment name |
| `criteria` | string | Yes | Filter string, e.g., `beard_type=full,score>50,status=qualified` |

---

### `draft_marketing_email`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email_type` | string | Yes | `newsletter`, `promotion`, `announcement`, `nurture`, `event_invite` |
| `subject_line` | string | Yes | Email subject |
| `key_message` | string | Yes | Main message/offer |
| `call_to_action` | string | No | CTA text |

---

### `schedule_social_post`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platforms` | string[] | Yes | `twitter`, `linkedin`, `facebook`, `instagram` |
| `content` | string | Yes | Post content |
| `schedule_time` | string | No | Schedule time (YYYY-MM-DD HH:MM) |
| `image_url` | string | No | Image URL to attach |

---

### `create_lead_magnet`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | `ebook`, `guide`, `template`, `checklist`, `webinar`, `toolkit` |
| `topic` | string | Yes | Topic or theme |
| `target_audience` | string | No | Target audience description |

---

### `analyze_campaign_performance`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_name` | string | Yes | Campaign to analyze |
| `metrics` | string[] | No | Specific metrics: `opens`, `clicks`, `conversions`, `roi` |

---

### `create_ab_test`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_name` | string | Yes | Test name |
| `element_type` | string | Yes | `subject_line`, `cta_button`, `email_content`, `landing_page` |
| `variant_a` | string | Yes | Control variant |
| `variant_b` | string | Yes | Test variant |
| `sample_size` | number | No | Sample size per variant (default 250) |

---

### `optimize_landing_page`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_url` | string | No | Landing page URL |
| `goal` | string | Yes | `lead_capture`, `demo_request`, `purchase`, `signup` |

---

### `plan_content_calendar`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `duration` | string | Yes | `1_week`, `2_weeks`, `1_month`, `1_quarter` |
| `channels` | string[] | Yes | `email`, `blog`, `social`, `video` |
| `themes` | string | No | Content themes |

---

### `integrate_google_ads`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_objective` | string | Yes | `leads`, `traffic`, `brand_awareness`, `sales` |
| `daily_budget` | number | Yes | Daily budget in dollars |
| `target_keywords` | string[] | Yes | Target keywords |
| `location` | string | No | Geographic targeting |

---

## IT Manager Agent Tools

### Database Operations

| Tool | Parameters | Description |
|------|-----------|-------------|
| `list_tables` | — | List all database tables |
| `get_table_schema` | `table_name` | Get column definitions |
| `read_all_records` | `table_name`, `limit?` | Fetch all records |
| `insert_record` | `table_name`, `data` | Insert a new record |
| `search_records` | `table_name`, `search_term`, `fields?` | Full-text search |
| `analyze_table` | `table_name` | Table statistics |
| `create_table` | `table_name`, `columns` | Create new table |
| `add_column` | `table_name`, `column` | Add column to table |
| `modify_column` | `table_name`, `column_name`, `new_definition` | Alter column |
| `drop_column` | `table_name`, `column_name` | Remove column |
| `create_index` | `table_name`, `columns` | Create index |
| `backup_table` | `table_name` | Backup table data |
| `import_data` | `table_name`, `records` | Bulk import |
| `performance_report` | — | Database-wide analysis |

### Code Generation

| Tool | Parameters | Description |
|------|-----------|-------------|
| `generate_component` | `component_name`, `component_type`, `description` | Generate React + TS + Tailwind component |
| `generate_workflow` | `workflow_name`, `trigger`, `actions` | Generate automation code |
| `modify_component` | `component_name`, `modifications` | Generate code modifications |
| `list_code_snippets` | — | List saved code snippets |

### System

| Tool | Parameters | Description |
|------|-----------|-------------|
| `create_restore_point` | `label`, `description?` | Create system snapshot |
| `list_restore_points` | — | List available snapshots |

---

## DatabaseService Methods

### Entity CRUD

```typescript
// Leads
createLead(data): Promise<any>
getLeads(filters?: QueryFilter[]): Promise<any[]>
updateLead(id: string, data: any): Promise<any>
deleteLead(id: string): Promise<boolean>

// Contacts
createContact(data): Promise<any>
getContacts(filters?: QueryFilter[]): Promise<any[]>

// Accounts
createAccount(data): Promise<any>
getAccounts(filters?: QueryFilter[]): Promise<any[]>

// Opportunities
createOpportunity(data): Promise<any>
getOpportunities(filters?: QueryFilter[]): Promise<any[]>

// Orders
createOrder(data): Promise<any>
getOrders(filters?: QueryFilter[]): Promise<any[]>

// Products
createProduct(data): Promise<any>
getProducts(filters?: QueryFilter[]): Promise<any[]>
```

### Change Log

```typescript
logChange(agentName: string, changeType: string, description: string, beforeState?: any, afterState?: any): Promise<any>
getChangeLogs(filters?: QueryFilter[]): Promise<any[]>
approveChange(changeId: string): Promise<any>
```

### AI Budget

```typescript
trackAIUsage(agentName: string, tokensUsed: number, estimatedCost: number): Promise<void>
getAIBudget(month?: string): Promise<any[]>
```

### Snapshot / Restore

```typescript
createSnapshot(label: string, description: string, createdByAgent?: string): Promise<any>
getSnapshots(): Promise<any[]>
restoreSnapshot(snapshotId: string): Promise<{ success: boolean; tablesRestored: number; rowsRestored: number }>
deleteSnapshot(snapshotId: string): Promise<boolean>
resetToDefault(): Promise<void>
```

### System Config

```typescript
getConfig(key: string): Promise<any>
setConfig(key: string, value: any): Promise<void>
```

### Adapter Access

```typescript
getAdapter(): DatabaseAdapter  // Direct adapter access for advanced queries
setAdapter(adapter: DatabaseAdapter): void
setUserId(userId: string): void
getUserId(): string
connect(): Promise<boolean>
disconnect(): Promise<void>
```

---

## Access Control Service

```typescript
createOrganization(name: string, userId: string): Promise<Organization>
getCurrentMembership(userId: string): Promise<OrgMember | null>
getOrganization(orgId: string): Promise<Organization | null>
getOrgMembers(orgId: string): Promise<OrgMember[]>
updateMemberRole(memberId: string, newRole: OrgRole): Promise<void>
removeMember(memberId: string): Promise<void>
addMember(orgId: string, userId: string, role: OrgRole, invitedBy: string): Promise<void>
findUserByEmail(email: string): Promise<any>
canAccessSettings(role: OrgRole): boolean
canEditData(role: OrgRole): boolean
canViewData(role: OrgRole): boolean
```

---

## QueryFilter Interface

Used by all `get*` and `readAll` methods:

```typescript
interface QueryFilter {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: any;
}
```

**Example:**
```typescript
const qualifiedLeads = await databaseService.getLeads([
  { column: 'status', operator: '=', value: 'qualified' },
  { column: 'score', operator: '>=', value: 60 }
]);
```
