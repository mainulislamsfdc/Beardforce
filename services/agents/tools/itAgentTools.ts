// ============================================================================
// 1. IT AGENT TOOLS/FUNCTIONS
// ============================================================================
// services/agents/tools/itAgentTools.ts

import { DatabaseService } from '../../database/DatabaseService';
import { ColumnDefinition, TableSchema, QueryFilter } from '../../database/DatabaseAdapter';

export interface ITAgentTool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any) => Promise<any>;
}

export class ITAgentTools {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  // Get all available tools for the IT Agent
  getTools(): ITAgentTool[] {
    return [
      {
        name: 'list_tables',
        description: 'List all tables in the database',
        parameters: {},
        execute: async () => {
          const tables = await this.dbService.getAdapter().getTables();
          return { tables };
        }
      },
      {
        name: 'get_table_schema',
        description: 'Get the schema/structure of a specific table',
        parameters: {
          table_name: { type: 'string', required: true }
        },
        execute: async (params: { table_name: string }) => {
          const schema = await this.dbService.getAdapter().getTableSchema(params.table_name);
          return { schema };
        }
      },
      {
        name: 'create_table',
        description: 'Create a new table in the database',
        parameters: {
          table_name: { type: 'string', required: true },
          columns: { type: 'array', required: true }
        },
        execute: async (params: { table_name: string; columns: ColumnDefinition[] }) => {
          const schema: TableSchema = {
            name: params.table_name,
            columns: params.columns
          };

          // Log this change
          await this.dbService.logChange(
            'IT',
            'schema',
            `Creating new table: ${params.table_name}`,
            null,
            schema
          );

          const success = await this.dbService.getAdapter().createTable(schema);
          return { success, message: `Table ${params.table_name} created successfully` };
        }
      },
      {
        name: 'add_column',
        description: 'Add a new column to an existing table',
        parameters: {
          table_name: { type: 'string', required: true },
          column: { type: 'object', required: true }
        },
        execute: async (params: { table_name: string; column: ColumnDefinition }) => {
          // Get current schema for logging
          const currentSchema = await this.dbService.getAdapter().getTableSchema(params.table_name);

          // Log this change
          await this.dbService.logChange(
            'IT',
            'schema',
            `Adding column ${params.column.name} to table ${params.table_name}`,
            currentSchema,
            { ...currentSchema, newColumn: params.column }
          );

          const success = await this.dbService.getAdapter().addColumn(params.table_name, params.column);
          return { success, message: `Column ${params.column.name} added to ${params.table_name}` };
        }
      },
      {
        name: 'modify_column',
        description: 'Modify an existing column in a table',
        parameters: {
          table_name: { type: 'string', required: true },
          column_name: { type: 'string', required: true },
          new_definition: { type: 'object', required: true }
        },
        execute: async (params: { table_name: string; column_name: string; new_definition: ColumnDefinition }) => {
          const currentSchema = await this.dbService.getAdapter().getTableSchema(params.table_name);

          await this.dbService.logChange(
            'IT',
            'schema',
            `Modifying column ${params.column_name} in table ${params.table_name}`,
            currentSchema,
            { ...currentSchema, modifiedColumn: params.new_definition }
          );

          const success = await this.dbService.getAdapter().modifyColumn(
            params.table_name,
            params.column_name,
            params.new_definition
          );
          return { success, message: `Column ${params.column_name} modified successfully` };
        }
      },
      {
        name: 'drop_column',
        description: 'Remove a column from a table (DANGEROUS - requires approval)',
        parameters: {
          table_name: { type: 'string', required: true },
          column_name: { type: 'string', required: true }
        },
        execute: async (params: { table_name: string; column_name: string }) => {
          const currentSchema = await this.dbService.getAdapter().getTableSchema(params.table_name);

          await this.dbService.logChange(
            'IT',
            'schema',
            `⚠️ DROPPING column ${params.column_name} from table ${params.table_name}`,
            currentSchema,
            { action: 'drop_column', column: params.column_name }
          );

          return {
            requiresApproval: true,
            message: `⚠️ This action will permanently delete the column ${params.column_name}. Please approve in the change log.`
          };
        }
      },
      {
        name: 'create_index',
        description: 'Create an index on table columns for better query performance',
        parameters: {
          table_name: { type: 'string', required: true },
          columns: { type: 'array', required: true },
          index_name: { type: 'string', required: false }
        },
        execute: async (params: { table_name: string; columns: string[]; index_name?: string }) => {
          await this.dbService.logChange(
            'IT',
            'schema',
            `Creating index on ${params.table_name} (${params.columns.join(', ')})`,
            null,
            { table: params.table_name, columns: params.columns }
          );

          const success = await this.dbService.getAdapter().createIndex(
            params.table_name,
            params.columns,
            params.index_name
          );
          return { success, message: `Index created successfully on ${params.table_name}` };
        }
      },
      {
        name: 'analyze_table',
        description: 'Analyze table data and provide insights',
        parameters: {
          table_name: { type: 'string', required: true }
        },
        execute: async (params: { table_name: string }) => {
          const schema = await this.dbService.getAdapter().getTableSchema(params.table_name);
          const count = await this.dbService.getAdapter().count(params.table_name);
          
          return {
            table: params.table_name,
            row_count: count,
            column_count: schema.columns.length,
            columns: schema.columns.map((c: any) => ({ name: c.name, type: c.type })),
            recommendations: this.generateRecommendations(schema, count)
          };
        }
      },
      {
        name: 'search_records',
        description: 'Search across table records',
        parameters: {
          table_name: { type: 'string', required: true },
          search_term: { type: 'string', required: true },
          fields: { type: 'array', required: true }
        },
        execute: async (params: { table_name: string; search_term: string; fields: string[] }) => {
          const results = await this.dbService.getAdapter().search(
            params.table_name,
            params.search_term,
            params.fields
          );
          return { results, count: results.length };
        }
      },
      {
        name: 'import_data',
        description: 'Import data from CSV or JSON',
        parameters: {
          table_name: { type: 'string', required: true },
          data: { type: 'array', required: true }
        },
        execute: async (params: { table_name: string; data: any[] }) => {
          await this.dbService.logChange(
            'IT',
            'data',
            `Importing ${params.data.length} records into ${params.table_name}`,
            null,
            { count: params.data.length }
          );

          const results = await this.dbService.getAdapter().createMany(params.table_name, params.data);
          return { success: true, imported: results.length };
        }
      },
      {
        name: 'backup_table',
        description: 'Create a backup snapshot of a table',
        parameters: {
          table_name: { type: 'string', required: true }
        },
        execute: async (params: { table_name: string }) => {
          const data = await this.dbService.getAdapter().readAll(params.table_name);
          const schema = await this.dbService.getAdapter().getTableSchema(params.table_name);
          
          const backup = {
            timestamp: new Date().toISOString(),
            table: params.table_name,
            schema,
            data,
            row_count: data.length
          };

          // Store backup info in change_log
          await this.dbService.logChange(
            'IT',
            'backup',
            `Backup created for ${params.table_name}`,
            null,
            backup
          );

          return { success: true, backup_id: Date.now(), row_count: data.length };
        }
      },
      {
        name: 'performance_report',
        description: 'Generate a performance report for the database',
        parameters: {},
        execute: async () => {
          const tables = await this.dbService.getAdapter().getTables();
          const report = [];

          for (const table of tables) {
            const count = await this.dbService.getAdapter().count(table);
            const schema = await this.dbService.getAdapter().getTableSchema(table);
            
            report.push({
              table,
              row_count: count,
              columns: schema.columns.length,
              has_indexes: schema.indexes && schema.indexes.length > 0
            });
          }

          return { tables: report, total_tables: tables.length };
        }
      }
    ];
  }

  private generateRecommendations(schema: TableSchema, rowCount: number): string[] {
    const recommendations: string[] = [];

    // Check for missing indexes on large tables
    if (rowCount > 1000 && (!schema.indexes || schema.indexes.length === 0)) {
      recommendations.push(`Consider adding indexes for better performance (${rowCount} rows)`);
    }

    // Check for text fields that might need full-text search
    const textColumns = schema.columns.filter(c => c.type === 'text');
    if (textColumns.length > 3) {
      recommendations.push('Consider adding full-text search indexes for text columns');
    }

    // Check for nullable primary keys (bad practice)
    const pkColumns = schema.columns.filter(c => c.primaryKey && c.nullable);
    if (pkColumns.length > 0) {
      recommendations.push('⚠️ Primary key columns should not be nullable');
    }

    // Check for missing timestamps
    const hasCreatedAt = schema.columns.some(c => c.name === 'created_at');
    const hasUpdatedAt = schema.columns.some(c => c.name === 'updated_at');
    
    if (!hasCreatedAt) {
      recommendations.push('Consider adding created_at timestamp column');
    }
    if (!hasUpdatedAt) {
      recommendations.push('Consider adding updated_at timestamp column');
    }

    return recommendations;
  }
}