import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Users, Trash2, UserPlus, Key, RefreshCw, Copy, Check } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { users, addNewUser, removeUser, resetUserPassword, user: currentUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{email: string, link: string, code: string} | null>(null);

  const generatePassword = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
      let pass = "";
      for(let i=0; i<10; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPassword(pass);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Use default '123' if not provided
    await addNewUser(email, role, password || '123');
    setEmail('');
    setPassword('');
    setLoading(false);
  };

  const handleReset = async (userEmail: string) => {
      if(!confirm(`Send password reset link to ${userEmail}?`)) return;
      const link = await resetUserPassword(userEmail);
      const code = link.split('=')[1];
      setResetMsg({ email: userEmail, link, code });
      setTimeout(() => setResetMsg(null), 10000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      {resetMsg && (
          <div className="absolute top-0 right-0 left-0 bg-green-500/10 border border-green-500/50 rounded-lg p-4 z-10 animate-fade-in shadow-xl backdrop-blur-md">
              <div className="flex items-start gap-3">
                  <Check className="text-green-500 mt-1" size={20} />
                  <div>
                      <h4 className="font-bold text-green-400">Reset Link Sent</h4>
                      <p className="text-sm text-slate-300">An email has been simulated to <b>{resetMsg.email}</b>.</p>
                      <div className="mt-2 bg-slate-900 p-2 rounded border border-slate-700 font-mono text-xs text-slate-400">
                          Link: {resetMsg.link}<br/>
                          <span className="text-amber-500 font-bold">New Temporary Password: {resetMsg.code}</span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Users size={28} className="text-blue-400"/> User Management
        </h2>
        <p className="text-slate-400 mt-2">Grant access to new team members and manage credentials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit sticky top-4">
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
                         required
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Default Password</label>
                      <div className="flex gap-2">
                          <input 
                             type="text" 
                             value={password}
                             onChange={e => setPassword(e.target.value)}
                             className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-blue-500 outline-none font-mono"
                             placeholder="Leave empty for '123'"
                          />
                          <button 
                            type="button" 
                            onClick={generatePassword}
                            title="Generate Random"
                            className="p-2 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-amber-500"
                          >
                             <RefreshCw size={16} />
                          </button>
                      </div>
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
                  <button disabled={loading || !email} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors disabled:opacity-50 shadow-lg shadow-blue-900/20">
                      {loading ? 'Adding...' : 'Add User'}
                  </button>
              </form>
          </div>

          {/* User List */}
          <div className="md:col-span-2 space-y-4">
              {users.map(u => (
                  <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between group hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${u.role === 'admin' ? 'bg-purple-900/50 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                              {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <p className="font-bold text-slate-200">{u.name}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">{u.email}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border mr-2 ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                              {u.role}
                          </span>
                          
                          <button 
                             onClick={() => handleReset(u.email)}
                             className="p-2 hover:bg-amber-500/20 rounded text-slate-600 hover:text-amber-500 transition-colors"
                             title="Reset Password"
                          >
                              <Key size={16}/>
                          </button>

                          {u.id !== currentUser?.id && u.email !== 'admin@test.com' && (
                              <button 
                                 onClick={() => removeUser(u.id)} 
                                 className="p-2 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-500 transition-colors"
                                 title="Revoke Access"
                              >
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