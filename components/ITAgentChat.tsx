import React, { useState, useRef, useEffect } from 'react';
import { Send, Database, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { ITAgent } from '../services/agents/tools/ITAgent';
import { databaseService, initializeDatabase } from '../services/database';
import { useAuth } from '../context/AuthContext';
import { useAgentConfig } from '../context/AgentConfigContext';
import { useBranding } from '../context/BrandingContext';

const capabilities = [
  { name: 'Show All Records', command: 'Show all leads', desc: 'View all records from any table' },
  { name: 'Insert Record', command: 'Insert a new lead named John with email john@test.com', desc: 'Add new records to any table' },
  { name: 'List Tables', command: 'List all tables in the database', desc: 'Show all available database tables' },
  { name: 'Table Schema', command: 'Show me the schema for the leads table', desc: 'View structure/columns of a table' },
  { name: 'Search Records', command: 'Search leads for John', desc: 'Search records by keyword' },
  { name: 'Analyze Table', command: 'Analyze the leads table', desc: 'Get table statistics and insights' },
  { name: 'Create Table', command: 'Create a new table called tasks', desc: 'Create new database tables' },
  { name: 'Add Column', command: 'Add a priority column to the leads table', desc: 'Add columns to existing tables' },
  { name: 'Generate Component', command: 'Create a new dashboard widget component called CustomerCard', desc: 'Generate React + TypeScript components' },
  { name: 'Generate Workflow', command: 'Create an automation workflow for lead follow-ups', desc: 'Build automation workflow code' },
  { name: 'Code Snippets', command: 'Show all saved code snippets', desc: 'View previously generated code' },
  { name: 'Create Restore Point', command: 'Create a restore point called Before Changes', desc: 'Snapshot all CRM data for rollback' },
  { name: 'List Restore Points', command: 'Show all restore points', desc: 'View available system snapshots' },
  { name: 'Performance Report', command: 'Generate a database performance report', desc: 'Database-wide performance analysis' },
];

export const ITAgentChat: React.FC = () => {
  const { getAgent } = useAgentConfig();
  const agentCfg = getAgent('it');
  const agentLabel = agentCfg.custom_name + ' Agent';
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { branding } = useBranding();
  const agentRef = useRef<ITAgent | null>(null);

  useEffect(() => {
    agentRef.current = new ITAgent(import.meta.env.VITE_GEMINI_API_KEY, databaseService, {
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
          setMessages([{ role: 'agent', text: 'Failed to connect to database. Please check your Supabase configuration.' }]);
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
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);
    try {
      if (!agentRef.current) agentRef.current = new ITAgent(import.meta.env.VITE_GEMINI_API_KEY, databaseService);
      const response = await agentRef.current.chat(userMessage);
      setMessages(prev => [...prev, { role: 'agent', text: response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'agent', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCapabilityClick = (command: string) => {
    setInput(command);
    setShowCapabilities(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header with Capabilities Dropdown */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{agentLabel}</h1>
              <p className="text-xs text-gray-400">Database & infrastructure management</p>
            </div>
          </div>
          <button
            onClick={() => setShowCapabilities(!showCapabilities)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-blue-400 rounded-lg text-sm font-medium hover:bg-gray-600 transition border border-gray-600"
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
                  <span className="text-sm font-medium text-blue-400">{cap.name}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{cap.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-full inline-block mb-4 shadow-xl">
              <Database size={48} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">{agentLabel} Ready</p>
            <p className="text-base text-gray-400 mb-4">Manage database schemas, create tables, insert records, or analyze performance</p>
            <p className="text-sm text-gray-500">Click "Capabilities" above to see all available tools, or start typing below</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl rounded-2xl px-6 py-4 shadow-md ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-12'
                : 'bg-gray-800 border border-gray-700 text-gray-100 mr-12'
            }`}>
              <div className="flex items-start gap-3">
                {msg.role === 'agent' && <Database className="flex-shrink-0 mt-1 text-blue-400" size={20} />}
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-2 opacity-80">
                    {msg.role === 'user' ? 'You' : agentCfg.custom_name}
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Thinking Banner */}
      {loading && (
        <div className="px-4 py-2 bg-blue-900 bg-opacity-30 border-t border-blue-800">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <Loader2 size={18} className="text-blue-400 animate-spin" />
            <span className="text-sm text-blue-300 font-medium">{agentCfg.custom_name} is thinking...</span>
            <div className="flex gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-700 bg-gray-800 p-4">
        <div className="flex gap-3 max-w-5xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={loading ? 'Please wait...' : `Ask ${agentCfg.custom_name} to help with database tasks...`}
            className={`flex-1 px-5 py-3 border border-gray-600 rounded-lg text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg flex items-center gap-2"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ITAgentChat;
