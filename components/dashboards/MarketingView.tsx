import React from 'react';
import { useStore } from '../../context/StoreContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { MousePointer2, Target, Share2 } from 'lucide-react';

const MarketingView: React.FC = () => {
  const { campaigns } = useStore();

  const totalBudget = campaigns.reduce((acc, c) => acc + c.budget, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);

  const data = campaigns.map(c => ({ name: c.platform, value: c.clicks }));
  const COLORS = ['#f43f5e', '#a855f7', '#3b82f6', '#f59e0b'];

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Ad Budget</p>
                   <h3 className="text-2xl font-bold text-pink-400 mt-1">${totalBudget.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><Target size={20} /></div>
             </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Total Clicks</p>
                   <h3 className="text-2xl font-bold text-slate-200 mt-1">{totalClicks.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><MousePointer2 size={20} /></div>
             </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Active Campaigns</p>
                   <h3 className="text-2xl font-bold text-purple-400 mt-1">{campaigns.filter(c => c.status === 'Active').length}</h3>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Share2 size={20} /></div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 lg:col-span-1">
             <h3 className="text-lg font-bold text-slate-200 mb-4">Traffic Source</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={data}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                      />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 text-xs text-slate-400 mt-2">
                 {data.map((d, i) => (
                     <div key={d.name} className="flex items-center gap-1">
                         <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div>
                         {d.name}
                     </div>
                 ))}
             </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 lg:col-span-2">
             <h3 className="text-lg font-bold text-slate-200 mb-4">Campaign Management</h3>
             <div className="space-y-4">
                 {campaigns.map(camp => (
                     <div key={camp.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                         <div>
                             <h4 className="font-semibold text-slate-200">{camp.name}</h4>
                             <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                 Platform: <span className="text-slate-300">{camp.platform}</span>
                                 &bull;
                                 Budget: <span className="text-green-400">${camp.budget}</span>
                             </p>
                         </div>
                         <div className="text-right">
                             <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                 camp.status === 'Active' ? 'bg-green-500/20 text-green-400' : 
                                 camp.status === 'Paused' ? 'bg-amber-500/20 text-amber-400' : 
                                 'bg-slate-600/20 text-slate-400'
                             }`}>
                                 {camp.status}
                             </span>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
       </div>
    </div>
  );
};

export default MarketingView;
