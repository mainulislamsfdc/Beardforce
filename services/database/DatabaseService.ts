// ============================================================================
// 3. DATABASE SERVICE (Facade)
// ============================================================================
// services/database/DatabaseService.ts
import { DatabaseAdapter, QueryFilter } from './DatabaseAdapter';

export class DatabaseService {
  private adapter: DatabaseAdapter;
  private userId: string | null = null;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  getUserId(): string {
    if (!this.userId) throw new Error('User ID not set');
    return this.userId;
  }

  async connect(): Promise<boolean> {
    return await this.adapter.connect();
  }

  async disconnect(): Promise<void> {
    return await this.adapter.disconnect();
  }

  getAdapter(): DatabaseAdapter {
    return this.adapter;
  }

  setAdapter(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  // Convenience methods that automatically add user_id
  async createLead(data: Omit<any, 'user_id' | 'id'>): Promise<any> {
    return await this.adapter.create('leads', {
      ...data,
      user_id: this.getUserId()
    });
  }

  async getLeads(filters?: QueryFilter[]): Promise<any[]> {
    const userFilter: QueryFilter = {
      column: 'user_id',
      operator: '=',
      value: this.getUserId()
    };
    return await this.adapter.readAll('leads', [...(filters || []), userFilter]);
  }

  async updateLead(id: string, data: any): Promise<any> {
    return await this.adapter.update('leads', id, data);
  }

  async deleteLead(id: string): Promise<boolean> {
    return await this.adapter.delete('leads', id);
  }

  // Similar convenience methods for other entities
  async createContact(data: any): Promise<any> {
    return await this.adapter.create('contacts', { ...data, user_id: this.getUserId() });
  }

  async getContacts(filters?: QueryFilter[]): Promise<any[]> {
    return await this.adapter.readAll('contacts', [
      ...(filters || []),
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
  }

  async createAccount(data: any): Promise<any> {
    return await this.adapter.create('accounts', { ...data, user_id: this.getUserId() });
  }

  async getAccounts(filters?: QueryFilter[]): Promise<any[]> {
    return await this.adapter.readAll('accounts', [
      ...(filters || []),
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
  }

  async createOpportunity(data: any): Promise<any> {
    return await this.adapter.create('opportunities', { ...data, user_id: this.getUserId() });
  }

  async getOpportunities(filters?: QueryFilter[]): Promise<any[]> {
    return await this.adapter.readAll('opportunities', [
      ...(filters || []),
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
  }

  async createOrder(data: any): Promise<any> {
    return await this.adapter.create('orders', { ...data, user_id: this.getUserId() });
  }

  async getOrders(filters?: QueryFilter[]): Promise<any[]> {
    return await this.adapter.readAll('orders', [
      ...(filters || []),
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
  }

  async createProduct(data: any): Promise<any> {
    return await this.adapter.create('products', { ...data, user_id: this.getUserId() });
  }

  async getProducts(filters?: QueryFilter[]): Promise<any[]> {
    return await this.adapter.readAll('products', [
      ...(filters || []),
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
  }

  // Change log methods
  async logChange(agentName: string, changeType: string, description: string, beforeState?: any, afterState?: any): Promise<any> {
    return await this.adapter.create('change_log', {
      user_id: this.getUserId(),
      agent_name: agentName,
      change_type: changeType,
      description,
      before_state: beforeState,
      after_state: afterState,
      status: 'pending'
    });
  }

  async getChangeLogs(filters?: QueryFilter[]): Promise<any[]> {
    return await this.adapter.readAll('change_log', [
      ...(filters || []),
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
  }

  async approveChange(changeId: string): Promise<any> {
    return await this.adapter.update('change_log', changeId, {
      status: 'approved',
      approved_by: this.getUserId(),
      approved_at: new Date().toISOString()
    });
  }

  // AI Budget tracking
  async trackAIUsage(agentName: string, tokensUsed: number, estimatedCost: number): Promise<void> {
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    // Try to find existing record for this month and agent
    const existing = await this.adapter.readAll('ai_budget', [
      { column: 'user_id', operator: '=', value: this.getUserId() },
      { column: 'month', operator: '=', value: month },
      { column: 'agent_name', operator: '=', value: agentName }
    ]);

    if (existing.length > 0) {
      // Update existing
      const record = existing[0];
      await this.adapter.update('ai_budget', record.id, {
        request_count: record.request_count + 1,
        tokens_used: record.tokens_used + tokensUsed,
        estimated_cost: record.estimated_cost + estimatedCost
      });
    } else {
      // Create new
      await this.adapter.create('ai_budget', {
        user_id: this.getUserId(),
        month,
        agent_name: agentName,
        request_count: 1,
        tokens_used: tokensUsed,
        estimated_cost: estimatedCost
      });
    }
  }

  async getAIBudget(month?: string): Promise<any[]> {
    const filters: QueryFilter[] = [
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ];

    if (month) {
      filters.push({ column: 'month', operator: '=', value: month });
    }

    return await this.adapter.readAll('ai_budget', filters);
  }

  // ---- Snapshot / Restore System ----

  private readonly SNAPSHOT_TABLES = ['leads', 'contacts', 'accounts', 'opportunities', 'orders', 'products'];
  private readonly MAX_SNAPSHOTS = 10;

  async createSnapshot(label: string, description: string, createdByAgent?: string): Promise<any> {
    const snapshotData: Record<string, any> = {};
    let totalRows = 0;

    for (const table of this.SNAPSHOT_TABLES) {
      try {
        const data = await this.adapter.readAll(table, [
          { column: 'user_id', operator: '=', value: this.getUserId() }
        ]);
        const schema = await this.adapter.getTableSchema(table);
        snapshotData[table] = { schema, data, row_count: data.length };
        totalRows += data.length;
      } catch {
        snapshotData[table] = { schema: null, data: [], row_count: 0 };
      }
    }

    // Enforce max snapshots limit
    const existing = await this.adapter.readAll('system_snapshots', [
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
    if (existing.length >= this.MAX_SNAPSHOTS) {
      const oldest = existing.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      await this.adapter.delete('system_snapshots', oldest.id);
    }

    return await this.adapter.create('system_snapshots', {
      user_id: this.getUserId(),
      label,
      description: description || '',
      snapshot_data: snapshotData,
      tables_included: this.SNAPSHOT_TABLES,
      total_rows: totalRows,
      created_by_agent: createdByAgent || 'admin'
    });
  }

  async getSnapshots(): Promise<any[]> {
    return await this.adapter.readAll('system_snapshots', [
      { column: 'user_id', operator: '=', value: this.getUserId() }
    ]);
  }

  async restoreSnapshot(snapshotId: string): Promise<{ success: boolean; tablesRestored: number; rowsRestored: number }> {
    const snapshot = await this.adapter.read('system_snapshots', snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');

    // Auto-backup before restore
    await this.createSnapshot(
      `Auto-backup before restore (${snapshot.label})`,
      `Automatic backup created before restoring: ${snapshot.label}`,
      'system'
    );

    const data = snapshot.snapshot_data;
    let tablesRestored = 0;
    let rowsRestored = 0;

    for (const table of this.SNAPSHOT_TABLES) {
      if (data[table]) {
        // Delete current user data
        const currentData = await this.adapter.readAll(table, [
          { column: 'user_id', operator: '=', value: this.getUserId() }
        ]);
        for (const row of currentData) {
          await this.adapter.delete(table, row.id);
        }

        // Insert snapshot data
        if (data[table].data && data[table].data.length > 0) {
          for (const row of data[table].data) {
            try {
              await this.adapter.create(table, row);
            } catch {
              // Skip rows that fail (e.g., duplicate keys)
            }
          }
          rowsRestored += data[table].data.length;
        }
        tablesRestored++;
      }
    }

    await this.logChange('admin', 'restore', `Restored snapshot: ${snapshot.label}`, null, {
      snapshot_id: snapshotId,
      tables_restored: tablesRestored,
      rows_restored: rowsRestored
    });

    return { success: true, tablesRestored, rowsRestored };
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    return await this.adapter.delete('system_snapshots', snapshotId);
  }

  async resetToDefault(): Promise<void> {
    // Auto-backup before reset
    await this.createSnapshot('Pre-reset backup', 'Automatic backup before factory reset', 'system');

    for (const table of this.SNAPSHOT_TABLES) {
      try {
        const data = await this.adapter.readAll(table, [
          { column: 'user_id', operator: '=', value: this.getUserId() }
        ]);
        for (const row of data) {
          await this.adapter.delete(table, row.id);
        }
      } catch {
        // Skip tables that fail
      }
    }

    await this.logChange('admin', 'reset', 'System reset to default', null, {
      tables_cleared: this.SNAPSHOT_TABLES
    });
  }

  // System config methods
  async getConfig(key: string): Promise<any> {
    const results = await this.adapter.readAll('system_config', [
      { column: 'user_id', operator: '=', value: this.getUserId() },
      { column: 'config_key', operator: '=', value: key }
    ]);
    return results.length > 0 ? results[0].config_value : null;
  }

  async setConfig(key: string, value: any): Promise<void> {
    const existing = await this.adapter.readAll('system_config', [
      { column: 'user_id', operator: '=', value: this.getUserId() },
      { column: 'config_key', operator: '=', value: key }
    ]);
    if (existing.length > 0) {
      await this.adapter.update('system_config', existing[0].id, {
        config_value: value,
        updated_at: new Date().toISOString()
      });
    } else {
      await this.adapter.create('system_config', {
        user_id: this.getUserId(),
        config_key: key,
        config_value: value
      });
    }
  }
}