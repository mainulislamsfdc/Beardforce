import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { useStore } from '../context/StoreContext';
import { Lock, Mail, Loader2, ArrowRight, UserPlus } from 'lucide-react';

const Auth: React.FC = () => {
  const { setUser } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
          const user = await DatabaseService.login(email, password);
          setUser(user);
      } else {
          const user = await DatabaseService.register(email, password);
          setUser(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 z-10">
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mx-auto mb-4 text-slate-900 font-bold text-2xl">B</div>
            <h1 className="text-2xl font-bold text-slate-100">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="text-slate-400 text-sm mt-2">{isLogin ? 'Sign in to your autonomous CRM dashboard.' : 'Initialize your admin credentials.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Email Address</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  placeholder="admin@beardforce.com"
                  required
                />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : <>{isLogin ? 'Enter Dashboard' : 'Register Admin'} {isLogin ? <ArrowRight size={20}/> : <UserPlus size={20}/>}</>}
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setIsLogin(!isLogin)} className="text-amber-500 cursor-pointer hover:underline font-bold">
                    {isLogin ? "Create One" : "Log In"}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;