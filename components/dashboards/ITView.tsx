import React, { useState } from 'react';
import { Database, Server, Shield, Activity, FileText, BarChart2, Eye, Terminal } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ITView: React.FC = () => {
  const { logs, traces, metrics } = useStore();
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'traces'>('status');

  // Prepare Metrics Data for Charts
  const latencyData = metrics.filter(m => m.name === 'llm_latency').slice(-20).map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      value: m.value
  }));

  return (
    <div className="space-y-6 h-full flex flex-col">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Server size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">System Status</p>
                    <p className="font-bold text-green-400">Online</p>
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><Activity size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">Avg Latency</p>
                    <p className="font-bold text-slate-200">
                        {metrics.length > 0 ? (metrics.filter(m => m.name === 'llm_latency').reduce((a, b) => a + b.value, 0) / metrics.length).toFixed(0) : 0}ms
                    </p>
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Eye size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">Total Traces</p>
                    <p className="font-bold text-slate-200">{traces.length}</p>
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg"><Shield size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">Security</p>
                    <p className="font-bold text-slate-200">Optimal</p>
                </div>
            </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800">
            <button 
                onClick={() => setActiveTab('status')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'status' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                <BarChart2 size={16}/> System Health & Metrics
            </button>
            <button 
                onClick={() => setActiveTab('traces')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'traces' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                <Terminal size={16}/> Agent Traces (MCP)
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                <FileText size={16}/> System Logs
            </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            
            {activeTab === 'status' && (
                <div className="p-6 space-y-6 h-full overflow-y-auto">
                    <div>
                        <h4 className="text-sm font-bold text-slate-200 mb-4">LLM Response Latency (ms)</h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={latencyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tick={{fill: '#64748b'}} />
                                    <YAxis stroke="#64748b" fontSize={12} tick={{fill: '#64748b'}} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}}
                                        itemStyle={{color: '#f59e0b'}}
                                    />
                                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <h4 className="text-sm font-mono text-slate-400 mb-2">DB_SCHEMA_V2.SQL</h4>
                        <div className="font-mono text-xs text-slate-500 space-y-1">
                             <p>CREATE TABLE metrics (id UUID, name VARCHAR, value FLOAT, timestamp TIMESTAMP);</p>
                             <p>CREATE TABLE traces (id UUID, input TEXT, output TEXT, latency INT);</p>
                             <p>CREATE INDEX idx_metrics_ts ON metrics(timestamp);</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'traces' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-mono">LIVE TRACE STREAM</span>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-green-500">Capturing</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-semibold sticky top-0">
                                <tr>
                                    <th className="p-3 border-b border-slate-800">Timestamp</th>
                                    <th className="p-3 border-b border-slate-800">Status</th>
                                    <th className="p-3 border-b border-slate-800">Latency</th>
                                    <th className="p-3 border-b border-slate-800">Input / Output</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-sm">
                                {traces.map(trace => (
                                    <tr key={trace.id} className="hover:bg-slate-800/50">
                                        <td className="p-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                                            {new Date(trace.timestamp).toLocaleTimeString()}.{new Date(trace.timestamp).getMilliseconds()}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${trace.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {trace.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-300 font-mono">{trace.latencyMs.toFixed(0)}ms</td>
                                        <td className="p-3 max-w-md">
                                            <div className="truncate text-slate-300 font-medium mb-1" title={trace.input}>In: {trace.input}</div>
                                            <div className="truncate text-slate-500 text-xs" title={trace.output}>Out: {trace.output}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-3 hover:bg-slate-800 p-1 rounded">
                            <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`font-bold ${
                                log.level === 'error' ? 'text-red-500' : 
                                log.level === 'warn' ? 'text-amber-500' : 'text-blue-500'
                            }`}>[{log.level.toUpperCase()}]</span>
                            <span className="text-amber-500/80">[{log.agent}]</span>
                            <span className="text-slate-300">{log.action}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default ITView;