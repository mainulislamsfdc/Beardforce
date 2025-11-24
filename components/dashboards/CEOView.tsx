import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck, AlertCircle, Wallet } from 'lucide-react';

const CEOView: React.FC = () => {
  const { expenses, logs } = useStore();

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const pendingApprovals = expenses.filter(e => !e.approved).length;

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-purple-900/20">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Total Expenses</p>
                   <h3 className="text-3xl font-bold text-slate-100 mt-2">${totalExpenses.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-slate-800 rounded-full text-slate-400"><Wallet size={24} /></div>
             </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-400 text-sm font-medium">Pending Approvals</p>
                   <h3 className="text-3xl font-bold text-amber-400 mt-2">{pendingApprovals}</h3>
                </div>
                <div className="p-3 bg-slate-800 rounded-full text-amber-500"><AlertCircle size={24} /></div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Table */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-purple-400"/> Expense Approvals
              </h3>
              <div className="space-y-3">
                  {expenses.map(exp => (
                      <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded border border-slate-700/50">
                          <div>
                              <p className="text-sm font-medium text-slate-200">{exp.description}</p>
                              <p className="text-xs text-slate-500">{exp.category} &bull; {exp.date}</p>
                          </div>
                          <div className="text-right">
                              <p className="font-bold text-slate-200">${exp.amount}</p>
                              {exp.approved ? (
                                  <span className="text-[10px] text-green-500">Approved</span>
                              ) : (
                                  <button className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded mt-1">
                                      Approve
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* System Audit Log */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h3 className="text-lg font-bold text-slate-200 mb-4">Executive Audit Log</h3>
              <div className="space-y-0 relative border-l border-slate-700 ml-2">
                  {logs.slice(0, 8).map(log => (
                      <div key={log.id} className="mb-4 ml-4">
                          <div className="absolute w-2 h-2 bg-slate-600 rounded-full -left-[5px] mt-1.5 border border-slate-900"></div>
                          <p className="text-sm text-slate-300">{log.action}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="font-semibold text-slate-400">{log.agent}</span> &bull; {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                      </div>
                  ))}
              </div>
          </div>
       </div>
    </div>
  );
};

export default CEOView;
