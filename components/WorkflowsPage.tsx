import React, { useState, useEffect, useCallback, useRef } from 'react'
import { GitBranch, Plus, Play, Trash2, Power, PowerOff, Clock, ChevronRight, X, AlertCircle, CheckCircle, ArrowDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { initializeDatabase } from '../services/database'
import { workflowService, type Workflow, type WorkflowStep } from '../services/workflowEngine'
import { useNotifications } from '../context/NotificationContext'

// ============================================================================
// Workflow Builder Modal
// ============================================================================

interface BuilderProps {
  workflow?: Workflow
  onSave: (data: Partial<Workflow>) => void
  onClose: () => void
}

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual', desc: 'Run manually from the UI' },
  { value: 'on_create', label: 'On Record Create', desc: 'When a new record is created' },
  { value: 'on_status_change', label: 'On Status Change', desc: 'When a record status changes' },
]

const ACTION_TYPES = [
  { value: 'create_record', label: 'Create Record', desc: 'Insert a new record into a table' },
  { value: 'update_field', label: 'Update Field', desc: 'Change a field value on a record' },
  { value: 'send_notification', label: 'Send Notification', desc: 'Push an in-app notification' },
  { value: 'log_change', label: 'Log Change', desc: 'Add an entry to the change log' },
]

const WorkflowBuilder: React.FC<BuilderProps> = ({ workflow, onSave, onClose }) => {
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [triggerType, setTriggerType] = useState(workflow?.trigger_type || 'manual')
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(workflow?.trigger_config || {})
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps || [])

  const addStep = (type: WorkflowStep['type']) => {
    setSteps(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      action: type === 'action' ? 'send_notification' : undefined,
      config: type === 'action' ? { title: '', message: '' } :
              type === 'condition' ? { field: '', operator: '=', value: '' } :
              { duration: '5m' }
    }])
  }

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id))
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim(),
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      steps,
    })
  }

  const inputCls = "w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
  const selectCls = inputCls

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">{workflow ? 'Edit Workflow' : 'Create Workflow'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Workflow Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g., Notify on qualified lead" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="What does this workflow do?" />
            </div>
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Trigger</label>
            <div className="grid grid-cols-3 gap-2">
              {TRIGGER_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTriggerType(t.value)}
                  className={`p-3 rounded-lg border text-left transition ${
                    triggerType === t.value
                      ? 'border-orange-500 bg-orange-500/10 text-white'
                      : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Trigger config for non-manual */}
            {triggerType !== 'manual' && (
              <div className="mt-3 p-3 bg-gray-700/30 rounded-lg space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Table</label>
                  <select
                    value={triggerConfig.table || ''}
                    onChange={e => setTriggerConfig(prev => ({ ...prev, table: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Select table...</option>
                    {['leads', 'contacts', 'opportunities', 'orders', 'products'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {triggerType === 'on_status_change' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Field</label>
                      <input
                        value={triggerConfig.field || ''}
                        onChange={e => setTriggerConfig(prev => ({ ...prev, field: e.target.value }))}
                        className={inputCls} placeholder="status"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">New Value</label>
                      <input
                        value={triggerConfig.value || ''}
                        onChange={e => setTriggerConfig(prev => ({ ...prev, value: e.target.value }))}
                        className={inputCls} placeholder="qualified"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Steps</label>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id}>
                  {idx > 0 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown size={16} className="text-gray-600" />
                    </div>
                  )}
                  <div className="border border-gray-600 rounded-lg p-3 bg-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        step.type === 'action' ? 'bg-blue-900/50 text-blue-400' :
                        step.type === 'condition' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {step.type.toUpperCase()}
                      </span>
                      <button onClick={() => removeStep(step.id)} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {step.type === 'action' && (
                      <div className="space-y-2">
                        <select
                          value={step.action || ''}
                          onChange={e => {
                            const action = e.target.value
                            const defaultConfig = action === 'send_notification'
                              ? { title: '', message: '' }
                              : action === 'create_record'
                              ? { table: '', data: {} }
                              : action === 'update_field'
                              ? { table: '', record_id: '', field: '', value: '' }
                              : { description: '' }
                            updateStep(step.id, { action, config: defaultConfig })
                          }}
                          className={selectCls}
                        >
                          {ACTION_TYPES.map(a => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                          ))}
                        </select>

                        {step.action === 'send_notification' && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={step.config.title || ''}
                              onChange={e => updateStep(step.id, { config: { ...step.config, title: e.target.value } })}
                              className={inputCls} placeholder="Notification title"
                            />
                            <input
                              value={step.config.message || ''}
                              onChange={e => updateStep(step.id, { config: { ...step.config, message: e.target.value } })}
                              className={inputCls} placeholder="Message"
                            />
                          </div>
                        )}

                        {step.action === 'update_field' && (
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={step.config.table || ''}
                              onChange={e => updateStep(step.id, { config: { ...step.config, table: e.target.value } })}
                              className={selectCls}
                            >
                              <option value="">Table...</option>
                              {['leads', 'contacts', 'opportunities', 'orders'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <input
                              value={step.config.field || ''}
                              onChange={e => updateStep(step.id, { config: { ...step.config, field: e.target.value } })}
                              className={inputCls} placeholder="Field name"
                            />
                            <input
                              value={step.config.value || ''}
                              onChange={e => updateStep(step.id, { config: { ...step.config, value: e.target.value } })}
                              className={inputCls} placeholder="New value"
                            />
                          </div>
                        )}

                        {step.action === 'log_change' && (
                          <input
                            value={step.config.description || ''}
                            onChange={e => updateStep(step.id, { config: { ...step.config, description: e.target.value } })}
                            className={inputCls} placeholder="Change description"
                          />
                        )}

                        {step.action === 'create_record' && (
                          <div className="space-y-2">
                            <select
                              value={step.config.table || ''}
                              onChange={e => updateStep(step.id, { config: { ...step.config, table: e.target.value } })}
                              className={selectCls}
                            >
                              <option value="">Table...</option>
                              {['leads', 'contacts', 'opportunities', 'orders', 'products'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <textarea
                              value={typeof step.config.data === 'object' ? JSON.stringify(step.config.data, null, 2) : step.config.data || ''}
                              onChange={e => {
                                try {
                                  const data = JSON.parse(e.target.value)
                                  updateStep(step.id, { config: { ...step.config, data } })
                                } catch {
                                  updateStep(step.id, { config: { ...step.config, data: e.target.value } })
                                }
                              }}
                              className={`${inputCls} h-20 font-mono text-xs`}
                              placeholder='{"name": "New Lead", "email": "..."}'
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {step.type === 'condition' && (
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={step.config.field || ''}
                          onChange={e => updateStep(step.id, { config: { ...step.config, field: e.target.value } })}
                          className={inputCls} placeholder="Field"
                        />
                        <select
                          value={step.config.operator || '='}
                          onChange={e => updateStep(step.id, { config: { ...step.config, operator: e.target.value } })}
                          className={selectCls}
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value="contains">contains</option>
                        </select>
                        <input
                          value={step.config.value || ''}
                          onChange={e => updateStep(step.id, { config: { ...step.config, value: e.target.value } })}
                          className={inputCls} placeholder="Value"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Step buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => addStep('action')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg border border-blue-600/30 transition"
              >
                <Plus size={14} /> Action
              </button>
              <button
                onClick={() => addStep('condition')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg border border-amber-600/30 transition"
              >
                <Plus size={14} /> Condition
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {workflow ? 'Update Workflow' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

const WorkflowsPage: React.FC = () => {
  const { user } = useAuth()
  const { addToast } = useNotifications()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>()
  const [executing, setExecuting] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const loadWorkflows = useCallback(async () => {
    if (!user?.id || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      await initializeDatabase(user.id)
      const data = await workflowService.getWorkflows(user.id)
      setWorkflows(data)
    } catch (err) {
      console.error('Failed to load workflows:', err)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [user?.id])

  useEffect(() => { loadWorkflows() }, [loadWorkflows])

  const handleSave = async (data: Partial<Workflow>) => {
    if (!user?.id) return
    try {
      if (editingWorkflow) {
        await workflowService.updateWorkflow(editingWorkflow.id, data)
        addToast('Workflow Updated', `"${data.name}" has been updated`, 'success')
      } else {
        await workflowService.createWorkflow({ ...data, user_id: user.id } as any)
        addToast('Workflow Created', `"${data.name}" has been created`, 'success')
      }
      setShowBuilder(false)
      setEditingWorkflow(undefined)
      loadWorkflows()
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to save workflow', 'error')
    }
  }

  const handleDelete = async (workflow: Workflow) => {
    if (!confirm(`Delete workflow "${workflow.name}"?`)) return
    try {
      await workflowService.deleteWorkflow(workflow.id)
      addToast('Workflow Deleted', `"${workflow.name}" has been removed`, 'info')
      loadWorkflows()
    } catch (err: any) {
      addToast('Error', err.message, 'error')
    }
  }

  const handleToggle = async (workflow: Workflow) => {
    try {
      await workflowService.toggleActive(workflow.id, !workflow.is_active)
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, is_active: !w.is_active } : w))
    } catch (err: any) {
      addToast('Error', err.message, 'error')
    }
  }

  const handleRun = async (workflow: Workflow) => {
    setExecuting(workflow.id)
    try {
      const result = await workflowService.executeWorkflow(workflow)
      if (result.success) {
        addToast('Workflow Complete', `"${workflow.name}" executed ${result.stepsExecuted} steps`, 'success')
      } else {
        addToast('Workflow Failed', result.error || 'Execution failed', 'error')
      }
      loadWorkflows()
    } catch (err: any) {
      addToast('Error', err.message, 'error')
    } finally {
      setExecuting(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-auto">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <GitBranch className="text-orange-400" size={28} />
              Workflows
            </h1>
            <p className="text-gray-400 text-sm mt-1">Automate repetitive tasks with trigger-action workflows</p>
          </div>
          <button
            onClick={() => { setEditingWorkflow(undefined); setShowBuilder(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={18} />
            New Workflow
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-16">
            <GitBranch size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No workflows yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first workflow to automate CRM tasks</p>
            <button
              onClick={() => { setEditingWorkflow(undefined); setShowBuilder(true) }}
              className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition"
            >
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-medium">{wf.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        wf.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-500'
                      }`}>
                        {wf.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-400">
                        {wf.trigger_type.replace('_', ' ')}
                      </span>
                    </div>
                    {wf.description && <p className="text-gray-400 text-sm mt-1">{wf.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
                      <span>Run {wf.run_count} time{wf.run_count !== 1 ? 's' : ''}</span>
                      {wf.last_run_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          Last: {new Date(wf.last_run_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {wf.trigger_type === 'manual' && (
                      <button
                        onClick={() => handleRun(wf)}
                        disabled={executing === wf.id}
                        className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition disabled:opacity-50"
                        title="Run now"
                      >
                        {executing === wf.id
                          ? <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          : <Play size={18} />
                        }
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(wf)}
                      className={`p-2 rounded-lg transition ${wf.is_active ? 'text-green-400 hover:bg-green-900/30' : 'text-gray-500 hover:bg-gray-700'}`}
                      title={wf.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {wf.is_active ? <Power size={18} /> : <PowerOff size={18} />}
                    </button>
                    <button
                      onClick={() => { setEditingWorkflow(wf); setShowBuilder(true) }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      title="Edit"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(wf)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Builder Modal */}
      {showBuilder && (
        <WorkflowBuilder
          workflow={editingWorkflow}
          onSave={handleSave}
          onClose={() => { setShowBuilder(false); setEditingWorkflow(undefined) }}
        />
      )}
    </div>
  )
}

export default WorkflowsPage
