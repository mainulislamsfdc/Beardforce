// ============================================================================
// 3. REACT COMPONENT FOR IT AGENT
// ============================================================================
// components/ITAgentChat.tsx

import React, { useState, useRef, useEffect } from 'react';
import { ITAgent } from '../services/agents/tools/ITAgent';
import { databaseService } from '../services/database';

export const ITAgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agent] = useState(() => new ITAgent(import.meta.env.VITE_GEMINI_API_KEY, databaseService));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await agent.chat(userMessage);
      setMessages(prev => [...prev, { role: 'agent', text: response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'agent', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const quickCommands = [
    'List all tables',
    'Show me the leads table schema',
    'Analyze the performance of all tables',
    'Add a new field called "beard_style_preference" to the leads table',
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-bold">🔧 IT Manager Agent</h1>
        <p className="text-sm text-blue-100">Database management and technical support</p>
      </div>

      {/* Quick Commands */}
      <div className="p-4 bg-white border-b">
        <p className="text-sm text-gray-600 mb-2">Quick commands:</p>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => setInput(cmd)}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">🔧</div>
            <p className="text-lg font-semibold">IT Manager Agent Ready</p>
            <p className="text-sm">Ask me to manage database schemas, create tables, add fields, or analyze performance</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl rounded-lg p-4 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white shadow border border-gray-200'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">{msg.role === 'user' ? '👤' : '🔧'}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">
                    {msg.role === 'user' ? 'You' : 'IT Manager'}
                  </p>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔧</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask IT Manager to help with database tasks..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};