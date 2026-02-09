# Database Schema & Service Layer

## Overview

BeardForce uses **Supabase** (hosted PostgreSQL) as its primary database. The database layer follows an **Adapter Pattern** with three layers:

```
Component / Agent
       │
       ▼
DatabaseService (facade) ── auto-injects user_id, business logic
       │
       ▼
SupabaseAdapter (implements DatabaseAdapter)
       │
       ▼
Supabase Client (@supabase/supabase-js)
       │
       ▼
PostgreSQL (with Row Level Security)
```

## Tables

BeardForce uses **13 tables** organized into three categories:

### CRM Tables (6)

These are the core business data tables. All have `user_id` for multi-tenant isolation via RLS.

#### `leads`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `user_id` | uuid | Owner (references auth.users) |
| `name` | text | Lead full name |
| `email` | text | Email address |
| `phone` | text | Phone number |
| `company` | text | Company name |
| `source` | text | Lead source (website, referral, social_media, cold_call, event, other) |
| `status` | text | Lead status (new, contacted, qualified, unqualified, converted) |
| `score` | integer | Qualification score (0-100) |
| `beard_type` | text | Beard type (full, goatee, stubble, mustache, none) |
| `notes` | text | Free-text notes |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `contacts`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `name` | text | Contact full name |
| `email` | text | Email address |
| `phone` | text | Phone number |
| `company` | text | Company name |
| `title` | text | Job title |
| `notes` | text | Free-text notes |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `accounts`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `name` | text | Account/company name |
| `industry` | text | Industry vertical |
| `website` | text | Company website |
| `phone` | text | Company phone |
| `address` | text | Address |
| `annual_revenue` | decimal | Annual revenue |
| `employee_count` | integer | Number of employees |
| `notes` | text | Free-text notes |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `opportunities`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `title` | text | Opportunity title |
| `amount` | decimal | Deal value |
| `stage` | text | Pipeline stage (prospecting, qualification, proposal, negotiation, closed_won, closed_lost) |
| `probability` | integer | Win probability (0-100) |
| `close_date` | date | Expected close date |
| `lead_id` | uuid | Source lead |
| `contact_name` | text | Contact name |
| `contact_email` | text | Contact email |
| `notes` | text | Free-text notes |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `orders`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `order_number` | text | Order reference number |
| `status` | text | Order status |
| `total_amount` | decimal | Total order value |
| `items` | json | Line items array |
| `notes` | text | Free-text notes |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `products`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `name` | text | Product name |
| `description` | text | Product description |
| `price` | decimal | Unit price |
| `category` | text | Product category |
| `sku` | text | Stock keeping unit |
| `in_stock` | boolean | Availability |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### System Tables (3)

#### `change_log`
Tracks all agent actions for audit trail and approval workflow.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `agent_name` | text | Agent that made the change |
| `change_type` | text | Type of change (schema, data, restore, reset) |
| `description` | text | Human-readable description |
| `before_state` | json | State before change |
| `after_state` | json | State after change |
| `status` | text | Approval status (pending, approved, rejected) |
| `approved_by` | uuid | Who approved |
| `approved_at` | timestamp | When approved |
| `notes` | text | Additional notes |
| `created_at` | timestamp | Creation timestamp |

#### `ai_budget`
Tracks AI API usage costs per agent per month.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `month` | text | Month (YYYY-MM format) |
| `agent_name` | text | Agent name |
| `request_count` | integer | Number of API requests |
| `tokens_used` | integer | Total tokens consumed |
| `estimated_cost` | decimal | Estimated cost in USD |
| `created_at` | timestamp | Creation timestamp |

#### `database_connections`
Stores database connection configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `name` | text | Connection name |
| `type` | text | Database type |
| `config` | json | Connection config (encrypted) |
| `created_at` | timestamp | Creation timestamp |

### v2 Tables (5)

#### `organizations`
Multi-tenant organization support.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Organization name |
| `created_by` | uuid | Creator user ID |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### `org_members`
Organization membership with roles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `org_id` | uuid | Organization (FK → organizations.id) |
| `user_id` | uuid | User (FK → auth.users.id) |
| `role` | text | Role (admin, editor, viewer) |
| `email` | text | User email |
| `invited_by` | uuid | Who invited this user |
| `joined_at` | timestamp | Join timestamp |

#### `code_snippets`
Stores AI-generated code from IT Agent.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `agent_name` | text | Agent that generated |
| `title` | text | Snippet title |
| `description` | text | What the code does |
| `code` | text | The generated code |
| `language` | text | Language (typescript, tsx, etc.) |
| `component_type` | text | Component type (page, widget, form, etc.) |
| `created_at` | timestamp | Creation timestamp |

#### `system_snapshots`
Full system backup snapshots for rollback.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `label` | text | Snapshot label |
| `description` | text | What/why |
| `snapshot_data` | json | Full data dump of all 6 CRM tables |
| `tables_included` | json | Array of table names included |
| `total_rows` | integer | Total rows across all tables |
| `created_by_agent` | text | Agent or "admin" or "system" |
| `created_at` | timestamp | Creation timestamp |

#### `system_config`
Key-value configuration store.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `config_key` | text | Configuration key |
| `config_value` | json | Configuration value |
| `updated_at` | timestamp | Last update timestamp |

---

## Database Adapter Layer

### DatabaseAdapter (Abstract Base Class)

**File:** `services/database/DatabaseAdapter.ts`

Defines the interface that all database adapters must implement:

```typescript
abstract class DatabaseAdapter {
  // Connection
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;

  // CRUD
  abstract create(table, data): Promise<any>;
  abstract read(table, id): Promise<any>;
  abstract readAll(table, filters?): Promise<any[]>;
  abstract update(table, id, data): Promise<any>;
  abstract delete(table, id): Promise<boolean>;

  // Batch
  abstract createMany(table, data[]): Promise<any[]>;
  abstract updateMany(table, filters, data): Promise<number>;
  abstract deleteMany(table, filters): Promise<number>;

  // Schema (used by IT Agent)
  abstract getTables(): Promise<string[]>;
  abstract getTableSchema(table): Promise<TableSchema>;
  abstract createTable(schema): Promise<boolean>;
  abstract addColumn(table, column): Promise<boolean>;
  abstract modifyColumn(table, columnName, newDef): Promise<boolean>;
  abstract dropColumn(table, columnName): Promise<boolean>;
  abstract createIndex(table, columns): Promise<boolean>;
  abstract dropIndex(table, indexName): Promise<boolean>;

  // Advanced
  abstract query(sql, params?): Promise<any[]>;
  abstract count(table, filters?): Promise<number>;
  abstract search(table, searchTerm, fields): Promise<any[]>;
}
```

### Query Filters

```typescript
interface QueryFilter {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: any;
}
```

### SupabaseAdapter

**File:** `services/database/SupabaseAdapter.ts`

Implements `DatabaseAdapter` using the Supabase JS client. Contains pre-defined schemas for all CRM tables. The adapter maps `QueryFilter` operators to Supabase query builder methods.

---

## DatabaseService (Facade)

**File:** `services/database/DatabaseService.ts`

Wraps the adapter with user-scoped operations. Key behaviors:

### User ID Auto-Injection
Every query method automatically adds `{ column: 'user_id', operator: '=', value: this.getUserId() }` to the filter array. Every create method adds `user_id` to the inserted record. This ensures multi-tenant data isolation at the application level (on top of RLS at the database level).

### Entity Methods

```typescript
// Leads
createLead(data): Promise<any>
getLeads(filters?): Promise<any[]>
updateLead(id, data): Promise<any>
deleteLead(id): Promise<boolean>

// Contacts
createContact(data): Promise<any>
getContacts(filters?): Promise<any[]>

// Accounts
createAccount(data): Promise<any>
getAccounts(filters?): Promise<any[]>

// Opportunities
createOpportunity(data): Promise<any>
getOpportunities(filters?): Promise<any[]>

// Orders
createOrder(data): Promise<any>
getOrders(filters?): Promise<any[]>

// Products
createProduct(data): Promise<any>
getProducts(filters?): Promise<any[]>
```

### Change Log

```typescript
logChange(agentName, changeType, description, beforeState?, afterState?): Promise<any>
getChangeLogs(filters?): Promise<any[]>
approveChange(changeId): Promise<any>
```

### AI Budget Tracking

```typescript
trackAIUsage(agentName, tokensUsed, estimatedCost): Promise<void>
getAIBudget(month?): Promise<any[]>
```

### Snapshot / Restore

```typescript
createSnapshot(label, description, createdByAgent?): Promise<any>
getSnapshots(): Promise<any[]>
restoreSnapshot(snapshotId): Promise<{ success, tablesRestored, rowsRestored }>
deleteSnapshot(snapshotId): Promise<boolean>
resetToDefault(): Promise<void>
```

Key behaviors:
- Max 10 snapshots per user (oldest deleted when limit reached)
- `restoreSnapshot` auto-creates a backup before restoring
- `resetToDefault` auto-creates a backup before clearing all data
- Snapshots include all 6 CRM tables: leads, contacts, accounts, opportunities, orders, products

### System Config

```typescript
getConfig(key): Promise<any>
setConfig(key, value): Promise<void>
```

---

## Initialization

**File:** `services/database/index.ts`

```typescript
const adapter = new SupabaseAdapter(config);
export const databaseService = new DatabaseService(adapter);

export async function initializeDatabase(userId: string) {
  databaseService.setUserId(userId);
  await databaseService.connect();
  return databaseService;
}
```

**Important:** Every component that uses `databaseService` must call `initializeDatabase(user.id)` first. Without this, `getUserId()` throws "User ID not set" and queries fail with "Database not connected."

---

## Row Level Security (RLS)

All CRM tables enforce RLS so users can only access their own data:

```sql
-- Standard CRM table policy
CREATE POLICY "Users can manage own data"
ON leads FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

Organization tables use a `SECURITY DEFINER` function to avoid infinite recursion:

```sql
CREATE OR REPLACE FUNCTION get_user_org_id(uid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = uid LIMIT 1;
$$;

-- Separate INSERT policy (new user has no org yet)
CREATE POLICY "org_insert" ON organizations
FOR INSERT WITH CHECK (created_by = auth.uid());

-- SELECT/UPDATE/DELETE use the function
CREATE POLICY "org_select" ON organizations
FOR SELECT USING (id = get_user_org_id(auth.uid()));
```

See [auth-and-access.md](auth-and-access.md) for the complete RLS policy reference.
