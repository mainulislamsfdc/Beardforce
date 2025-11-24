import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, MicOff, User, Bot, Loader2, Volume2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { GeminiService, createPCMBlob } from '../services/geminiService';
import { AgentRole, ChatMessage } from '../types';
import { AGENT_COLORS } from '../constants';

const MeetingRoom: React.FC = () => {
  const { addTicket, addLead, addCampaign } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: AgentRole.IT, text: "System Online. All agents are present in the meeting room.", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const geminiRef = useRef<GeminiService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const sendAudioRef = useRef<((blob: Blob) => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    // Initialize Gemini Service with bound tools
    geminiRef.current = new GeminiService({
      createTicket: (t, d, a) => addTicket({ title: t, description: d, assignee: a as any }),
      createLead: (n, e, v) => addLead({ name: n, email: e, value: v }),
      createCampaign: (n, p, b) => addCampaign({ name: n, platform: p as any, budget: b }),
    });
  }, [addTicket, addLead, addCampaign]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !geminiRef.current) return;
    const userMsg = input;
    setInput('');
    setIsProcessing(true);

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: AgentRole.USER,
      text: userMsg,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMsg]);

    const history = messages.map(m => `${m.role}: ${m.text}`);
    const responseText = await geminiRef.current.sendMessage(history, userMsg);

    // Parse the response to see if specific agents are tagged (e.g., "[Sales Manager]: ...")
    // If multiple agents speak, split them. Simple splitting by regex for [Role]:
    const parts = responseText.split(/\[(Sales Manager|IT Manager|Market Manager|CEO)\]:/g).filter(p => p.trim());
    
    // If split was successful, parts[0] is usually empty string if text starts with tag, 
    // but the split keeps the delimiter.
    // Let's stick to a simpler parsing: Just add one message, and let the UI highlight based on content if needed,
    // or assume the AI formatted it well. For now, treat it as one 'Team Response' but try to detect primary role.
    
    let role = AgentRole.IT; // Default
    if (responseText.includes('[Sales Manager]')) role = AgentRole.SALES;
    else if (responseText.includes('[Market Manager]')) role = AgentRole.MARKETING;
    else if (responseText.includes('[CEO]')) role = AgentRole.CEO;

    const responseMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: role, // Simplified: Primary responder
      text: responseText.replace(/\[.*?\]:/g, '').trim(), // Clean tags
      timestamp: new Date()
    };

    setMessages(prev => [...prev, responseMsg]);
    setIsProcessing(false);
  };

  const toggleLiveMode = async () => {
    if (isLive) {
      // Stop Live Mode
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsLive(false);
      sendAudioRef.current = null;
    } else {
      // Start Live Mode
      try {
        if (!geminiRef.current) return;
        
        setIsLive(true); // Set optimistic state
        
        const sender = await geminiRef.current.connectLive(
            (base64) => { /* Visualizer hook */ },
            (text, isUser) => {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: isUser ? AgentRole.USER : AgentRole.CEO, // Default live voice to CEO persona
                    text: text,
                    timestamp: new Date(),
                    isAudio: true
                }]);
            }
        );
        sendAudioRef.current = sender;

        // Setup Microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            sampleRate: 16000,
            channelCount: 1
        } });
        streamRef.current = stream;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
             const inputData = e.inputBuffer.getChannelData(0);
             const pcmBlob = createPCMBlob(inputData);
             if (sendAudioRef.current) {
                 sendAudioRef.current(pcmBlob);
             }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

      } catch (err) {
        console.error("Failed to start live mode", err);
        setIsLive(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 overflow-hidden relative">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Bot className="text-amber-500" /> Executive Meeting Room
        </h2>
        <div className="flex items-center gap-2">
           <button 
             onClick={toggleLiveMode}
             className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
               isLive 
               ? 'bg-red-500/20 text-red-500 border border-red-500 animate-pulse' 
               : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
             }`}
           >
             {isLive ? <><Volume2 size={16} /> Live Audio</> : <><Mic size={16} /> Join Voice</>}
           </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === AgentRole.USER;
          const styles = AGENT_COLORS[msg.role] || AGENT_COLORS[AgentRole.IT];
          
          return (
            <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider opacity-70 mb-1">
                   {!isUser && <Bot size={12} />}
                   {isUser && <User size={12} />}
                   <span>{msg.role}</span>
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-lg backdrop-blur-md border ${
                  isUser 
                    ? 'bg-slate-800 text-slate-100 border-slate-700 rounded-tr-none' 
                    : `${styles} border-opacity-50 rounded-tl-none`
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-500 px-1">
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          );
        })}
        {isProcessing && (
          <div className="flex justify-start">
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Team is thinking...
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask the team to create leads, campaigns, or check stats..."
            disabled={isLive}
            className="w-full bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isProcessing || isLive}
            className="absolute right-2 p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
        {isLive && <p className="text-xs text-center text-slate-500 mt-2">Voice Mode Active. Speak to interact.</p>}
      </div>
    </div>
  );
};

export default MeetingRoom;
