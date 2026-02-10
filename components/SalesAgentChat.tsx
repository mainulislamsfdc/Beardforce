import React, { useState, useEffect, useRef } from 'react';
import { Send, TrendingUp, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { SalesAgent } from '../services/agents/tools/SalesAgent';
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
  { name: 'Create Lead', command: 'Create a new lead named John Smith with email john@company.com', desc: 'Add new prospects to the CRM' },
  { name: 'View All Leads', command: 'Show me all leads in the CRM', desc: 'List all leads with details' },
  { name: 'Qualify Lead', command: 'Qualify and score all unqualified leads', desc: 'Score leads 0-100 based on data' },
  { name: 'Create Opportunity', command: 'Create a new opportunity from a qualified lead', desc: 'Convert leads to opportunities' },
  { name: 'View Pipeline', command: 'Show the current sales pipeline', desc: 'View all pipeline stages' },
  { name: 'Update Deal Stage', command: 'Move opportunity to negotiation stage', desc: 'Advance deals through stages' },
  { name: 'Revenue Forecast', command: 'Generate a revenue forecast for this month', desc: 'Predict sales performance' },
  { name: 'Schedule Follow-up', command: 'Schedule a follow-up for my top leads', desc: 'Plan next touchpoints' },
  { name: 'Draft Email', command: 'Draft a follow-up email for a qualified lead', desc: 'Generate professional emails' },
  { name: 'Create Quote', command: 'Create a price quote for our premium plan', desc: 'Generate price quotes' },
  { name: 'Track Deal', command: 'Track the progress of my latest deal', desc: 'Detailed deal tracking' },
  { name: 'Revenue Report', command: 'Generate a comprehensive revenue report', desc: 'Won deals and trend analysis' },
];

export const SalesAgentChat: React.FC = () => {
  const { user } = useAuth();
  const { getAgent } = useAgentConfig();
  const { branding } = useBranding();
  const agentCfg = getAgent('sales');
  const agentLabel = agentCfg.custom_name + ' Agent';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const agentRef = useRef<SalesAgent | null>(null);

  useEffect(() => {
    agentRef.current = new SalesAgent({
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
      if (!agentRef.current) agentRef.current = new SalesAgent();
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
            <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{agentLabel}</h1>
              <p className="text-xs text-gray-400">Pipeline, revenue & lead management</p>
            </div>
          </div>
          <button
            onClick={() => setShowCapabilities(!showCapabilities)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-green-400 rounded-lg text-sm font-medium hover:bg-gray-600 transition border border-gray-600"
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
                  <span className="text-sm font-medium text-green-400">{cap.name}</span>
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
            <div className="bg-gradient-to-br from-green-500 to-blue-600 p-5 rounded-full mb-4 shadow-xl">
              <TrendingUp size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{agentLabel} Ready</h2>
            <p className="text-base text-gray-400 mb-4">Manage leads, pipeline, forecasts, quotes and reports</p>
            <p className="text-sm text-gray-500">Click "Capabilities" above to see all available tools</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-2xl px-6 py-4 shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-12'
                    : 'bg-gray-800 border border-gray-700 text-gray-100 mr-12'
                }`}>
                  <div className="flex items-start gap-3">
                    {message.role === 'agent' && <TrendingUp className="flex-shrink-0 mt-1 text-green-400" size={20} />}
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
        <div className="px-4 py-2 bg-green-900 bg-opacity-30 border-t border-green-800">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <Loader2 size={18} className="text-green-400 animate-spin" />
            <span className="text-sm text-green-300 font-medium">{agentLabel} is thinking...</span>
            <div className="flex gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
            placeholder={loading ? 'Please wait...' : 'Ask about leads, pipeline, forecasts, quotes...'}
            disabled={loading}
            className={`flex-1 px-5 py-3 border border-gray-600 rounded-lg text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-br from-green-600 to-blue-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesAgentChat;
