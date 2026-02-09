import React from 'react';
import { Link } from 'react-router-dom';
import { Database, TrendingUp, Megaphone, Crown, Users, CheckSquare, Mic, LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  const agents = [
    { id: 'it', name: 'IT Manager', title: 'Tech Lead', icon: Database, color: 'from-blue-600 to-indigo-700', bgColor: 'bg-blue-600', initials: 'TL', path: '/it-agent' },
    { id: 'sales', name: 'Sales Manager', title: 'Sales Lead', icon: TrendingUp, color: 'from-green-600 to-blue-700', bgColor: 'bg-green-600', initials: 'SL', path: '/sales-agent' },
    { id: 'marketing', name: 'Market Manager', title: 'Growth Lead', icon: Megaphone, color: 'from-purple-600 to-pink-700', bgColor: 'bg-pink-600', initials: 'GL', path: '/marketing-agent' },
    { id: 'ceo', name: 'CEO', title: 'The Chief', icon: Crown, color: 'from-amber-600 via-yellow-600 to-orange-700', bgColor: 'bg-purple-600', initials: 'TC', path: '/ceo-agent' }
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">Executive Board</h2>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-600 bg-opacity-20 border border-green-600 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-semibold">READY</span>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-2 gap-6">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <Link
                key={agent.id}
                to={agent.path}
                className="group relative bg-gray-800 rounded-xl p-6 border-2 border-gray-700 hover:border-gray-600 transition-all duration-200 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                <div className="absolute top-4 right-4 text-gray-600"><Mic size={20} /></div>
                <div className="relative flex flex-col items-center text-center">
                  <div className={`w-28 h-28 ${agent.bgColor} rounded-full flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform`}>
                    <span className="text-white text-3xl font-bold">{agent.initials}</span>
                  </div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                    {agent.id.toUpperCase()} {agent.id === 'ceo' ? '' : 'MANAGER'}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">{agent.title}</h3>
                  <div className="mt-2"><Icon className="text-gray-500 group-hover:text-gray-400 transition-colors" size={20} /></div>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm text-gray-400">Click to chat</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* System Status */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">System Status</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center"><div className="text-2xl font-bold text-green-400">4</div><div className="text-xs text-gray-400 mt-1">Agents Online</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-blue-400">42</div><div className="text-xs text-gray-400 mt-1">Total Tools</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-purple-400">0</div><div className="text-xs text-gray-400 mt-1">Pending Approvals</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-amber-400">99%</div><div className="text-xs text-gray-400 mt-1">AI Budget Remaining</div></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Link to="/voice" className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition">
            <Mic className="text-white" size={24} />
            <div><div className="text-white font-semibold">Voice Interface</div><div className="text-purple-200 text-xs">Talk to agents</div></div>
          </Link>
          <Link to="/leads" className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg hover:from-green-700 hover:to-teal-700 transition">
            <Users className="text-white" size={24} />
            <div><div className="text-white font-semibold">Manage Leads</div><div className="text-green-200 text-xs">CRM operations</div></div>
          </Link>
          <Link to="/approvals" className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg hover:from-orange-700 hover:to-red-700 transition">
            <CheckSquare className="text-white" size={24} />
            <div><div className="text-white font-semibold">Approvals</div><div className="text-orange-200 text-xs">Review changes</div></div>
          </Link>
        </div>
      </div>
    </div>
  );
}
