import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Database, TrendingUp, Megaphone, Crown, Users, CheckSquare, Mic, LayoutDashboard, DollarSign, Target, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useAgentConfig } from '../context/AgentConfigContext';
import { AvatarRenderer } from './avatars/AvatarRenderer';
import { databaseService, initializeDatabase } from '../services/database';
import type { AgentId } from '../types';

const STAGE_COLORS: Record<string, string> = {
  prospecting: '#3b82f6',
  qualification: '#6366f1',
  proposal: '#8b5cf6',
  negotiation: '#f59e0b',
  closed_won: '#22c55e',
  closed_lost: '#ef4444',
};

const SOURCE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface DashboardData {
  totalLeads: number;
  qualifiedLeads: number;
  pipelineValue: number;
  revenue: number;
  pendingApprovals: number;
  aiBudgetSpent: number;
  pipelineByStage: { name: string; count: number; value: number }[];
  leadsBySource: { name: string; count: number }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { getAgent } = useAgentConfig();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const AGENT_PATHS: { id: AgentId; icon: any; path: string }[] = [
    { id: 'it', icon: Database, path: '/it-agent' },
    { id: 'sales', icon: TrendingUp, path: '/sales-agent' },
    { id: 'marketing', icon: Megaphone, path: '/marketing-agent' },
    { id: 'ceo', icon: Crown, path: '/ceo-agent' },
  ];

  const agents = AGENT_PATHS.map(ap => {
    const cfg = getAgent(ap.id);
    return {
      ...ap,
      name: cfg.custom_name,
      title: cfg.custom_title,
      color: cfg.color_gradient,
      color_primary: cfg.color_primary,
      avatar_id: cfg.avatar_id,
      initials: cfg.custom_name.substring(0, 2).toUpperCase(),
    };
  });

  const loadDashboardData = useCallback(async () => {
    if (!user?.id || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      await initializeDatabase(user.id);

      const currentMonth = new Date().toISOString().substring(0, 7);

      const [leads, opportunities, orders, changeLogs, aiBudget] = await Promise.all([
        databaseService.getLeads(),
        databaseService.getOpportunities(),
        databaseService.getOrders(),
        databaseService.getChangeLogs([{ column: 'status', operator: '=', value: 'pending' }]),
        databaseService.getAIBudget(currentMonth),
      ]);

      const qualifiedLeads = leads.filter((l: any) => l.status === 'qualified').length;
      const pipelineValue = opportunities
        .filter((o: any) => o.stage !== 'closed_lost')
        .reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);
      const revenue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
      const totalBudgetSpent = aiBudget.reduce((sum: number, b: any) => sum + (parseFloat(b.estimated_cost) || 0), 0);

      // Pipeline by stage
      const stageMap: Record<string, { count: number; value: number }> = {};
      for (const opp of opportunities) {
        const stage = opp.stage || 'prospecting';
        if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 };
        stageMap[stage].count++;
        stageMap[stage].value += parseFloat(opp.amount) || 0;
      }
      const pipelineByStage = Object.entries(stageMap).map(([name, d]) => ({
        name: formatLabel(name),
        count: d.count,
        value: d.value,
      }));

      // Leads by source
      const sourceMap: Record<string, number> = {};
      for (const lead of leads) {
        const source = lead.source || 'other';
        sourceMap[source] = (sourceMap[source] || 0) + 1;
      }
      const leadsBySource = Object.entries(sourceMap).map(([name, count]) => ({
        name: formatLabel(name),
        count,
      }));

      setData({
        totalLeads: leads.length,
        qualifiedLeads,
        pipelineValue,
        revenue,
        pendingApprovals: changeLogs.length,
        aiBudgetSpent: totalBudgetSpent,
        pipelineByStage,
        leadsBySource,
      });
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-white text-sm font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-gray-300 text-xs">
            {entry.name}: {entry.name === 'value' ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

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
                  <div className="mb-4 group-hover:scale-110 transition-transform">
                    <AvatarRenderer
                      avatarId={agent.avatar_id}
                      size="xl"
                      color={agent.color_primary}
                      fallbackInitial={agent.initials}
                    />
                  </div>
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                    {agent.title}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">{agent.name}</h3>
                  <div className="mt-2"><Icon className="text-gray-500 group-hover:text-gray-400 transition-colors" size={20} /></div>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm text-gray-400">Click to chat</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* KPI Cards */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-5 border border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-20 mb-3"></div>
                <div className="h-8 bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-24"></div>
              </div>
            ))
          ) : (
            <>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-gray-400 text-sm">Total Leads</span>
                </div>
                <div className="text-3xl font-bold text-white">{data?.totalLeads || 0}</div>
                <div className="text-xs text-blue-400 mt-1">{data?.qualifiedLeads || 0} qualified</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-purple-400" />
                  <span className="text-gray-400 text-sm">Pipeline Value</span>
                </div>
                <div className="text-3xl font-bold text-white">{formatCurrency(data?.pipelineValue || 0)}</div>
                <div className="text-xs text-purple-400 mt-1">Active opportunities</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-green-400" />
                  <span className="text-gray-400 text-sm">Revenue</span>
                </div>
                <div className="text-3xl font-bold text-white">{formatCurrency(data?.revenue || 0)}</div>
                <div className="text-xs text-green-400 mt-1">From orders</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className={data?.pendingApprovals ? 'text-orange-400' : 'text-gray-500'} />
                  <span className="text-gray-400 text-sm">Pending Approvals</span>
                </div>
                <div className={`text-3xl font-bold ${data?.pendingApprovals ? 'text-orange-400' : 'text-white'}`}>
                  {data?.pendingApprovals || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  AI spent: ${(data?.aiBudgetSpent || 0).toFixed(2)} this month
                </div>
              </div>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          {/* Pipeline by Stage */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Pipeline by Stage</h3>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : data?.pipelineByStage.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.pipelineByStage} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Deals" radius={[0, 4, 4, 0]}>
                    {data.pipelineByStage.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={STAGE_COLORS[entry.name.toLowerCase().replace(/ /g, '_')] || '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                No opportunities yet. Create one via the Sales Agent.
              </div>
            )}
          </div>

          {/* Leads by Source */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Leads by Source</h3>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
            ) : data?.leadsBySource.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.leadsBySource}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ stroke: '#6b7280' }}
                  >
                    {data.leadsBySource.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                No leads yet. Create one via the Sales Agent.
              </div>
            )}
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
