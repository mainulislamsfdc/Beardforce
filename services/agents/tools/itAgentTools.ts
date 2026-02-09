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
          const schema = await this.dbService.getAdapter().getTableSchema(params.table_name.toLowerCase());
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
          const tableName = params.table_name.toLowerCase();
          const schema = await this.dbService.getAdapter().getTableSchema(tableName);
          const count = await this.dbService.getAdapter().count(tableName);
          
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
            params.table_name.toLowerCase(),
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
        name: 'read_all_records',
        description: 'Read and return all records from a table. Use this when the user asks to show, list, or view records/leads/contacts/etc.',
        parameters: {
          table_name: { type: 'string', required: true },
          limit: { type: 'number', required: false }
        },
        execute: async (params: { table_name: string; limit?: number }) => {
          const tableName = params.table_name.toLowerCase();
          const allData = await this.dbService.getAdapter().readAll(tableName);
          const data = params.limit ? allData.slice(0, params.limit) : allData;
          return { records: data, count: data.length, total: allData.length };
        }
      },
      {
        name: 'insert_record',
        description: 'Insert a single record into any table. Use this to add leads, contacts, accounts, opportunities, products, or orders.',
        parameters: {
          table_name: { type: 'string', required: true },
          data: { type: 'object', required: true }
        },
        execute: async (params: { table_name: string; data: Record<string, any> }) => {
          try {
            await this.dbService.logChange(
              'IT',
              'data',
              `Inserting record into ${params.table_name}`,
              null,
              params.data
            );

            const result = await this.dbService.getAdapter().create(params.table_name.toLowerCase(), {
              ...params.data,
              user_id: this.dbService.getUserId()
            });
            return { success: true, record: result, message: `Record inserted into ${params.table_name} successfully` };
          } catch (error: any) {
            return { success: false, error: error.message };
          }
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
      },
      // ---- Code Generation Tools ----
      {
        name: 'generate_component',
        description: 'Generate a React component with TypeScript and Tailwind CSS. Use this when the user wants to create a new UI page, widget, form, table, or card component.',
        parameters: {
          component_name: { type: 'string', required: true },
          description: { type: 'string', required: true },
          component_type: { type: 'string', required: false },
          includes_state: { type: 'boolean', required: false },
          includes_api_calls: { type: 'boolean', required: false }
        },
        execute: async (params: { component_name: string; description: string; component_type?: string; includes_state?: boolean; includes_api_calls?: boolean }) => {
          const code = this.generateComponentTemplate(params);
          try {
            await this.dbService.getAdapter().create('code_snippets', {
              user_id: this.dbService.getUserId(),
              agent_name: 'IT',
              title: params.component_name,
              description: params.description,
              code,
              language: 'typescript',
              component_type: params.component_type || 'component'
            });
          } catch (e) {
            // code_snippets table may not exist yet
          }
          await this.dbService.logChange('IT', 'code_generation', `Generated component: ${params.component_name}`, null, { component_name: params.component_name, type: params.component_type });
          return { success: true, component_name: params.component_name, code, message: `Generated ${params.component_name} component. Code saved to snippets.` };
        }
      },
      {
        name: 'generate_workflow',
        description: 'Create an automation workflow that defines triggers, conditions, and actions. Use this when the user wants to automate a business process like lead follow-ups, notifications, or data pipelines.',
        parameters: {
          workflow_name: { type: 'string', required: true },
          trigger: { type: 'string', required: true },
          description: { type: 'string', required: true },
          actions: { type: 'string', required: false }
        },
        execute: async (params: { workflow_name: string; trigger: string; description: string; actions?: string }) => {
          const code = this.generateWorkflowTemplate(params);
          try {
            await this.dbService.getAdapter().create('code_snippets', {
              user_id: this.dbService.getUserId(),
              agent_name: 'IT',
              title: params.workflow_name,
              description: params.description,
              code,
              language: 'typescript',
              component_type: 'workflow'
            });
          } catch (e) {
            // code_snippets table may not exist yet
          }
          await this.dbService.logChange('IT', 'code_generation', `Generated workflow: ${params.workflow_name}`, null, { workflow_name: params.workflow_name, trigger: params.trigger });
          return { success: true, code, message: `Generated workflow: ${params.workflow_name}` };
        }
      },
      {
        name: 'modify_component',
        description: 'Generate a code modification plan for an existing component. The user describes what to change and this tool generates updated code.',
        parameters: {
          component_name: { type: 'string', required: true },
          modification_description: { type: 'string', required: true },
          current_behavior: { type: 'string', required: false }
        },
        execute: async (params: { component_name: string; modification_description: string; current_behavior?: string }) => {
          const modification = {
            component: params.component_name,
            changes: params.modification_description,
            current: params.current_behavior || 'Not specified',
            generated_at: new Date().toISOString()
          };
          await this.dbService.logChange('IT', 'code_modification', `Modification proposed for: ${params.component_name}`, null, modification);
          return { success: true, modification, message: `Generated modification plan for ${params.component_name}. The AI will now describe the code changes needed.` };
        }
      },
      {
        name: 'list_code_snippets',
        description: 'List all saved code snippets generated by the IT Agent. Use this when the user asks to see previous code generations.',
        parameters: {
          component_type: { type: 'string', required: false }
        },
        execute: async (params: { component_type?: string }) => {
          try {
            const filters: any[] = [{ column: 'user_id', operator: '=', value: this.dbService.getUserId() }];
            if (params.component_type) {
              filters.push({ column: 'component_type', operator: '=', value: params.component_type });
            }
            const snippets = await this.dbService.getAdapter().readAll('code_snippets', filters);
            return { snippets: snippets.map((s: any) => ({ id: s.id, title: s.title, description: s.description, type: s.component_type, language: s.language, created_at: s.created_at })), count: snippets.length };
          } catch {
            return { snippets: [], count: 0, message: 'Code snippets table not available yet. Run the SQL setup in Supabase.' };
          }
        }
      },
      // ---- Snapshot / Restore Tools ----
      {
        name: 'create_restore_point',
        description: 'Create a system restore point (snapshot of all CRM data). Use this before making major changes to the database.',
        parameters: {
          label: { type: 'string', required: true },
          description: { type: 'string', required: false }
        },
        execute: async (params: { label: string; description?: string }) => {
          const snapshot = await this.dbService.createSnapshot(params.label, params.description || 'Created by IT Agent', 'IT');
          return { success: true, snapshot_id: snapshot.id, label: params.label, message: `Restore point "${params.label}" created successfully` };
        }
      },
      {
        name: 'list_restore_points',
        description: 'List all available system restore points/snapshots. Use this when the user asks about backups or restore points.',
        parameters: {},
        execute: async () => {
          const snapshots = await this.dbService.getSnapshots();
          return {
            snapshots: snapshots.map((s: any) => ({
              id: s.id, label: s.label, description: s.description,
              tables: s.tables_included, total_rows: s.total_rows,
              created_at: s.created_at, created_by: s.created_by_agent
            })),
            count: snapshots.length
          };
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

  private generateComponentTemplate(params: { component_name: string; description: string; component_type?: string; includes_state?: boolean; includes_api_calls?: boolean }): string {
    const { component_name, description, component_type, includes_state, includes_api_calls } = params;
    const stateImports = includes_state ? ', { useState, useEffect }' : '';
    const apiImports = includes_api_calls
      ? "import { databaseService, initializeDatabase } from '../services/database';\nimport { useAuth } from '../context/AuthContext';\n"
      : '';

    return `import React${stateImports} from 'react';
${apiImports}
/**
 * ${component_name}
 * ${description}
 * Type: ${component_type || 'component'}
 * Generated by IT Agent on ${new Date().toISOString().split('T')[0]}
 */
export const ${component_name}: React.FC = () => {
${includes_state ? '  const [data, setData] = useState<any[]>([]);\n  const [loading, setLoading] = useState(false);\n' : ''}${includes_api_calls ? '  const { user } = useAuth();\n' : ''}
${includes_api_calls && includes_state ? `  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        await initializeDatabase(user.id);
        // TODO: Load data from database
        // const result = await databaseService.getLeads();
        // setData(result);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);\n` : ''}
  return (
    <div className="h-full overflow-y-auto bg-gray-900 p-6">
      <h1 className="text-xl font-bold text-white mb-4">${component_name}</h1>
      <p className="text-gray-400 mb-6">${description}</p>

${includes_state ? `      {loading ? (
        <div className="text-gray-500 text-center py-8">Loading...</div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400">Data loaded: {data.length} records</p>
          {/* TODO: Render ${component_type || 'component'} content here */}
        </div>
      )}` : `      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        {/* TODO: Implement ${component_type || 'component'} UI */}
        <p className="text-gray-500">Component ready for implementation</p>
      </div>`}
    </div>
  );
};

export default ${component_name};
`;
  }

  private generateWorkflowTemplate(params: { workflow_name: string; trigger: string; description: string; actions?: string }): string {
    const { workflow_name, trigger, description, actions } = params;
    const actionList = actions ? actions.split(',').map(a => a.trim()) : ['Log event', 'Notify user'];

    return `/**
 * Workflow: ${workflow_name}
 * Trigger: ${trigger}
 * ${description}
 * Generated by IT Agent on ${new Date().toISOString().split('T')[0]}
 */

import { databaseService } from '../services/database';

export interface WorkflowConfig {
  name: string;
  trigger: '${trigger}';
  enabled: boolean;
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
}

export const ${workflow_name.replace(/[^a-zA-Z0-9]/g, '_')}Workflow: WorkflowConfig = {
  name: '${workflow_name}',
  trigger: '${trigger}',
  enabled: true,
  actions: [
${actionList.map((action, i) => `    { type: '${action.toLowerCase().replace(/\s+/g, '_')}', config: { /* TODO: Configure action ${i + 1}: ${action} */ } }`).join(',\n')}
  ]
};

/**
 * Execute this workflow
 */
export async function execute${workflow_name.replace(/[^a-zA-Z0-9]/g, '')}(triggerData: Record<string, any>): Promise<void> {
  console.log('Executing workflow: ${workflow_name}', triggerData);

${actionList.map((action, i) => `  // Step ${i + 1}: ${action}
  try {
    // TODO: Implement "${action}" logic
    console.log('Step ${i + 1}: ${action}');
  } catch (error) {
    console.error('Workflow step ${i + 1} failed:', error);
  }
`).join('\n')}
}
`;
  }
}