import { supabase } from './supabase/client'
import { databaseService } from './database'
import { notificationService } from './notificationService'
import { integrationService } from './integrations/IntegrationService'
import { eventBus, type CRMEvent } from './workflows/EventBus'

// ============================================================================
// Types
// ============================================================================

export interface WorkflowStep {
  id: string
  type: 'action' | 'condition' | 'delay' | 'agent' | 'integration'
  action?: string
  config: Record<string, any>
}

export interface Workflow {
  id: string
  user_id: string
  name: string
  description: string
  trigger_type: string    // manual, on_create, on_update, on_status_change, event
  trigger_config: Record<string, any>
  steps: WorkflowStep[]
  is_active: boolean
  last_run_at: string | null
  run_count: number
  created_at: string
  updated_at: string
}

export interface WorkflowRunResult {
  success: boolean
  stepsExecuted: number
  results: any[]
  error?: string
  runId?: string
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

  async executeWorkflow(workflow: Workflow, triggerData?: Record<string, any>): Promise<WorkflowRunResult> {
    const results: any[] = []
    let stepsExecuted = 0
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Log run start
    await logWorkflowRun(workflow.id, runId, 'running', workflow.user_id)

    try {
      // Context accumulates results from each step for downstream steps
      const context: Record<string, any> = { ...triggerData, $runId: runId }

      for (const step of workflow.steps) {
        const result = await executeStep(step, context)
        results.push({ stepId: step.id, ...result })
        stepsExecuted++

        // Merge result into context so next steps can reference it
        context[`$step_${step.id}`] = result

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

      await logWorkflowRun(workflow.id, runId, 'completed', workflow.user_id, { stepsExecuted, results })

      // Emit completion event
      eventBus.emit({
        type: 'workflow.completed',
        entity: 'workflow',
        entityId: workflow.id,
        data: { workflowName: workflow.name, stepsExecuted, runId },
        timestamp: new Date().toISOString(),
        userId: workflow.user_id,
      })

      return { success: true, stepsExecuted, results, runId }
    } catch (err: any) {
      await logWorkflowRun(workflow.id, runId, 'failed', workflow.user_id, {
        stepsExecuted,
        error: err.message,
      })

      return { success: false, stepsExecuted, results, error: err.message, runId }
    }
  },

  // ============================================================================
  // Event-Driven Auto-Trigger
  // ============================================================================

  /**
   * Register event listeners for all active workflows of a user.
   * Call this once after login / app init.
   * Returns an unsubscribe function to clean up.
   */
  async registerEventTriggers(userId: string): Promise<() => void> {
    const workflows = await this.getWorkflows(userId)
    const unsubscribers: (() => void)[] = []

    for (const wf of workflows) {
      if (!wf.is_active) continue
      if (wf.trigger_type !== 'event') continue

      const eventType = wf.trigger_config.event_type
      if (!eventType) continue

      const unsub = eventBus.on(eventType, async (event: CRMEvent) => {
        // Check optional filter conditions
        if (wf.trigger_config.entity && event.entity !== wf.trigger_config.entity) return
        if (wf.trigger_config.field && wf.trigger_config.value) {
          if (event.data[wf.trigger_config.field] !== wf.trigger_config.value) return
        }
        await this.executeWorkflow(wf, event.data)
      })

      unsubscribers.push(unsub)
    }

    return () => unsubscribers.forEach(fn => fn())
  },

  /** Get run history for a workflow. */
  async getWorkflowRuns(workflowId: string, limit = 20): Promise<any[]> {
    const { data } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(limit)
    return data || []
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
    case 'agent':
      return executeAgentStep(step, context)
    case 'integration':
      return executeIntegrationStep(step, context)
    case 'delay':
      // In browser, we just log the delay (real scheduling needs server-side)
      return { type: 'delay', duration: step.config.duration || '0s', skipped: true }
    default:
      return { error: `Unknown step type: ${step.type}` }
  }
}

// ── Standard Actions ────────────────────────────────────────────────────────

async function executeAction(
  step: WorkflowStep,
  context: Record<string, any>
): Promise<Record<string, any>> {
  const { action, config } = step

  switch (action) {
    case 'create_record': {
      const { table, data } = config
      if (!table || !data) return { error: 'Missing table or data' }
      const resolved = resolveTemplates(data, context)
      const record = await databaseService.getAdapter().create(table, {
        ...resolved,
        user_id: databaseService.getUserId(),
      })
      // Emit event so other workflows can chain
      eventBus.emitEntityEvent('created', table, record.id, record, databaseService.getUserId())
      return { action: 'create_record', table, record_id: record.id }
    }

    case 'update_field': {
      const { table, record_id, field, value } = config
      if (!table || !record_id || !field) return { error: 'Missing table, record_id, or field' }
      const entityId = resolveValue(record_id, context)
      const resolvedValue = resolveValue(value, context)
      await databaseService.getAdapter().update(table, entityId, { [field]: resolvedValue })
      eventBus.emitEntityEvent('updated', table, entityId, { [field]: resolvedValue }, databaseService.getUserId())
      return { action: 'update_field', table, field, value: resolvedValue }
    }

    case 'send_notification': {
      const { title, message, type } = config
      await notificationService.createNotification(
        databaseService.getUserId(),
        resolveValue(title, context) || 'Workflow Notification',
        resolveValue(message, context) || 'A workflow action was triggered',
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
        resolveValue(description, context) || 'Automated workflow action executed'
      )
      return { action: 'log_change', description }
    }

    default:
      return { error: `Unknown action: ${action}` }
  }
}

// ── Agent Steps ─────────────────────────────────────────────────────────────

/**
 * Execute a step that invokes an AI agent.
 * config: { agentId: 'sales'|'ceo'|'marketing'|'it', prompt: string }
 *
 * The agent processes the prompt using its normal chat() method.
 * The response is returned as step output and available to downstream steps.
 */
async function executeAgentStep(
  step: WorkflowStep,
  context: Record<string, any>
): Promise<Record<string, any>> {
  const { agentId, prompt } = step.config
  if (!agentId || !prompt) {
    return { error: 'Agent step requires agentId and prompt' }
  }

  const resolvedPrompt = resolveValue(prompt, context)

  // Dynamically import agent factory to avoid circular deps
  const { createAgentInstance } = await import('./workflows/agentFactory')
  const agent = createAgentInstance(agentId)

  if (!agent) {
    return { error: `Unknown agent: ${agentId}` }
  }

  try {
    const response = await agent.chat(resolvedPrompt)
    return { action: 'agent_chat', agentId, prompt: resolvedPrompt, response }
  } catch (err: any) {
    return { action: 'agent_chat', agentId, error: err.message }
  }
}

// ── Integration Steps ───────────────────────────────────────────────────────

/**
 * Execute a step that calls an integration action.
 * config: { integrationId: 'stripe'|'sendgrid'|'slack', action: string, params: {} }
 */
async function executeIntegrationStep(
  step: WorkflowStep,
  context: Record<string, any>
): Promise<Record<string, any>> {
  const { integrationId, action: integrationAction, params } = step.config
  if (!integrationId || !integrationAction) {
    return { error: 'Integration step requires integrationId and action' }
  }

  const resolvedParams = resolveTemplates(params || {}, context)

  const result = await integrationService.execute(integrationId, integrationAction, resolvedParams)
  return {
    action: 'integration',
    integrationId,
    integrationAction,
    success: result.success,
    data: result.data,
    error: result.error,
  }
}

// ── Conditions ──────────────────────────────────────────────────────────────

function evaluateCondition(
  step: WorkflowStep,
  context: Record<string, any>
): Record<string, any> {
  const { field, operator, value } = step.config
  // For conditions, field is a key name in the context (e.g. "status", "score")
  // Unless it starts with $ (explicit reference), look it up directly in context.
  const actual = typeof field === 'string' && !field.startsWith('$')
    ? context[field]
    : resolveValue(field, context)
  const expected = resolveValue(value, context)

  let passed = false
  switch (operator) {
    case '=': case 'equals': passed = actual == expected; break
    case '!=': case 'not_equals': passed = actual != expected; break
    case '>': passed = Number(actual) > Number(expected); break
    case '<': passed = Number(actual) < Number(expected); break
    case '>=': passed = Number(actual) >= Number(expected); break
    case '<=': passed = Number(actual) <= Number(expected); break
    case 'contains': passed = String(actual).includes(String(expected)); break
    case 'exists': passed = actual != null && actual !== ''; break
    default: passed = false
  }

  return { type: 'condition', field, operator, value: expected, actual, passed }
}

// ── Template Resolution ─────────────────────────────────────────────────────

/**
 * Resolve a value that may contain $context references.
 * e.g., "$trigger.id" → context.id, "$step_abc.response" → context.$step_abc.response
 */
function resolveValue(val: any, context: Record<string, any>): any {
  if (typeof val !== 'string') return val
  if (!val.startsWith('$')) return val

  const path = val.slice(1).split('.')
  let current: any = context
  for (const part of path) {
    if (current == null) return val
    // Handle $trigger.field → context[field]
    if (part === 'trigger') continue
    current = current[part]
  }
  return current ?? val
}

/**
 * Deep-resolve all string values in an object.
 */
function resolveTemplates(obj: Record<string, any>, context: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {}
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      resolved[key] = resolveValue(val, context)
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      resolved[key] = resolveTemplates(val, context)
    } else {
      resolved[key] = val
    }
  }
  return resolved
}

// ── Run Logging ─────────────────────────────────────────────────────────────

async function logWorkflowRun(
  workflowId: string,
  runId: string,
  status: 'running' | 'completed' | 'failed',
  userId: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    if (status === 'running') {
      await supabase.from('workflow_runs').insert({
        id: runId,
        workflow_id: workflowId,
        user_id: userId,
        status,
        started_at: new Date().toISOString(),
      })
    } else {
      await supabase.from('workflow_runs').update({
        status,
        completed_at: new Date().toISOString(),
        result: details || {},
      }).eq('id', runId)
    }
  } catch {
    // Non-critical — don't fail the workflow if logging fails
    console.warn(`[WorkflowEngine] Failed to log run ${runId} (${status})`)
  }
}
