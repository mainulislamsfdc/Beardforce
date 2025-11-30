import React from 'react';
import { LayoutDashboard, Megaphone, Server, FolderKanban, MessageSquare, Briefcase, LogOut, Settings, Box, Database, Activity, Globe, Users, Code } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DatabaseService } from '../services/db';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { config, setUser, customPages } = useStore();
  
  const handleLogout = async () => {
    await DatabaseService.logout();
    setUser(null);
  };

  const navItems = [
    { id: 'meeting', label: 'Meeting Room', icon: MessageSquare },
    { id: 'ceo', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales Operations', icon: Briefcase },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'it', label: 'IT & Observability', icon: Server },
    { id: 'projects', label: 'Project Board', icon: FolderKanban },
  ];

  // Map string icon names to Lucide components for custom pages
  const iconMap: any = {
      box: Box,
      database: Database,
      activity: Activity,
      globe: Globe,
      server: Server,
      briefcase: Briefcase
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full bg-${config?.themeColor || 'amber'}-500 flex items-center justify-center font-bold text-slate-900`}>
            {config?.businessName.charAt(0) || 'B'}
        </div>
        <h1 className="text-sm font-bold text-slate-100 tracking-tight truncate">{config?.businessName || 'CRM'}</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}

        {/* Custom Pages Section */}
        {customPages.length > 0 && (
            <div className="pt-4 mt-4 border-t border-slate-800">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Modules</p>
                {customPages.map(page => {
                    const Icon = iconMap[page.icon] || Box;
                    const isActive = currentView === page.id;
                    return (
                        <button
                            key={page.id}
                            onClick={() => setView(page.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                isActive 
                                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                        >
                            <Icon size={18} />
                            <span className="font-medium text-sm">{page.name}</span>
                        </button>
                    );
                })}
            </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button 
           onClick={() => setView('users')}
           className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${currentView === 'users' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-200'}`}
        >
            <Users size={18} /> <span className="text-sm font-medium">User Mgmt</span>
        </button>

        <button 
           onClick={() => setView('ide')}
           className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${currentView === 'ide' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-200'}`}
        >
            <Code size={18} /> <span className="text-sm font-medium">IT Studio</span>
        </button>

        <button 
           onClick={() => setView('settings')}
           className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${currentView === 'settings' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-200'}`}
        >
            <Settings size={18} /> <span className="text-sm font-medium">Settings</span>
        </button>

        <div className="flex items-center gap-3 px-4 py-2">
          <div className={`w-2 h-2 rounded-full ${config?.firebaseConfig ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></div>
          <span className="text-xs text-slate-500 font-mono">{config?.firebaseConfig ? 'FIREBASE' : 'LOCAL DB'}</span>
        </div>
        
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors">
            <LogOut size={18} /> <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;