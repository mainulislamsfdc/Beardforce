import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, TrendingUp, Megaphone, Crown, Zap, MessageCircle } from 'lucide-react';
import { salesAgent } from '../services/agents/tools/SalesAgent';
import { marketingAgent } from '../services/agents/tools/MarketingAgent';
import { ceoAgent } from '../services/agents/tools/CEOAgent';
import { databaseService, initializeDatabase } from '../services/database';
import { useAuth } from '../context/AuthContext';

interface AgentConfig {
  id: string;
  name: string;
  title: string;
  icon: any;
  color: string;
  gradient: string;
  voiceConfig: {
    pitch: number;
    rate: number;
    volume: number;
    voiceName?: string;
  };
  agent: any;
}

interface Message {
  agent: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export const VoiceAgentHub: React.FC = () => {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [dbInitialized, setDbInitialized] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agents: AgentConfig[] = [
    {
      id: 'sales',
      name: 'Sales Manager',
      title: 'Pipeline & Revenue',
      icon: TrendingUp,
      color: 'green',
      gradient: 'from-green-600 to-blue-700',
      voiceConfig: { pitch: 1.1, rate: 1.0, volume: 1, voiceName: 'Google US English' },
      agent: salesAgent
    },
    {
      id: 'marketing',
      name: 'Marketing Manager',
      title: 'Campaigns & Growth',
      icon: Megaphone,
      color: 'purple',
      gradient: 'from-purple-600 to-pink-700',
      voiceConfig: { pitch: 1.2, rate: 0.95, volume: 1, voiceName: 'Google UK English Female' },
      agent: marketingAgent
    },
    {
      id: 'ceo',
      name: 'CEO',
      title: 'Strategy & Oversight',
      icon: Crown,
      color: 'amber',
      gradient: 'from-amber-600 via-yellow-600 to-orange-700',
      voiceConfig: { pitch: 0.85, rate: 0.9, volume: 1, voiceName: 'Google US English' },
      agent: ceoAgent
    }
  ];

  useEffect(() => {
    const initDB = async () => {
      if (user?.id && !dbInitialized) {
        try {
          await initializeDatabase(user.id);
          setDbInitialized(true);
          console.log('Database connected successfully');
        } catch (error) {
          console.error('Database connection failed:', error);
        }
      }
    };
    initDB();

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          handleVoiceCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [user, dbInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current && selectedAgent) {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string, agentId: string) => {
    if (!synthRef.current || !speechEnabled) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = agent.voiceConfig.pitch;
    utterance.rate = agent.voiceConfig.rate;
    utterance.volume = agent.voiceConfig.volume;

    // Try to use specific voice if available
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes(agent.voiceConfig.voiceName || ''));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const handleVoiceCommand = async (command: string) => {
    if (!selectedAgent) return;

    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return;

    // Add user message
    const userMessage: Message = {
      agent: selectedAgent,
      role: 'user',
      content: command,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get agent response
      const response = await agent.agent.chat(command);

      // Add agent message
      const agentMessage: Message = {
        agent: selectedAgent,
        role: 'agent',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);

      // Speak the response
      speak(response, selectedAgent);
    } catch (error: any) {
      const errorMessage: Message = {
        agent: selectedAgent,
        role: 'agent',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const getAgentMessages = (agentId: string) => {
    return messages.filter(m => m.agent === agentId);
  };

  const selectedAgentConfig = agents.find(a => a.id === selectedAgent);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl shadow-lg">
              <Mic size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Voice Agent Hub</h1>
              <p className="text-gray-400 mt-1">Talk to your AI agents using voice commands</p>
            </div>
          </div>
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              speechEnabled
                ? 'bg-green-900 bg-opacity-50 text-green-400 hover:bg-opacity-70'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {speechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            {speechEnabled ? 'Voice On' : 'Voice Off'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Agent Selection Panel */}
        <div className="w-80 border-r border-gray-700 bg-gray-800 p-4 overflow-y-auto">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MessageCircle size={20} className="text-gray-400" />
            Select an Agent
          </h2>
          <div className="space-y-3">
            {agents.map((agent) => {
              const Icon = agent.icon;
              const agentMessages = getAgentMessages(agent.id);
              const isSelected = selectedAgent === agent.id;

              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full p-4 rounded-xl border transition text-left ${
                    isSelected
                      ? `border-gray-500 bg-gradient-to-br ${agent.gradient} text-white shadow-lg`
                      : 'border-gray-700 bg-gray-700 hover:border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={24} className={isSelected ? 'text-white' : 'text-gray-300'} />
                    <div className="flex-1">
                      <h3 className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>{agent.name}</h3>
                      <p className={`text-xs ${isSelected ? 'text-white opacity-90' : 'text-gray-400'}`}>
                        {agent.title}
                      </p>
                    </div>
                  </div>
                  {agentMessages.length > 0 && (
                    <div className={`text-xs ${isSelected ? 'text-white opacity-90' : 'text-gray-400'}`}>
                      {agentMessages.length} messages
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Voice Controls */}
          {selectedAgent && (
            <div className="mt-6 p-4 bg-gray-700 rounded-xl border border-gray-600">
              <h3 className="font-semibold text-gray-200 mb-3 text-sm">Voice Controls</h3>
              {isListening ? (
                <button
                  onClick={stopListening}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition animate-pulse"
                >
                  <MicOff size={20} />
                  Stop Listening
                </button>
              ) : (
                <button
                  onClick={startListening}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  disabled={isSpeaking}
                >
                  <Mic size={20} />
                  Start Talking
                </button>
              )}

              {transcript && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-600 text-sm">
                  <p className="text-gray-400 text-xs mb-1">Listening...</p>
                  <p className="text-gray-200">{transcript}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation Panel */}
        <div className="flex-1 flex flex-col">
          {!selectedAgent ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-6 rounded-full mb-6 shadow-xl">
                <Mic size={64} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Voice-Powered CRM</h2>
              <p className="text-lg text-gray-400 mb-6 max-w-2xl">
                Select an agent from the left panel and start talking! Each agent has a unique voice and can help you with different tasks.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
                  <Zap className="text-blue-400 mb-2" size={24} />
                  <h3 className="font-semibold text-white mb-1">Natural Conversations</h3>
                  <p className="text-sm text-gray-400">Talk naturally like you're on a call</p>
                </div>
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
                  <Volume2 className="text-purple-400 mb-2" size={24} />
                  <h3 className="font-semibold text-white mb-1">Unique Voices</h3>
                  <p className="text-sm text-gray-400">Each agent has their own personality</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Agent Header */}
              <div className={`bg-gradient-to-r ${selectedAgentConfig?.gradient} text-white p-4 shadow-lg`}>
                <div className="flex items-center gap-3">
                  {selectedAgentConfig && <selectedAgentConfig.icon size={32} />}
                  <div>
                    <h2 className="text-xl font-bold">{selectedAgentConfig?.name}</h2>
                    <p className="text-sm opacity-90">{selectedAgentConfig?.title}</p>
                  </div>
                  {isSpeaking && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-full">
                      <Volume2 size={16} className="animate-pulse" />
                      <span className="text-sm">Speaking...</span>
                    </div>
                  )}
                  {isListening && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-full">
                      <Mic size={16} className="animate-pulse" />
                      <span className="text-sm">Listening...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
                {getAgentMessages(selectedAgent).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Mic size={48} className="text-gray-600 mb-4" />
                    <p className="text-lg text-gray-400">Click "Start Talking" to begin your conversation</p>
                    <p className="text-sm text-gray-500 mt-2">Speak clearly and naturally</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {getAgentMessages(selectedAgent).map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-2xl rounded-2xl px-6 py-4 shadow-md ${
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-12'
                              : 'bg-gray-800 border border-gray-700 text-gray-100 mr-12'
                          }`}
                        >
                          <div className="text-sm font-semibold mb-2 opacity-80">
                            {message.role === 'user' ? 'You' : selectedAgentConfig?.name}
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                          <div className="text-xs mt-2 opacity-60">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
