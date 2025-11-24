import React from 'react';
import { useStore } from '../../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, Users, TrendingUp } from 'lucide-react';

const SalesView: React.FC = () => {
  const { leads } = useStore();

  const totalPipeline = leads.reduce((sum, lead) => sum + lead.value, 0);
  const qualifiedLeads = leads.filter(l => l.status === 'Qualified').length;
  
  const chartData = leads.map(l => ({ name: l.name, value: l.value }));

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Pipeline Value</p>
                   <h3 className="text-2xl font-bold text-green-400 mt-1">${totalPipeline.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><DollarSign size={20} /></div>
             </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Total Leads</p>
                   <h3 className="text-2xl font-bold text-slate-200 mt-1">{leads.length}</h3>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={20} /></div>
             </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Qualified Ratio</p>
                   <h3 className="text-2xl font-bold text-amber-400 mt-1">{((qualifiedLeads / leads.length) * 100).toFixed(0)}%</h3>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><TrendingUp size={20} /></div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <h3 className="text-lg font-bold text-slate-200 mb-4">Lead Value Distribution</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} 
                        itemStyle={{ color: '#4ade80' }}
                      />
                      <Bar dataKey="value" fill="#4ade80" radius={[4, 4, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col">
             <h3 className="text-lg font-bold text-slate-200 mb-4">Recent Leads</h3>
             <div className="overflow-y-auto flex-1 pr-2">
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 uppercase bg-slate-800/50 sticky top-0">
                      <tr>
                         <th className="px-3 py-2 rounded-l-md">Name</th>
                         <th className="px-3 py-2">Status</th>
                         <th className="px-3 py-2 rounded-r-md text-right">Value</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                      {leads.map(lead => (
                         <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-3 py-3 font-medium text-slate-300">{lead.name}</td>
                            <td className="px-3 py-3">
                               <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                                  lead.status === 'Qualified' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                  lead.status === 'Customer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-slate-700 text-slate-300 border-slate-600'
                               }`}>
                                  {lead.status}
                               </span>
                            </td>
                            <td className="px-3 py-3 text-right text-slate-400">${lead.value}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>
  );
};

export default SalesView;
