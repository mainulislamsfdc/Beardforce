import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { initializeDatabase } from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { useAgentConfig } from '../../context/AgentConfigContext';
import { useBranding } from '../../context/BrandingContext';
import { AGENT_REGISTRY } from './agentRegistry';
import { createAgent, type AgentInstance } from './createAgent';
import type { AgentId } from '../../types';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface AgentChatPanelProps {
  agentId: AgentId;
}

const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ agentId }) => {
  const visual = AGENT_REGISTRY[agentId];
  const Icon = visual.icon;

  const { user } = useAuth();
  const { getAgent } = useAgentConfig();
  const { branding } = useBranding();
  const agentCfg = getAgent(agentId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const agentRef = useRef<AgentInstance | null>(null);

  // Create agent instance
  useEffect(() => {
    agentRef.current = createAgent(agentId, {
      agentName: agentCfg.custom_name,
      orgName: branding.app_name,
      personality: agentCfg.personality_prompt || undefined,
    });
  }, [agentId, agentCfg.custom_name, branding.app_name, agentCfg.personality_prompt]);

  // Initialize database
  useEffect(() => {
    const initDB = async () => {
      if (user?.id && !dbInitialized) {
        try {
          await initializeDatabase(user.id);
          setDbInitialized(true);
        } catch (error) {
          console.error('Database connection failed:', error);
          setMessages([{
            role: 'agent',
            content: 'Failed to connect to database. Please check your Supabase configuration.',
            timestamp: new Date(),
          }]);
        }
      }
    };
    initDB();
  }, [user?.id, dbInitialized]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when done loading
  useEffect(() => {
    if (!loading && inputRef.current) inputRef.current.focus();
  }, [loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);
    try {
      const response = await agentRef.current!.chat(userMessage);
      setMessages(prev => [...prev, { role: 'agent', content: response, timestamp: new Date() }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: `Error: ${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCapabilityClick = (command: string) => {
    setInput(command);
    setShowCapabilities(false);
    inputRef.current?.focus();
  };

  const agentLabel = agentCfg.custom_name + ' Agent';

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className={`bg-gradient-to-r ${visual.gradient} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Icon size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{agentLabel}</h2>
              <p className="text-white/70 text-xs">{visual.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCapabilities(!showCapabilities)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition text-white text-sm"
          >
            {visual.capabilities.length} capabilities
            {showCapabilities ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Capabilities dropdown */}
        {showCapabilities && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {visual.capabilities.map((cap) => (
              <button
                key={cap.name}
                onClick={() => handleCapabilityClick(cap.command)}
                className="text-left p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                <div className="text-white text-xs font-semibold">{cap.name}</div>
                <div className="text-white/60 text-[10px] mt-0.5">{cap.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className={`w-16 h-16 bg-gradient-to-br ${visual.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
              <Icon size={32} className="text-white" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-1">{agentLabel}</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              {visual.description}. Type a message or pick a capability above to get started.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'agent' && (
              <div className={`w-8 h-8 ${visual.bgColor} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                <Icon size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? `bg-gradient-to-br ${visual.userBubbleGradient} text-white`
                  : 'bg-gray-800 border border-gray-700 text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className="text-[10px] mt-1.5 opacity-50">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${visual.thinkingBg}`}>
            <Loader2 size={14} className={`${visual.accentColor} animate-spin`} />
            <span className={`${visual.accentColor} text-sm`}>{agentCfg.custom_name} is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 bg-gray-800 p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={loading ? `${agentCfg.custom_name} is thinking...` : visual.placeholder}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 ${visual.ringColor} disabled:opacity-60`}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={`p-2.5 bg-gradient-to-r ${visual.gradient} text-white rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentChatPanel;
