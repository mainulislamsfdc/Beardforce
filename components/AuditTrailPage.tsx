import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Shield, Filter, Clock, User, Database, LogIn, Download, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { auditService, type AuditEntry } from '../services/auditService'
import { initializeDatabase } from '../services/database'

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  login: 'bg-purple-500',
  logout: 'bg-gray-500',
  export: 'bg-amber-500',
  import: 'bg-cyan-500',
  approve: 'bg-green-500',
  reject: 'bg-red-500',
}

const ENTITY_ICONS: Record<string, typeof Database> = {
  lead: User,
  contact: User,
  opportunity: Database,
  order: Database,
  product: Database,
  system: Shield,
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

type Tab = 'audit' | 'logins'

const AuditTrailPage: React.FC = () => {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('audit')
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const loadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!user?.id || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      await initializeDatabase(user.id)
      const filters: any = {}
      if (actionFilter) filters.action = actionFilter
      if (entityFilter) filters.entityType = entityFilter

      const [logs, logins] = await Promise.all([
        auditService.getAuditLogs(user.id, Object.keys(filters).length ? filters : undefined),
        auditService.getLoginHistory(user.id),
      ])
      setAuditLogs(logs)
      setLoginHistory(logins)
    } catch (err) {
      console.error('Failed to load audit data:', err)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [user?.id, actionFilter, entityFilter])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-auto">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="text-orange-400" size={28} />
              Audit Trail
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track all system activities and login history</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-gray-700/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('audit')}
            className={`px-4 py-2 text-sm rounded-md font-medium transition ${tab === 'audit' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} />
              Activity Log ({auditLogs.length})
            </div>
          </button>
          <button
            onClick={() => setTab('logins')}
            className={`px-4 py-2 text-sm rounded-md font-medium transition ${tab === 'logins' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <div className="flex items-center gap-2">
              <LogIn size={16} />
              Login History ({loginHistory.length})
            </div>
          </button>
        </div>
      </div>

      {/* Filters (audit tab only) */}
      {tab === 'audit' && (
        <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-3 flex items-center gap-3">
          <Filter size={16} className="text-gray-500" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="import">Import</option>
            <option value="export">Export</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Entities</option>
            <option value="lead">Leads</option>
            <option value="contact">Contacts</option>
            <option value="opportunity">Opportunities</option>
            <option value="order">Orders</option>
            <option value="product">Products</option>
            <option value="system">System</option>
          </select>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'audit' ? (
          /* Audit Log Timeline */
          auditLogs.length === 0 ? (
            <div className="text-center py-16">
              <Shield size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No audit entries yet</p>
              <p className="text-gray-500 text-sm mt-1">Activities will appear here as you use the CRM</p>
            </div>
          ) : (
            <div className="space-y-1">
              {auditLogs.map((entry) => {
                const Icon = ENTITY_ICONS[entry.entity_type] || Database
                const dotColor = ACTION_COLORS[entry.action] || 'bg-gray-500'
                return (
                  <div key={entry.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition group">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center mt-1">
                      <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                      <div className="w-px h-8 bg-gray-700 group-last:hidden" />
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-gray-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          entry.action === 'create' ? 'bg-green-900/50 text-green-400' :
                          entry.action === 'delete' ? 'bg-red-900/50 text-red-400' :
                          entry.action === 'update' ? 'bg-blue-900/50 text-blue-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {entry.action.toUpperCase()}
                        </span>
                        <span className="text-gray-500 text-xs">{entry.entity_type}</span>
                      </div>
                      {entry.details && (
                        <p className="text-gray-300 text-sm mt-1">
                          {entry.details.description || entry.details.message || JSON.stringify(entry.details).substring(0, 120)}
                        </p>
                      )}
                      {entry.entity_id && (
                        <p className="text-gray-600 text-xs mt-0.5 font-mono">ID: {entry.entity_id.substring(0, 8)}...</p>
                      )}
                    </div>

                    {/* Time */}
                    <span className="text-gray-600 text-xs whitespace-nowrap flex-shrink-0">
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* Login History */
          loginHistory.length === 0 ? (
            <div className="text-center py-16">
              <LogIn size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No login history</p>
              <p className="text-gray-500 text-sm mt-1">Your login sessions will be tracked here</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Browser</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry: any) => (
                    <tr key={entry.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          entry.event_type === 'login' ? 'bg-green-900/50 text-green-400' :
                          entry.event_type === 'logout' ? 'bg-gray-700 text-gray-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>
                          {entry.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 capitalize">{entry.provider || 'email'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">
                        {entry.user_agent ? (
                          entry.user_agent.includes('Chrome') ? 'Chrome' :
                          entry.user_agent.includes('Firefox') ? 'Firefox' :
                          entry.user_agent.includes('Safari') ? 'Safari' :
                          entry.user_agent.includes('Edge') ? 'Edge' : 'Unknown'
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default AuditTrailPage
