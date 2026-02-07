// ============================================================================
// 1. DATABASE ADAPTER INTERFACE
// ============================================================================
// services/database/DatabaseAdapter.ts

export interface DatabaseConfig {
  type: 'supabase' | 'postgresql' | 'mysql' | 'sqlite';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  filePath?: string; // For SQLite
}

export interface ColumnDefinition {
  name: string;
  type: 'text' | 'integer' | 'decimal' | 'boolean' | 'date' | 'timestamp' | 'json' | 'uuid';
  nullable?: boolean;
  default?: any;
  unique?: boolean;
  primaryKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes?: string[][];
}

export interface QueryFilter {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: any;
}

export abstract class DatabaseAdapter {
  protected config: DatabaseConfig;
  protected connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // Connection Management
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;

  // CRUD Operations
  abstract create(table: string, data: Record<string, any>): Promise<any>;
  abstract read(table: string, id: string): Promise<any>;
  abstract readAll(table: string, filters?: QueryFilter[]): Promise<any[]>;
  abstract update(table: string, id: string, data: Record<string, any>): Promise<any>;
  abstract delete(table: string, id: string): Promise<boolean>;

  // Batch Operations
  abstract createMany(table: string, data: Record<string, any>[]): Promise<any[]>;
  abstract updateMany(table: string, filters: QueryFilter[], data: Record<string, any>): Promise<number>;
  abstract deleteMany(table: string, filters: QueryFilter[]): Promise<number>;

  // Schema Operations (for IT Agent)
  abstract getTables(): Promise<string[]>;
  abstract getTableSchema(table: string): Promise<TableSchema>;
  abstract createTable(schema: TableSchema): Promise<boolean>;
  abstract addColumn(table: string, column: ColumnDefinition): Promise<boolean>;
  abstract modifyColumn(table: string, columnName: string, newDefinition: ColumnDefinition): Promise<boolean>;
  abstract dropColumn(table: string, columnName: string): Promise<boolean>;
  abstract createIndex(table: string, columns: string[], indexName?: string): Promise<boolean>;
  abstract dropIndex(table: string, indexName: string): Promise<boolean>;

  // Advanced Queries
  abstract query(sql: string, params?: any[]): Promise<any[]>;
  abstract count(table: string, filters?: QueryFilter[]): Promise<number>;
  abstract search(table: string, searchTerm: string, fields: string[]): Promise<any[]>;

  // Utility
  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): DatabaseConfig {
    return { ...this.config, password: '***' }; // Hide password
  }
}