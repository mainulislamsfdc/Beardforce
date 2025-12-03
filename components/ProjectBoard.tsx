import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Ticket, TicketStatus } from '../types';
import { CheckCircle2, Circle, Clock, GitPullRequest, LayoutList } from 'lucide-react';

const ProjectBoard: React.FC = () => {
  const { tickets, changeRequests, updateChangeRequestStatus } = useStore();
  const [view, setView] = useState<'tickets' | 'changes'>('tickets');

  const getTicketsByStatus = (status: TicketStatus) => tickets.filter(t => t.status === status);

  const Column = ({ title, status, icon: Icon, color }: { title: string, status: TicketStatus, icon: any, color: string }) => (
    <div className="flex-1 min-w-[300px] bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col">
      <div className={`p-4 border-b border-slate-800 flex items-center gap-2 ${color}`}>
        <Icon size={18} />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
        <span className="ml-auto bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">
          {getTicketsByStatus(status).length}
        </span>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
        {getTicketsByStatus(status).map(ticket => (
          <div key={ticket.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors shadow-sm group">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-slate-200 text-sm">{ticket.title}</h4>
              <span className="text-[10px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">#{ticket.id}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{ticket.description}</p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
               <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded-full">{ticket.assignee}</span>
               <span className="text-[10px] text-slate-500">{ticket.createdAt}</span>
            </div>
          </div>
        ))}
        {getTicketsByStatus(status).length === 0 && (
            <div className="text-center py-10 text-slate-600 text-xs border-2 border-dashed border-slate-800 rounded-lg">
                No tickets in this column
            </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold text-slate-100">Project Management</h2>
            <p className="text-slate-400 text-sm">Track development and change requests managed by the IT Manager.</p>
        </div>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button onClick={() => setView('tickets')} className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 ${view === 'tickets' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}>
                <LayoutList size={16}/> Jira Board
            </button>
            <button onClick={() => setView('changes')} className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 ${view === 'changes' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}>
                <GitPullRequest size={16}/> Change Requests
            </button>
        </div>
      </div>
      
      {view === 'tickets' ? (
        <div className="flex gap-6 overflow-x-auto pb-4 h-full">
            <Column title="Backlog" status={TicketStatus.BACKLOG} icon={Circle} color="text-slate-400" />
            <Column title="In Progress" status={TicketStatus.IN_PROGRESS} icon={Clock} color="text-blue-400" />
            <Column title="Done" status={TicketStatus.DONE} icon={CheckCircle2} color="text-green-400" />
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                        <th className="p-4">Request ID</th>
                        <th className="p-4">Title</th>
                        <th className="p-4">Description</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                    {changeRequests.map(cr => (
                        <tr key={cr.id} className="hover:bg-slate-800/50">
                            <td className="p-4 font-mono text-xs text-slate-500">{cr.id}</td>
                            <td className="p-4 font-bold text-slate-200">{cr.title}</td>
                            <td className="p-4 text-slate-400">{cr.description}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    cr.status === 'Implemented' ? 'bg-green-500/10 text-green-500' : 
                                    cr.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 
                                    'bg-amber-500/10 text-amber-500'
                                }`}>
                                    {cr.status}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                {cr.status === 'Pending' && (
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => updateChangeRequestStatus(cr.id, 'Implemented')} className="text-green-500 hover:bg-green-500/10 px-2 py-1 rounded text-xs">Mark Implemented</button>
                                        <button onClick={() => updateChangeRequestStatus(cr.id, 'Rejected')} className="text-red-500 hover:bg-red-500/10 px-2 py-1 rounded text-xs">Reject</button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {changeRequests.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">No change requests logged.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default ProjectBoard;