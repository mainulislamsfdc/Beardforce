import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Users, Trash2, UserPlus, Shield, Key } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { users, addNewUser, removeUser, user: currentUser } = useStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await addNewUser(email, role);
    setEmail('');
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Users size={28} className="text-blue-400"/> User Management
        </h2>
        <p className="text-slate-400 mt-2">Grant access to new team members.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><UserPlus size={18}/> Invite User</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                      <input 
                         type="email" 
                         value={email}
                         onChange={e => setEmail(e.target.value)}
                         className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                         placeholder="colleague@company.com"
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                      <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setRole('admin')}
                            className={`flex-1 py-2 text-xs font-bold rounded border ${role === 'admin' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-700 text-slate-500'}`}
                          >
                            Admin
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setRole('viewer')}
                            className={`flex-1 py-2 text-xs font-bold rounded border ${role === 'viewer' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-700 text-slate-500'}`}
                          >
                            Viewer
                          </button>
                      </div>
                  </div>
                  <button disabled={loading || !email} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors disabled:opacity-50">
                      {loading ? 'Adding...' : 'Add User'}
                  </button>
              </form>
          </div>

          {/* User List */}
          <div className="md:col-span-2 space-y-4">
              {users.map(u => (
                  <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${u.role === 'admin' ? 'bg-purple-900/50 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                              {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <p className="font-bold text-slate-200">{u.name}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">{u.email}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                              {u.role}
                          </span>
                          {u.id !== currentUser?.id && u.email !== 'admin@test.com' && (
                              <button onClick={() => removeUser(u.id)} className="p-2 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-500 transition-colors">
                                  <Trash2 size={16}/>
                              </button>
                          )}
                      </div>
                  </div>
              ))}
              {users.length === 0 && <p className="text-slate-500 text-center italic">No additional users found.</p>}
          </div>
      </div>
    </div>
  );
};

export default UserManagement;