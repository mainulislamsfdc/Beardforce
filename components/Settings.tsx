import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { DatabaseService } from '../services/db';
import { AlertTriangle, Download, Trash2, Database, RefreshCw } from 'lucide-react';

const Settings: React.FC = () => {
  const { config, leads, campaigns, tickets, expenses } = useStore();
  const [resetting, setResetting] = useState(false);

  const handleExport = () => {
    const data = {
        config,
        leads,
        campaigns,
        tickets,
        expenses,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beardforce_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFactoryReset = async () => {
    if (confirm("WARNING: This will delete ALL data and reset the application configuration. Are you sure?")) {
        setResetting(true);
        await DatabaseService.resetAll();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <RefreshCw size={28} className="text-slate-400"/> System Settings
            </h2>
            <p className="text-slate-400 mt-2">Manage application configuration and data lifecycle.</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Database size={20} className="text-blue-400"/> Data Management</h3>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-400">Export all system data (Leads, Tickets, Campaigns, Config) to a JSON file.</p>
                    <p className="text-xs text-slate-500 mt-1">Useful for backups or migrating between environments.</p>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                    <Download size={16}/> Export Data
                </button>
            </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-red-900/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <AlertTriangle size={120} className="text-red-500"/>
            </div>
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2 relative z-10"><AlertTriangle size={20}/> Danger Zone</h3>
            
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm text-slate-300 font-bold">Factory Reset</p>
                    <p className="text-sm text-slate-400">Wipe all configuration, users, and data. Returns app to Setup Wizard.</p>
                    <p className="text-xs text-red-400 mt-2 font-mono bg-red-950/30 inline-block px-2 py-1 rounded">This action cannot be undone.</p>
                </div>
                <button 
                    onClick={handleFactoryReset} 
                    disabled={resetting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
                >
                    <Trash2 size={16}/> {resetting ? 'Resetting...' : 'Reset System'}
                </button>
            </div>
        </div>
        
        <div className="text-center text-xs text-slate-600 font-mono mt-8">
            System Version: 1.2.0 | Env: {config?.firebaseConfig ? 'Firebase Cloud' : 'Local Storage'}
        </div>
    </div>
  );
};

export default Settings;