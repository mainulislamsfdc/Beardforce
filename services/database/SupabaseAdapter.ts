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
    // This would typically use information_schema or a custom RPC
    // For now, return a basic structure
    const { data, error } = await this.client!.rpc('get_table_schema', { table_name: table });
    
    if (error) {
      throw new Error(`GetTableSchema failed: ${error.message}`);
    }

    return data as TableSchema;
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