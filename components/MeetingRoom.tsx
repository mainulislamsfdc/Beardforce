import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, MicOff, User, Bot, Loader2, Volume2, Video, VideoOff, PhoneOff, MessageSquare, MoreHorizontal, MonitorUp, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { GeminiService, createPCMBlob } from '../services/geminiService';
import { AgentRole, ChatMessage } from '../types';
import { AGENT_COLORS } from '../constants';

const MeetingRoom: React.FC = () => {
  const { addTicket, addLead, addCampaign } = useStore();
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: AgentRole.IT, text: "System Online. All agents are present in the meeting room.", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  
  // Meeting State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<AgentRole | null>(null);
  const [userMicOn, setUserMicOn] = useState(false);
  const [userVideoOn, setUserVideoOn] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refs
  const geminiRef = useRef<GeminiService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendAudioRef = useRef<((blob: Blob) => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Initialize Service
  useEffect(() => {
    geminiRef.current = new GeminiService({
      createTicket: (t, d, a) => addTicket({ title: t, description: d, assignee: a as any }),
      createLead: (n, e, v) => addLead({ name: n, email: e, value: v }),
      createCampaign: (n, p, b) => addCampaign({ name: n, platform: p as any, budget: b }),
    });
  }, [addTicket, addLead, addCampaign]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showChat]);

  // Helper to detect speaker from text
  const detectSpeaker = (text: string) => {
    if (text.includes('[Sales Manager]')) return AgentRole.SALES;
    if (text.includes('[Market Manager]')) return AgentRole.MARKETING;
    if (text.includes('[CEO]')) return AgentRole.CEO;
    if (text.includes('[IT Manager]')) return AgentRole.IT;
    return null;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !geminiRef.current) return;
    const userMsg = input;
    setInput('');
    setIsProcessing(true);
    setActiveSpeaker(AgentRole.USER);
    setErrorMsg(null);

    // Add user message
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: AgentRole.USER,
      text: userMsg,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMsg]);

    // Construct history
    const history = messages.map(m => `${m.role}: ${m.text}`);
    
    // reset speaker after a moment
    setTimeout(() => setActiveSpeaker(null), 1000);

    const responseText = await geminiRef.current.sendMessage(history, userMsg);

    // Identify primary speaker
    const detectedRole = detectSpeaker(responseText) || AgentRole.IT; // Default to IT if unclear
    setActiveSpeaker(detectedRole);

    const responseMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: detectedRole,
      text: responseText.replace(/\[.*?\]:/g, '').trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, responseMsg]);
    setIsProcessing(false);
    
    // Clear speaker highlight after reading time approx
    setTimeout(() => setActiveSpeaker(null), 4000);
  };

  const cleanupLiveSession = () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current.onaudioprocess = null;
      }
      if (audioContextRef.current) audioContextRef.current.close();
      setIsLive(false);
      setUserMicOn(false);
      sendAudioRef.current = null;
  };

  const toggleLiveMode = async () => {
    if (isLive) {
      cleanupLiveSession();
    } else {
      // Start Live Mode
      setErrorMsg(null);
      try {
        if (!geminiRef.current) return;
        
        // 1. Get Microphone FIRST to ensure permission and hardware readiness
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        streamRef.current = stream;
        
        setIsLive(true);
        setUserMicOn(true);
        
        // 2. Connect to Gemini
        const sender = await geminiRef.current.connectLive(
            () => { /* Visualizer hook if needed */ },
            (text, isUser) => {
                const detected = detectSpeaker(text);
                if (!isUser && detected) setActiveSpeaker(detected);
                if (isUser) setActiveSpeaker(AgentRole.USER);

                // Add to transcript
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    // Append to last message if same role and recent (streaming effect)
                    const isSameRole = lastMsg && lastMsg.role === (isUser ? AgentRole.USER : (detected || AgentRole.CEO));
                    const isRecent = lastMsg && (new Date().getTime() - lastMsg.timestamp.getTime() < 2000);
                    
                    if (isSameRole && isRecent) {
                        return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: m.text + " " + text } : m);
                    }
                    
                    return [...prev, {
                        id: Date.now().toString(),
                        role: isUser ? AgentRole.USER : (detected || AgentRole.CEO),
                        text: text,
                        timestamp: new Date(),
                        isAudio: true
                    }];
                });
                
                // Reset speaker after short delay if it was a short utterance
                setTimeout(() => setActiveSpeaker(null), 3000);
            }
        );
        sendAudioRef.current = sender;

        // 3. Setup Processing Pipeline
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
             if (!userMicOn) return; // Mute logic
             const inputData = e.inputBuffer.getChannelData(0);
             const pcmBlob = createPCMBlob(inputData);
             if (sendAudioRef.current) sendAudioRef.current(pcmBlob);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

      } catch (err: any) {
        console.error("Failed to start live mode", err);
        setErrorMsg("Failed to connect. Please check network/permissions.");
        cleanupLiveSession();
      }
    }
  };

  // --- Components ---

  const ParticipantTile = ({ role, name, initials, color }: { role: AgentRole, name: string, initials: string, color: string }) => {
    const isSpeaking = activeSpeaker === role;
    const styles = AGENT_COLORS[role];

    return (
      <div className={`relative flex flex-col items-center justify-center bg-slate-800 rounded-lg overflow-hidden transition-all duration-300 ${isSpeaking ? `ring-4 ring-offset-2 ring-offset-slate-900 ring-${color.split('-')[1]}-500 z-10 scale-[1.02]` : 'border border-slate-700'}`}>
        {/* Avatar Area */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-4 ${isSpeaking ? 'animate-pulse' : ''} ${styles.replace('bg-opacity-20', 'bg-opacity-100').split(' ')[2] || 'bg-slate-700'} text-slate-100`}>
          {initials}
        </div>
        
        {/* Name Label */}
        <div className="absolute bottom-3 left-3 flex flex-col">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{role}</span>
            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {name} 
                {isSpeaking && <Volume2 size={14} className="text-green-500 animate-bounce" />}
            </span>
        </div>

        {/* Status Indicators */}
        <div className="absolute top-3 right-3 flex gap-2">
            {isProcessing && role !== AgentRole.USER && (
                <div className="bg-slate-900/80 p-1.5 rounded-full" title="Thinking">
                    <Loader2 size={14} className="text-slate-400 animate-spin" />
                </div>
            )}
            <div className="bg-slate-900/80 p-1.5 rounded-full">
                <Mic size={14} className={isSpeaking ? "text-green-500" : "text-slate-500"} />
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      
      {/* Error Toast */}
      {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-2 backdrop-blur-sm animate-fade-in-down">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-2 opacity-80 hover:opacity-100">×</button>
          </div>
      )}

      {/* MAIN STAGE (Video Grid) */}
      <div className={`flex-1 flex flex-col relative bg-slate-900 ${showChat ? 'w-2/3' : 'w-full'}`}>
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-slate-900 to-transparent">
             <div className="flex justify-between items-center">
                 <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <MonitorUp className="text-amber-500" size={20} /> Executive Board Meeting
                 </h2>
                 <div className="flex items-center gap-2 bg-slate-800/80 rounded-full px-3 py-1 backdrop-blur border border-slate-700">
                     <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                     <span className="text-xs font-mono text-slate-300">{isLive ? 'LIVE AUDIO' : 'READY'}</span>
                 </div>
             </div>
        </div>

        {/* Grid */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-4 h-full pt-16 pb-20">
            <ParticipantTile role={AgentRole.CEO} name="The Chief" initials="CEO" color="text-purple-400" />
            <ParticipantTile role={AgentRole.SALES} name="Sales Lead" initials="SL" color="text-green-400" />
            <ParticipantTile role={AgentRole.MARKETING} name="Growth Lead" initials="GL" color="text-pink-400" />
            <ParticipantTile role={AgentRole.IT} name="Tech Lead" initials="TL" color="text-blue-400" />
        </div>

        {/* Self View (Floating) */}
        <div className="absolute bottom-24 right-6 w-48 h-32 bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden z-20 group">
             {userVideoOn ? (
                 <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                     <User size={32} className="text-slate-500" />
                 </div>
             ) : (
                 <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600 text-xs">
                     Camera Off
                 </div>
             )}
             <div className="absolute bottom-2 left-2 text-xs font-bold text-white drop-shadow-md">You</div>
             <div className={`absolute top-2 right-2 p-1 rounded-full ${userMicOn ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                 {userMicOn ? <Mic size={12} /> : <MicOff size={12} />}
             </div>
        </div>

        {/* Control Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-30">
             <button 
                onClick={() => setUserVideoOn(!userVideoOn)}
                className={`p-3 rounded-full transition-colors ${userVideoOn ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
             >
                 {userVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
             </button>
             
             <button 
                onClick={() => setUserMicOn(!userMicOn)}
                className={`p-3 rounded-full transition-colors ${userMicOn ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
             >
                 {userMicOn ? <Mic size={20} /> : <MicOff size={20} />}
             </button>

             <button 
                onClick={toggleLiveMode}
                className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
                    isLive 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50' 
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/50'
                }`}
             >
                 {isLive ? <PhoneOff size={20} /> : <Volume2 size={20} />}
                 {isLive ? 'End Call' : 'Join Voice'}
             </button>

             <div className="w-px h-8 bg-slate-700 mx-2"></div>

             <button 
                onClick={() => setShowChat(!showChat)}
                className={`p-3 rounded-full transition-colors ${showChat ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
             >
                 <MessageSquare size={20} />
             </button>
             <button className="p-3 rounded-full bg-slate-700 text-slate-200 hover:bg-slate-600">
                 <MoreHorizontal size={20} />
             </button>
        </div>
      </div>

      {/* CHAT SIDEBAR */}
      {showChat && (
          <div className="w-96 bg-slate-950 border-l border-slate-800 flex flex-col h-full transition-all">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                  <h3 className="font-bold text-slate-200">Meeting Chat</h3>
              </div>
              
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.role === AgentRole.USER;
                  const styles = AGENT_COLORS[msg.role] || AGENT_COLORS[AgentRole.IT];
                  
                  return (
                    <div key={msg.id} className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                       <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-slate-500">{msg.role}</span>
                           <span className="text-[10px] text-slate-600">{msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                       </div>
                       <div className={`p-3 rounded-xl text-sm leading-relaxed max-w-[90%] ${
                          isUser 
                            ? 'bg-slate-800 text-slate-100 rounded-tr-none' 
                            : `${styles.replace('bg-opacity-20', 'bg-opacity-10')} border border-slate-700 rounded-tl-none`
                       }`}>
                          {msg.text}
                       </div>
                    </div>
                  );
                })}
                {isProcessing && (
                     <div className="flex items-center gap-2 text-xs text-slate-500 italic px-2">
                         <Loader2 size={12} className="animate-spin" /> Agents are typing...
                     </div>
                )}
              </div>

              <div className="p-4 bg-slate-900 border-t border-slate-800">
                  <div className="relative">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        disabled={isLive}
                        className="w-full bg-slate-800 border-slate-700 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={!input.trim()}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-amber-500 disabled:opacity-50"
                      >
                          <Send size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MeetingRoom;