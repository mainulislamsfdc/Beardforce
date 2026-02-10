import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Send, Users, Crown, TrendingUp, Megaphone, Database,
  PhoneOff, MessageCircle, Loader2, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAgentConfig } from '../context/AgentConfigContext';
import { useBranding } from '../context/BrandingContext';
import { databaseService, initializeDatabase } from '../services/database';
import {
  meetingOrchestrator,
  AGENT_PARTICIPANTS,
  buildAgentParticipants,
  type MeetingMessage,
  type AgentParticipant,
} from '../services/agents/MeetingOrchestrator';

const AGENT_ICONS: Record<string, any> = {
  ceo: Crown,
  sales: TrendingUp,
  marketing: Megaphone,
  it: Database,
};

const AGENT_COLORS: Record<string, string> = {
  ceo: 'bg-amber-600',
  sales: 'bg-green-600',
  marketing: 'bg-purple-600',
  it: 'bg-blue-600',
};

const AGENT_BORDER_COLORS: Record<string, string> = {
  ceo: 'border-amber-500',
  sales: 'border-green-500',
  marketing: 'border-purple-500',
  it: 'border-blue-500',
};

const AGENT_TEXT_COLORS: Record<string, string> = {
  ceo: 'text-amber-400',
  sales: 'text-green-400',
  marketing: 'text-purple-400',
  it: 'text-blue-400',
};

const TeamsMeetingRoom: React.FC = () => {
  const { user } = useAuth();
  const { agents: agentConfigs } = useAgentConfig();
  const { branding } = useBranding();
  const participants = buildAgentParticipants(agentConfigs);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [input, setInput] = useState('');
  const [inMeeting, setInMeeting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'thinking' | 'speaking'>>({
    ceo: 'idle', sales: 'idle', marketing: 'idle', it: 'idle',
  });
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['ceo', 'sales', 'marketing', 'it']);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize database & speech
  useEffect(() => {
    const init = async () => {
      if (user?.id && !dbInitialized) {
        try {
          await initializeDatabase(user.id);
          meetingOrchestrator.initialize(databaseService, agentConfigs, branding.app_name);
          setDbInitialized(true);
        } catch (e) {
          console.error('DB init failed:', e);
        }
      }
    };
    init();

    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (e: any) => {
        const t = e.results[e.resultIndex][0].transcript;
        setTranscript(t);
        if (e.results[e.resultIndex].isFinal) {
          setInput(t);
          setTranscript('');
          setIsListening(false);
        }
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [user?.id, dbInitialized]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = useCallback((text: string, agentId: string) => {
    if (!synthRef.current || !speechEnabled) return;
    synthRef.current.cancel();
    const config = participants.find(a => a.id === agentId)?.voiceConfig;
    if (!config) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    utterance.volume = config.volume;
    const voices = synthRef.current.getVoices();
    const pref = voices.find(v => v.name.includes(config.voiceName || ''));
    if (pref) utterance.voice = pref;
    utterance.onstart = () => setAgentStatuses(s => ({ ...s, [agentId]: 'speaking' }));
    utterance.onend = () => setAgentStatuses(s => ({ ...s, [agentId]: 'idle' }));
    synthRef.current.speak(utterance);
  }, [speechEnabled]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isProcessing || selectedAgents.length === 0) return;
    setInput('');
    setIsProcessing(true);

    const userMsg: MeetingMessage = {
      id: `msg-${Date.now()}-user`,
      agentId: 'user',
      agentName: 'You',
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    const onStatus = (agentId: string, status: 'thinking' | 'speaking' | 'idle') => {
      setAgentStatuses(s => ({ ...s, [agentId]: status }));
    };

    try {
      for await (const response of meetingOrchestrator.askAgents(msg, selectedAgents, onStatus)) {
        setMessages(prev => [...prev, response]);
        if (speechEnabled) speak(response.content, response.agentId);
      }
    } catch (e: any) {
      console.error('Meeting error:', e);
    } finally {
      setIsProcessing(false);
      setAgentStatuses({ ceo: 'idle', sales: 'idle', marketing: 'idle', it: 'idle' });
      inputRef.current?.focus();
    }
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const startMeeting = () => {
    setInMeeting(true);
    meetingOrchestrator.clearTranscript();
    setMessages([{
      id: 'system-start',
      agentId: 'system',
      agentName: 'System',
      role: 'system',
      content: `Meeting started with ${selectedAgents.map(id => participants.find(a => a.id === id)?.name).join(', ')}. Type a message or use voice to begin.`,
      timestamp: new Date(),
    }]);
    inputRef.current?.focus();
  };

  const endMeeting = () => {
    setInMeeting(false);
    synthRef.current?.cancel();
    setMessages([]);
    setAgentStatuses({ ceo: 'idle', sales: 'idle', marketing: 'idle', it: 'idle' });
  };

  // Pre-meeting lobby
  if (!inMeeting) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl mb-4">
                <Users size={48} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Teams Meeting Room</h1>
              <p className="text-gray-400">Start a meeting with your AI team. All agents hear each other and collaborate.</p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Select Participants</h2>
              <div className="grid grid-cols-2 gap-3">
                {participants.map(agent => {
                  const Icon = AGENT_ICONS[agent.id];
                  const selected = selectedAgents.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${
                        selected
                          ? `${AGENT_BORDER_COLORS[agent.id]} bg-gray-700`
                          : 'border-gray-700 bg-gray-800 opacity-50 hover:opacity-75'
                      }`}
                    >
                      <div className={`w-10 h-10 ${AGENT_COLORS[agent.id]} rounded-full flex items-center justify-center`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{agent.name}</p>
                        <p className="text-xs text-gray-400">{agent.title}</p>
                      </div>
                      {selected && <CheckCircle2 size={18} className={`ml-auto ${AGENT_TEXT_COLORS[agent.id]}`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={startMeeting}
              disabled={selectedAgents.length === 0}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg"
            >
              Start Meeting ({selectedAgents.length} participant{selectedAgents.length !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Meeting header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-semibold">Meeting in Progress</span>
        </div>

        {/* Agent status pills */}
        <div className="flex items-center gap-2 ml-4">
          {selectedAgents.map(id => {
            const agent = participants.find(a => a.id === id)!;
            const Icon = AGENT_ICONS[id];
            const status = agentStatuses[id];
            return (
              <div
                key={id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  status === 'thinking'
                    ? 'border-yellow-500/50 bg-yellow-900/30 text-yellow-300'
                    : status === 'speaking'
                    ? `${AGENT_BORDER_COLORS[id]} bg-gray-700 ${AGENT_TEXT_COLORS[id]}`
                    : 'border-gray-600 bg-gray-700 text-gray-400'
                }`}
              >
                <Icon size={12} />
                {agent.name.split(' ')[0]}
                {status === 'thinking' && <Loader2 size={10} className="animate-spin" />}
                {status === 'speaking' && <Volume2 size={10} className="animate-pulse" />}
              </div>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-2 rounded-lg transition ${speechEnabled ? 'text-green-400 bg-green-900/30' : 'text-gray-400 bg-gray-700'}`}
            title={speechEnabled ? 'Voice on' : 'Voice off'}
          >
            {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={endMeeting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            <PhoneOff size={16} />
            End
          </button>
        </div>
      </div>

      {/* Agent grid + chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent grid (left) */}
        <div className="w-72 border-r border-gray-700 bg-gray-800 p-3 flex flex-col gap-3 overflow-y-auto">
          {selectedAgents.map(id => {
            const agent = participants.find(a => a.id === id)!;
            const Icon = AGENT_ICONS[id];
            const status = agentStatuses[id];
            return (
              <div
                key={id}
                className={`relative rounded-xl border overflow-hidden transition-all ${
                  status === 'thinking'
                    ? 'border-yellow-500/50 ring-1 ring-yellow-500/30'
                    : status === 'speaking'
                    ? `${AGENT_BORDER_COLORS[id]} ring-1 ring-opacity-50`
                    : 'border-gray-700'
                }`}
              >
                <div className={`bg-gradient-to-br ${agent.gradient} p-4 flex flex-col items-center text-white`}>
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-2">
                    <Icon size={28} />
                  </div>
                  <p className="font-bold text-sm">{agent.name}</p>
                  <p className="text-xs opacity-80">{agent.title}</p>

                  {/* Status indicator */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {status === 'thinking' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
                        <Loader2 size={10} className="animate-spin" /> Thinking...
                      </span>
                    )}
                    {status === 'speaking' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
                        <Volume2 size={10} className="animate-pulse" /> Speaking
                      </span>
                    )}
                    {status === 'idle' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full opacity-70">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat transcript */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              const isUser = msg.role === 'user';
              const Icon = AGENT_ICONS[msg.agentId];

              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isUser && (
                    <div className={`w-8 h-8 ${AGENT_COLORS[msg.agentId] || 'bg-gray-600'} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                      {Icon ? <Icon size={14} className="text-white" /> : <MessageCircle size={14} className="text-white" />}
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-xl px-4 py-3 ${
                      isUser
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                        : 'bg-gray-800 border border-gray-700 text-gray-100'
                    }`}
                  >
                    {!isUser && (
                      <p className={`text-xs font-semibold mb-1 ${AGENT_TEXT_COLORS[msg.agentId] || 'text-gray-400'}`}>
                        {msg.agentName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] mt-1.5 opacity-50">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-gray-700 bg-gray-800 p-3">
            {transcript && (
              <div className="mb-2 px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-gray-300 flex items-center gap-2">
                <Mic size={14} className="text-red-400 animate-pulse" />
                {transcript}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isListening) {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                  } else if (recognitionRef.current) {
                    setTranscript('');
                    setIsListening(true);
                    recognitionRef.current.start();
                  }
                }}
                disabled={isProcessing}
                className={`p-2.5 rounded-lg transition ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                } disabled:opacity-40`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={isProcessing ? 'Agents are responding...' : 'Ask your team something...'}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={isProcessing || !input.trim()}
                className="p-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamsMeetingRoom;
