import React from 'react';
import { LayoutDashboard, Users, Megaphone, Server, FolderKanban, MessageSquare, Briefcase } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'meeting', label: 'Meeting Room', icon: MessageSquare },
    { id: 'ceo', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales Operations', icon: Briefcase },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'it', label: 'IT & Systems', icon: Server },
    { id: 'projects', label: 'Project Board', icon: FolderKanban },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-slate-900">B</div>
        <h1 className="text-xl font-bold text-amber-500 tracking-tight">BeardForce</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
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
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-slate-500 font-mono">SYSTEM ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
