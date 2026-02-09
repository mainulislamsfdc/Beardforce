// ============================================================================
// 2. SUPABASE ADAPTER IMPLEMENTATION
// ============================================================================
// services/database/SupabaseAdapter.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter, QueryFilter, ColumnDefinition, TableSchema } from './DatabaseAdapter';

export class SupabaseAdapter extends DatabaseAdapter {
  private client: SupabaseClient | null = null;

  async connect(): Promise<boolean> {
    try {
      if (!this.config.supabaseUrl || !this.config.supabaseKey) {
        throw new Error('Supabase URL and key are required');
      }

      this.client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
      this.connected = await this.testConnection();
      return this.connected;
    } catch (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const { error } = await this.client.from('leads').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private ensureConnected() {
    if (!this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  // CRUD Operations
  async create(table: string, data: Record<string, any>): Promise<any> {
    this.ensureConnected();
    const { data: result, error } = await this.client!
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Create failed: ${error.message}`);
    return result;
  }

  async read(table: string, id: string): Promise<any> {
    this.ensureConnected();
    const { data, error } = await this.client!
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Read failed: ${error.message}`);
    return data;
  }

  async readAll(table: string, filters?: QueryFilter[]): Promise<any[]> {
    this.ensureConnected();
    let query = this.client!.from(table).select('*');

    if (filters) {
      filters.forEach(filter => {
        switch (filter.operator) {
          case '=':
            query = query.eq(filter.column, filter.value);
            break;
          case '!=':
            query = query.neq(filter.column, filter.value);
            break;
          case '>':
            query = query.gt(filter.column, filter.value);
            break;
          case '<':
            query = query.lt(filter.column, filter.value);
            break;
          case '>=':
            query = query.gte(filter.column, filter.value);
            break;
          case '<=':
            query = query.lte(filter.column, filter.value);
            break;
          case 'LIKE':
            query = query.ilike(filter.column, `%${filter.value}%`);
            break;
          case 'IN':
            query = query.in(filter.column, filter.value);
            break;
        }
      });
    }

    const { data, error } = await query;
    if (error) throw new Error(`ReadAll failed: ${error.message}`);
    return data || [];
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<any> {
    this.ensureConnected();
    const { data: result, error } = await this.client!
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Update failed: ${error.message}`);
    return result;
  }

  async delete(table: string, id: string): Promise<boolean> {
    this.ensureConnected();
    const { error } = await this.client!
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Delete failed: ${error.message}`);
    return true;
  }

  // Batch Operations
  async createMany(table: string, data: Record<string, any>[]): Promise<any[]> {
    this.ensureConnected();
    const { data: result, error } = await this.client!
      .from(table)
      .insert(data)
      .select();

    if (error) throw new Error(`CreateMany failed: ${error.message}`);
    return result || [];
  }

  async updateMany(table: string, filters: QueryFilter[], data: Record<string, any>): Promise<number> {
    this.ensureConnected();
    let query = this.client!.from(table).update(data);

    filters.forEach(filter => {
      query = query.eq(filter.column, filter.value);
    });

    const { data: rows, error } = await query.select('*');
    if (error) throw new Error(`UpdateMany failed: ${error.message}`);
    return (rows && rows.length) || 0;
  }

  async deleteMany(table: string, filters: QueryFilter[]): Promise<number> {
    this.ensureConnected();
    let query = this.client!.from(table).delete();

    filters.forEach(filter => {
      query = query.eq(filter.column, filter.value);
    });

    const { data, error } = await query.select('*');
    if (error) throw new Error(`DeleteMany failed: ${error.message}`);
    return (data && data.length) || 0;
  }

  // Schema Operations (requires Management API or direct SQL)
  async getTables(): Promise<string[]> {
    this.ensureConnected();
    // Use Supabase's pg_tables view
    const { data, error } = await this.client!.rpc('get_tables');
    if (error) {
      // Fallback to hardcoded list
      return ['leads', 'contacts', 'accounts', 'opportunities', 'orders', 'products', 'change_log', 'ai_budget'];
    }
    return data || [];
  }

  async getTableSchema(table: string): Promise<TableSchema> {
    this.ensureConnected();

    // Try to get schema from information_schema
    try {
      const { data, error } = await this.client!.rpc('get_table_schema', { table_name: table });
      if (!error && data) {
        return data as TableSchema;
      }
    } catch (e) {
      // RPC function doesn't exist, use fallback
    }

    // Fallback: Query a single row to infer schema
    const { data: sampleRow, error: queryError } = await this.client!
      .from(table)
      .select('*')
      .limit(1)
      .maybeSingle();

    // Define known schemas for common tables
    const knownSchemas: Record<string, TableSchema> = {
      leads: {
        name: 'leads',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'text', nullable: false },
          { name: 'email', type: 'text', nullable: true },
          { name: 'phone', type: 'text', nullable: true },
          { name: 'company', type: 'text', nullable: true },
          { name: 'status', type: 'text', nullable: true, default: 'new' },
          { name: 'source', type: 'text', nullable: true },
          { name: 'beard_type', type: 'text', nullable: true },
          { name: 'interests', type: 'text', nullable: true },
          { name: 'score', type: 'integer', nullable: true, default: 0 },
          { name: 'assigned_to', type: 'uuid', nullable: true },
          { name: 'notes', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: true },
          { name: 'updated_at', type: 'timestamp', nullable: true }
        ],
        indexes: []
      },
      contacts: {
        name: 'contacts',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'first_name', type: 'text', nullable: false },
          { name: 'last_name', type: 'text', nullable: false },
          { name: 'email', type: 'text', nullable: true, unique: true },
          { name: 'phone', type: 'text', nullable: true },
          { name: 'account_id', type: 'uuid', nullable: true },
          { name: 'title', type: 'text', nullable: true },
          { name: 'tags', type: 'text', nullable: true },
          { name: 'notes', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: true },
          { name: 'updated_at', type: 'timestamp', nullable: true }
        ]
      },
      accounts: {
        name: 'accounts',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'text', nullable: false },
          { name: 'industry', type: 'text', nullable: true },
          { name: 'website', type: 'text', nullable: true },
          { name: 'phone', type: 'text', nullable: true },
          { name: 'billing_address', type: 'json', nullable: true },
          { name: 'shipping_address', type: 'json', nullable: true },
          { name: 'notes', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: true },
          { name: 'updated_at', type: 'timestamp', nullable: true }
        ]
      },
      opportunities: {
        name: 'opportunities',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'text', nullable: false },
          { name: 'account_id', type: 'uuid', nullable: true },
          { name: 'stage', type: 'text', nullable: true, default: 'prospecting' },
          { name: 'amount', type: 'decimal', nullable: true },
          { name: 'probability', type: 'integer', nullable: true },
          { name: 'close_date', type: 'date', nullable: true },
          { name: 'assigned_to', type: 'uuid', nullable: true },
          { name: 'notes', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: true },
          { name: 'updated_at', type: 'timestamp', nullable: true }
        ]
      },
      orders: {
        name: 'orders',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'order_number', type: 'text', nullable: false, unique: true },
          { name: 'account_id', type: 'uuid', nullable: true },
          { name: 'contact_id', type: 'uuid', nullable: true },
          { name: 'opportunity_id', type: 'uuid', nullable: true },
          { name: 'status', type: 'text', nullable: true, default: 'pending' },
          { name: 'total_amount', type: 'decimal', nullable: true },
          { name: 'items', type: 'json', nullable: true },
          { name: 'shipping_address', type: 'json', nullable: true },
          { name: 'notes', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: true },
          { name: 'updated_at', type: 'timestamp', nullable: true }
        ]
      },
      products: {
        name: 'products',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'text', nullable: false },
          { name: 'category', type: 'text', nullable: true },
          { name: 'description', type: 'text', nullable: true },
          { name: 'price', type: 'decimal', nullable: true },
          { name: 'stock_quantity', type: 'integer', nullable: true, default: 0 },
          { name: 'image_url', type: 'text', nullable: true },
          { name: 'is_active', type: 'boolean', nullable: true, default: true },
          { name: 'created_at', type: 'timestamp', nullable: true },
          { name: 'updated_at', type: 'timestamp', nullable: true }
        ]
      },
      change_log: {
        name: 'change_log',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'agent_name', type: 'text', nullable: true },
          { name: 'change_type', type: 'text', nullable: true },
          { name: 'description', type: 'text', nullable: false },
          { name: 'before_state', type: 'json', nullable: true },
          { name: 'after_state', type: 'json', nullable: true },
          { name: 'status', type: 'text', nullable: true, default: 'pending' },
          { name: 'approved_by', type: 'uuid', nullable: true },
          { name: 'created_at', type: 'timestamp', nullable: true },
          { name: 'executed_at', type: 'timestamp', nullable: true }
        ]
      },
      ai_budget: {
        name: 'ai_budget',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'month', type: 'text', nullable: false },
          { name: 'agent_name', type: 'text', nullable: true },
          { name: 'request_count', type: 'integer', nullable: true, default: 0 },
          { name: 'tokens_used', type: 'integer', nullable: true, default: 0 },
          { name: 'estimated_cost', type: 'decimal', nullable: true, default: 0 },
          { name: 'created_at', type: 'timestamp', nullable: true }
        ]
      }
    };

    // Return known schema if available
    if (knownSchemas[table]) {
      return knownSchemas[table];
    }

    // Last resort: infer from sample row
    if (sampleRow) {
      const columns: ColumnDefinition[] = Object.keys(sampleRow).map(key => ({
        name: key,
        type: typeof sampleRow[key] === 'number' ? 'integer' : 'text',
        nullable: true
      }));

      return {
        name: table,
        columns,
        indexes: []
      };
    }

    throw new Error(`Could not determine schema for table: ${table}`);
  }

  async createTable(schema: TableSchema): Promise<boolean> {
    this.ensureConnected();
    // Build SQL statement
    const columns = schema.columns.map(col => {
      let def = `${col.name} ${this.mapTypeToSQL(col.type)}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (!col.nullable) def += ' NOT NULL';
      if (col.unique) def += ' UNIQUE';
      if (col.default !== undefined) def += ` DEFAULT ${col.default}`;
      if (col.references) {
        def += ` REFERENCES ${col.references.table}(${col.references.column})`;
      }
      return def;
    }).join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${schema.name} (${columns})`;
    
    const { error } = await this.client!.rpc('execute_sql', { sql_query: sql });
    if (error) throw new Error(`CreateTable failed: ${error.message}`);
    return true;
  }

  async addColumn(table: string, column: ColumnDefinition): Promise<boolean> {
    this.ensureConnected();
    let def = `${column.name} ${this.mapTypeToSQL(column.type)}`;
    if (!column.nullable) def += ' NOT NULL';
    if (column.default !== undefined) def += ` DEFAULT ${column.default}`;

    const sql = `ALTER TABLE ${table} ADD COLUMN ${def}`;
    
    const { error } = await this.client!.rpc('execute_sql', { sql_query: sql });
    if (error) throw new Error(`AddColumn failed: ${error.message}`);
    return true;
  }

  async modifyColumn(table: string, columnName: string, newDefinition: ColumnDefinition): Promise<boolean> {
    this.ensureConnected();
    const sql = `ALTER TABLE ${table} ALTER COLUMN ${columnName} TYPE ${this.mapTypeToSQL(newDefinition.type)}`;
    
    const { error } = await this.client!.rpc('execute_sql', { sql_query: sql });
    if (error) throw new Error(`ModifyColumn failed: ${error.message}`);
    return true;
  }

  async dropColumn(table: string, columnName: string): Promise<boolean> {
    this.ensureConnected();
    const sql = `ALTER TABLE ${table} DROP COLUMN ${columnName}`;
    
    const { error } = await this.client!.rpc('execute_sql', { sql_query: sql });
    if (error) throw new Error(`DropColumn failed: ${error.message}`);
    return true;
  }

  async createIndex(table: string, columns: string[], indexName?: string): Promise<boolean> {
    this.ensureConnected();
    const name = indexName || `idx_${table}_${columns.join('_')}`;
    const sql = `CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${columns.join(', ')})`;
    
    const { error } = await this.client!.rpc('execute_sql', { sql_query: sql });
    if (error) throw new Error(`CreateIndex failed: ${error.message}`);
    return true;
  }

  async dropIndex(table: string, indexName: string): Promise<boolean> {
    this.ensureConnected();
    const sql = `DROP INDEX IF EXISTS ${indexName}`;
    
    const { error } = await this.client!.rpc('execute_sql', { sql_query: sql });
    if (error) throw new Error(`DropIndex failed: ${error.message}`);
    return true;
  }

  // Advanced Queries
  async query(sql: string, params?: any[]): Promise<any[]> {
    this.ensureConnected();
    const { data, error } = await this.client!.rpc('execute_sql', { 
      sql_query: sql,
      params: params 
    });
    
    if (error) throw new Error(`Query failed: ${error.message}`);
    return data || [];
  }

  async count(table: string, filters?: QueryFilter[]): Promise<number> {
    this.ensureConnected();
    let query = this.client!.from(table).select('*', { count: 'exact', head: true });

    if (filters) {
      filters.forEach(filter => {
        query = query.eq(filter.column, filter.value);
      });
    }

    const { count, error } = await query;
    if (error) throw new Error(`Count failed: ${error.message}`);
    return count || 0;
  }

  async search(table: string, searchTerm: string, fields: string[]): Promise<any[]> {
    this.ensureConnected();
    const { data, error } = await this.client!.from(table).select('*').or(
      fields.map(field => `${field}.ilike.%${searchTerm}%`).join(',')
    );

    if (error) throw new Error(`Search failed: ${error.message}`);
    return data || [];
  }

  private mapTypeToSQL(type: string): string {
    const typeMap: Record<string, string> = {
      'text': 'TEXT',
      'integer': 'INTEGER',
      'decimal': 'DECIMAL(10,2)',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'timestamp': 'TIMESTAMP WITH TIME ZONE',
      'json': 'JSONB',
      'uuid': 'UUID'
    };
    return typeMap[type] || 'TEXT';
  }
}