import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { DynamicPage, PageWidget } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Box, Layers, List, Table, Activity, Send, CheckCircle } from 'lucide-react';

interface DynamicPageRendererProps {
  page: DynamicPage;
}

const DynamicPageRenderer: React.FC<DynamicPageRendererProps> = ({ page }) => {
  const { leads, tickets, campaigns, expenses, changeRequests, executeAction } = useStore();

  const getData = (source?: string) => {
    switch(source) {
      case 'leads': return leads;
      case 'tickets': return tickets;
      case 'campaigns': return campaigns;
      case 'expenses': return expenses;
      case 'changeRequests': return changeRequests;
      default: return [];
    }
  };

  const WidgetRenderer: React.FC<{ widget: PageWidget }> = ({ widget }) => {
    const data = getData(widget.dataSource);
    
    // Default Colors
    const COLORS = ['#f43f5e', '#a855f7', '#3b82f6', '#f59e0b', '#10b981'];

    if (widget.type === 'header') {
      return (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <Layers className="text-amber-500" /> {widget.title}
           </h2>
           <p className="text-slate-400 mt-1">Dynamic Module ID: {page.id}</p>
        </div>
      );
    }

    if (widget.type === 'form') {
        const [formData, setFormData] = useState<any>({});
        const [status, setStatus] = useState<'idle'|'submitting'|'success'>('idle');
        const fields = widget.config?.fields || [];
        const action = widget.config?.action;

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!action) return;
            setStatus('submitting');
            try {
                await executeAction(action, formData);
                setStatus('success');
                setFormData({});
                setTimeout(() => setStatus('idle'), 3000);
            } catch (e) {
                console.error(e);
                setStatus('idle');
            }
        };

        return (
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col h-full">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Box size={16}/> {widget.title}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                    {fields.map((field: any) => (
                        <div key={field.name}>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{field.label}</label>
                            {field.type === 'select' ? (
                                <select
                                    value={formData[field.name] || ''}
                                    onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200"
                                >
                                    <option value="">Select...</option>
                                    {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <input 
                                    type={field.type || 'text'}
                                    value={formData[field.name] || ''}
                                    onChange={e => setFormData({...formData, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                />
                            )}
                        </div>
                    ))}
                    <button disabled={status === 'submitting'} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center justify-center gap-2 mt-4">
                        {status === 'submitting' ? 'Saving...' : status === 'success' ? <><CheckCircle size={16}/> Saved</> : <><Send size={16}/> Submit Data</>}
                    </button>
                </form>
            </div>
        );
    }

    if (widget.type === 'statCard') {
       const value = data.length; 
       const displayValue = widget.config?.field 
          ? data.reduce((acc: number, item: any) => acc + (Number(item[widget.config.field]) || 0), 0)
          : value;

       return (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">{widget.title}</p>
                   <h3 className="text-3xl font-bold text-slate-100 mt-2">
                      {widget.config?.prefix}{displayValue.toLocaleString()}
                   </h3>
                </div>
                <div className="p-3 bg-slate-800 rounded-full text-blue-400">
                   <Activity size={20} />
                </div>
             </div>
          </div>
       );
    }

    if (widget.type === 'chart') {
       const chartType = widget.config?.chartType || 'bar';
       const chartData = data.slice(0, 10).map((item: any) => ({
           name: item.name || item.title || item.description || item.id,
           value: item.value || item.budget || item.amount || 1
       }));

       return (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-80 flex flex-col">
             <h3 className="text-lg font-bold text-slate-200 mb-4">{widget.title}</h3>
             <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                   {chartType === 'pie' ? (
                       <PieChart>
                          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                             {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                       </PieChart>
                   ) : (
                       <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} cursor={{fill: '#1e293b'}} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                       </BarChart>
                   )}
                </ResponsiveContainer>
             </div>
          </div>
       );
    }

    if (widget.type === 'table') {
        const headers = widget.config?.headers || ['id', 'name', 'status'];
        return (
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col h-full">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Table size={16}/> {widget.title}</h3>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-800/50 sticky top-0">
                            <tr>
                                {headers.map((h: string) => <th key={h} className="px-3 py-2">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-800/30">
                                    {headers.map((h: string) => (
                                        <td key={h} className="px-3 py-2 text-slate-300">
                                            {typeof item[h] === 'object' ? JSON.stringify(item[h]) : item[h]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return <div className="p-4 border border-dashed border-slate-700 text-slate-500">Unknown Widget Type</div>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {page.widgets.map(widget => (
               <div key={widget.id} className={`${widget.gridColSpan === 3 ? 'col-span-1 md:col-span-2 lg:col-span-3' : widget.gridColSpan === 2 ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}>
                   <WidgetRenderer widget={widget} />
               </div>
           ))}
       </div>
    </div>
  );
};

export default DynamicPageRenderer;