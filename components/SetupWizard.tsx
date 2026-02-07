import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AgentRole, AppConfig } from '../types';
import { Building2, Users, CheckCircle, Database, Server, AlertCircle } from 'lucide-react';

const SetupWizard: React.FC = () => {
  const { updateConfig } = useStore();
  const [step, setStep] = useState(1);
  const [useFirebase, setUseFirebase] = useState(false);
  const [firebaseConfigStr, setFirebaseConfigStr] = useState('');
  const [configError, setConfigError] = useState('');

  const [formData, setFormData] = useState<AppConfig>({
    businessName: '',
    industry: '',
    agentNames: {
      [AgentRole.CEO]: 'The Chief',
      [AgentRole.SALES]: 'Sales Lead',
      [AgentRole.MARKETING]: 'Growth Lead',
      [AgentRole.IT]: 'Tech Lead',
      [AgentRole.USER]: 'You'
    },
    themeColor: 'amber'
  });

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);
  
  const handleFinish = async () => {
    let finalConfig = { ...formData };
    
    if (useFirebase && firebaseConfigStr) {
       try {
          const fbConfig = JSON.parse(firebaseConfigStr);
          finalConfig.firebaseConfig = fbConfig;
       } catch (e) {
          setConfigError("Invalid JSON configuration");
          return;
       }
    }

    await updateConfig(finalConfig);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
        
        {/* Progress */}
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-0"></div>
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= s ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
              {s}
            </div>
          ))}
        </div>

        {/* Steps */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100">Welcome to Your AI CRM</h2>
              <p className="text-slate-400">Let's set up your autonomous enterprise.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Business Name</label>
                <input 
                  type="text" 
                  value={formData.businessName}
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-amber-500 outline-none"
                  placeholder="e.g. BeardForce Global"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Industry</label>
                <input 
                  type="text" 
                  value={formData.industry}
                  onChange={e => setFormData({...formData, industry: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-amber-500 outline-none"
                  placeholder="e.g. Men's Grooming"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center justify-center gap-2"><Database size={24}/> Database Setup</h2>
              <p className="text-slate-400">Configure your persistent storage.</p>
            </div>
            
            <div className={`p-6 rounded-xl border transition-all cursor-pointer ${!useFirebase ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-800 border-slate-700'}`} onClick={() => setUseFirebase(false)}>
                <div className="flex items-start gap-3">
                    <CheckCircle className={!useFirebase ? "text-amber-500 mt-1" : "text-slate-500 mt-1"} size={20} />
                    <div>
                        <h4 className="font-bold text-slate-200">Local Browser Storage</h4>
                        <p className="text-sm text-slate-400">Quick start. Data stored on this device only.</p>
                    </div>
                </div>
            </div>

            <div className={`p-6 rounded-xl border transition-all ${useFirebase ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-800 border-slate-700'}`}>
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setUseFirebase(true)}>
                    <CheckCircle className={useFirebase ? "text-amber-500 mt-1" : "text-slate-500 mt-1"} size={20} />
                    <div>
                        <h4 className="font-bold text-slate-200">Firebase Cloud Database</h4>
                        <p className="text-sm text-slate-400">Enterprise grade. Remote access & real-time sync.</p>
                    </div>
                </div>
                
                {useFirebase && (
                    <div className="mt-4 animate-fade-in">
                        <label className="block text-xs font-bold text-slate-400 mb-1">Firebase Config JSON</label>
                        <textarea 
                            value={firebaseConfigStr}
                            onChange={(e) => {
                                setFirebaseConfigStr(e.target.value);
                                setConfigError('');
                            }}
                            className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-2 text-xs font-mono text-slate-300 focus:border-amber-500 outline-none"
                            placeholder='{ "apiKey": "...", "authDomain": "..." }'
                        />
                        {configError && <div className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {configError}</div>}
                        <p className="text-[10px] text-slate-500 mt-2">Copy this from Firebase Console {'>'} Project Settings {'>'} General {'>'} Your Apps</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center justify-center gap-2"><Users size={24}/> Meet The Team</h2>
              <p className="text-slate-400">Customize your AI agents' personas.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               {[AgentRole.CEO, AgentRole.SALES, AgentRole.MARKETING, AgentRole.IT].map(role => (
                 <div key={role}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{role}</label>
                    <input 
                      type="text"
                      value={formData.agentNames[role as AgentRole]}
                      onChange={e => setFormData({
                          ...formData, 
                          agentNames: { ...formData.agentNames, [role]: e.target.value }
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-amber-500 outline-none"
                    />
                 </div>
               ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fade-in text-center">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Ready to Launch</h2>
            <p className="text-slate-400">Your autonomous system is configured and ready to initialize.</p>
            <div className="bg-slate-800 p-4 rounded-lg text-sm text-left max-w-sm mx-auto">
                <p><span className="text-slate-500">Business:</span> {formData.businessName}</p>
                <p><span className="text-slate-500">CEO:</span> {formData.agentNames[AgentRole.CEO]}</p>
                <p><span className="text-slate-500">Database:</span> {useFirebase ? 'Firebase Cloud' : 'Local Secure Storage'}</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between mt-8">
            {step > 1 ? (
                <button onClick={handlePrev} className="text-slate-400 hover:text-white px-4 py-2">Back</button>
            ) : <div></div>}
            
            {step < 4 ? (
                <button 
                  onClick={handleNext} 
                  disabled={!formData.businessName}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Next Step
                </button>
            ) : (
                <button 
                  onClick={handleFinish} 
                  className="bg-green-600 hover:bg-green-500 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-green-900/50"
                >
                  Initialize System
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default SetupWizard;