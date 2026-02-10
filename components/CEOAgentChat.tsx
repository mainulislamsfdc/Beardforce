import React, { useState, useEffect, useRef } from 'react';
import { Send, Crown, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { CEOAgent } from '../services/agents/tools/CEOAgent';
import { databaseService, initializeDatabase } from '../services/database';
import { useAuth } from '../context/AuthContext';
import { useAgentConfig } from '../context/AgentConfigContext';
import { useBranding } from '../context/BrandingContext';

interface Message {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

const capabilities = [
  { name: 'Executive Dashboard', command: 'Generate the executive dashboard with all KPIs', desc: 'Comprehensive KPIs & metrics' },
  { name: 'Agent Activity', command: 'Monitor the activity of all agents', desc: 'Track agent performance' },
  { name: 'Budget Review', command: 'Review current AI budget status with projections', desc: 'Spending & cost analysis' },
  { name: 'Coordinate Agents', command: 'Coordinate sales and marketing for a product launch', desc: 'Cross-agent workflows' },
  { name: 'Set Goals & KPIs', command: 'Set Q1 goals and KPIs for the sales team', desc: 'Organizational goal setting' },
  { name: 'Approve Decision', command: 'Review and approve pending major decisions', desc: 'Approval workflow management' },
  { name: 'System Health', command: 'Perform a comprehensive system health check', desc: 'Full system diagnostics' },
  { name: 'Strategic Report', command: 'Generate a monthly strategic report', desc: 'Insights & recommendations' },
  { name: 'Allocate Resources', command: 'Allocate budget across departments for Q1', desc: 'Resource management' },
  { name: 'Performance Analytics', command: 'Analyze performance trends across all departments', desc: 'Predictive insights' },
];

export const CEOAgentChat: React.FC = () => {
  const { user } = useAuth();
  const { getAgent } = useAgentConfig();
  const { branding } = useBranding();
  const agentCfg = getAgent('ceo');
  const agentLabel = agentCfg.custom_name + ' Agent';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const agentRef = useRef<CEOAgent | null>(null);

  useEffect(() => {
    agentRef.current = new CEOAgent({
      agentName: agentCfg.custom_name,
      orgName: branding.app_name,
      personality: agentCfg.personality_prompt || undefined
    });
  }, [agentCfg.custom_name, branding.app_name, agentCfg.personality_prompt]);

  useEffect(() => {
    const initDB = async () => {
      if (user?.id && !dbInitialized) {
        try {
          await initializeDatabase(user.id);
          setDbInitialized(true);
        } catch (error) {
          console.error('Database connection failed:', error);
        }
      }
    };
    initDB();
  }, [user, dbInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      if (!agentRef.current) agentRef.current = new CEOAgent();
      const response = await agentRef.current.chat(input);
      setMessages(prev => [...prev, { role: 'agent', content: response, timestamp: new Date() }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'agent', content: `Error: ${error.message}`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCapabilityClick = (command: string) => {
    setInput(command);
    setShowCapabilities(false);
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header with Capabilities Dropdown */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 rounded-lg">
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{agentLabel}</h1>
              <p className="text-xs text-gray-400">Strategy, oversight & coordination</p>
            </div>
          </div>
          <button
            onClick={() => setShowCapabilities(!showCapabilities)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-amber-400 rounded-lg text-sm font-medium hover:bg-gray-600 transition border border-gray-600"
          >
            {capabilities.length} Capabilities
            {showCapabilities ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showCapabilities && (
          <div className="border-t border-gray-700 p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {capabilities.map((cap, i) => (
                <button
                  key={i}
                  onClick={() => handleCapabilityClick(cap.command)}
                  className="flex flex-col text-left p-2.5 bg-gray-700 rounded-lg hover:bg-gray-600 transition border border-gray-600"
                >
                  <span className="text-sm font-medium text-amber-400">{cap.name}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{cap.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 p-5 rounded-full mb-4 shadow-xl">
              <Crown size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{agentLabel} Ready</h2>
            <p className="text-base text-gray-400 mb-4">Executive dashboards, strategy, budgets and agent coordination</p>
            <p className="text-sm text-gray-500">Click "Capabilities" above to see all available tools</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-2xl px-6 py-4 shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-700 text-white ml-12'
                    : 'bg-gray-800 border border-gray-700 text-gray-100 mr-12'
                }`}>
                  <div className="flex items-start gap-3">
                    {message.role === 'agent' && <Crown className="flex-shrink-0 mt-1 text-amber-400" size={20} />}
                    <div className="flex-1">
                      <div className="text-sm font-semibold mb-2 opacity-80">
                        {message.role === 'user' ? 'You' : agentLabel}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Thinking Banner */}
      {loading && (
        <div className="px-4 py-2 bg-amber-900 bg-opacity-30 border-t border-amber-800">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <Loader2 size={18} className="text-amber-400 animate-spin" />
            <span className="text-sm text-amber-300 font-medium">{agentLabel} is thinking...</span>
            <div className="flex gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-700 bg-gray-800 p-4">
        <div className="max-w-5xl mx-auto flex gap-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={loading ? 'Please wait...' : 'Ask for dashboards, reports, budgets, coordination...'}
            disabled={loading}
            className={`flex-1 px-5 py-3 border border-gray-600 rounded-lg text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-700 text-white rounded-lg font-semibold hover:from-amber-700 hover:via-yellow-700 hover:to-orange-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default CEOAgentChat;
