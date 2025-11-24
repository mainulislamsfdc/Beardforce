import React from 'react';
import { Database, Server, Shield, Activity } from 'lucide-react';

const ITView: React.FC = () => {
  return (
    <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Server size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">System Status</p>
                    <p className="font-bold text-green-400">Online</p>
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><Database size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">DB Latency</p>
                    <p className="font-bold text-slate-200">24ms</p>
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Shield size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">Security</p>
                    <p className="font-bold text-slate-200">Optimal</p>
                </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg"><Activity size={20}/></div>
                <div>
                    <p className="text-xs text-slate-500">Uptime</p>
                    <p className="font-bold text-slate-200">99.99%</p>
                </div>
            </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-mono text-sm text-slate-400">Database Schema Simulation</h3>
                <span className="text-xs text-slate-600 font-mono">v2.4.1</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-4">
                <div className="space-y-2">
                    <p className="text-blue-400 font-bold">TABLE leads (</p>
                    <div className="pl-6 text-slate-400 space-y-1">
                        <p>id <span className="text-purple-400">UUID PRIMARY KEY</span>,</p>
                        <p>name <span className="text-purple-400">VARCHAR(255)</span>,</p>
                        <p>email <span className="text-purple-400">VARCHAR(255) UNIQUE</span>,</p>
                        <p>status <span className="text-purple-400">ENUM('New', 'Qualified', ...)</span>,</p>
                        <p>value <span className="text-purple-400">DECIMAL(10,2)</span></p>
                    </div>
                    <p className="text-blue-400 font-bold">);</p>
                </div>

                <div className="space-y-2">
                    <p className="text-blue-400 font-bold">TABLE campaigns (</p>
                    <div className="pl-6 text-slate-400 space-y-1">
                        <p>id <span className="text-purple-400">UUID PRIMARY KEY</span>,</p>
                        <p>platform <span className="text-purple-400">VARCHAR(50)</span>,</p>
                        <p>budget <span className="text-purple-400">DECIMAL(10,2)</span>,</p>
                        <p>clicks <span className="text-purple-400">INT DEFAULT 0</span></p>
                    </div>
                    <p className="text-blue-400 font-bold">);</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ITView;
