import { supabase } from './supabase/client'
import { databaseService } from './database'
import { notificationService } from './notificationService'

// ============================================================================
// Types
// ============================================================================

export interface WorkflowStep {
  id: string
  type: 'action' | 'condition' | 'delay'
  action?: string          // create_record, update_field, send_notification, log_change
  config: Record<string, any>
}

export interface Workflow {
  id: string
  user_id: string
  name: string
  description: string
  trigger_type: string    // manual, on_create, on_update, on_status_change, schedule
  trigger_config: Record<string, any>
  steps: WorkflowStep[]
  is_active: boolean
  last_run_at: string | null
  run_count: number
  created_at: string
  updated_at: string
}

// ============================================================================
// CRUD
// ============================================================================

export const workflowService = {
  async getWorkflows(userId: string): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createWorkflow(workflow: Partial<Workflow> & { user_id: string; name: string }): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        user_id: workflow.user_id,
        name: workflow.name,
        description: workflow.description || '',
        trigger_type: workflow.trigger_type || 'manual',
        trigger_config: workflow.trigger_config || {},
        steps: workflow.steps || [],
        is_active: workflow.is_active ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteWorkflow(id: string): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================================
  // Execution
  // ============================================================================

  async executeWorkflow(workflow: Workflow, triggerData?: Record<string, any>): Promise<{
    success: boolean
    stepsExecuted: number
    results: any[]
    error?: string
  }> {
    const results: any[] = []
    let stepsExecuted = 0

    try {
      for (const step of workflow.steps) {
        const result = await executeStep(step, triggerData || {})
        results.push({ stepId: step.id, ...result })
        stepsExecuted++

        // If a condition step returns false, stop execution
        if (step.type === 'condition' && !result.passed) break
      }

      // Update last_run_at and run_count
      await supabase
        .from('workflows')
        .update({
          last_run_at: new Date().toISOString(),
          run_count: workflow.run_count + 1,
        })
        .eq('id', workflow.id)

      return { success: true, stepsExecuted, results }
    } catch (err: any) {
      return { success: false, stepsExecuted, results, error: err.message }
    }
  },
}

// ============================================================================
// Step Executor
// ============================================================================

async function executeStep(
  step: WorkflowStep,
  context: Record<string, any>
): Promise<Record<string, any>> {
  switch (step.type) {
    case 'action':
      return executeAction(step, context)
    case 'condition':
      return evaluateCondition(step, context)
    case 'delay':
      // In browser, we just log the delay (real scheduling needs server-side)
      return { type: 'delay', duration: step.config.duration || '0s', skipped: true }
    default:
      return { error: `Unknown step type: ${step.type}` }
  }
}

async function executeAction(
  step: WorkflowStep,
  context: Record<string, any>
): Promise<Record<string, any>> {
  const { action, config } = step

  switch (action) {
    case 'create_record': {
      const { table, data } = config
      if (!table || !data) return { error: 'Missing table or data' }
      const record = await databaseService.getAdapter().create(table, {
        ...data,
        user_id: databaseService.getUserId(),
      })
      return { action: 'create_record', table, record_id: record.id }
    }

    case 'update_field': {
      const { table, record_id, field, value } = config
      if (!table || !record_id || !field) return { error: 'Missing table, record_id, or field' }
      const entityId = record_id === '$trigger.id' ? context.id : record_id
      await databaseService.getAdapter().update(table, entityId, { [field]: value })
      return { action: 'update_field', table, field, value }
    }

    case 'send_notification': {
      const { title, message, type } = config
      await notificationService.createNotification(
        databaseService.getUserId(),
        title || 'Workflow Notification',
        message || 'A workflow action was triggered',
        type || 'info',
        'Workflow'
      )
      return { action: 'send_notification', title }
    }

    case 'log_change': {
      const { description } = config
      await databaseService.logChange(
        'Workflow',
        'automated_action',
        description || 'Automated workflow action executed'
      )
      return { action: 'log_change', description }
    }

    default:
      return { error: `Unknown action: ${action}` }
  }
}

function evaluateCondition(
  step: WorkflowStep,
  context: Record<string, any>
): Record<string, any> {
  const { field, operator, value } = step.config
  const actual = context[field]

  let passed = false
  switch (operator) {
    case '=': case 'equals': passed = actual == value; break
    case '!=': case 'not_equals': passed = actual != value; break
    case '>': passed = Number(actual) > Number(value); break
    case '<': passed = Number(actual) < Number(value); break
    case '>=': passed = Number(actual) >= Number(value); break
    case '<=': passed = Number(actual) <= Number(value); break
    case 'contains': passed = String(actual).includes(String(value)); break
    default: passed = false
  }

  return { type: 'condition', field, operator, value, actual, passed }
}
