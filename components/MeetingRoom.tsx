import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, MicOff, User, Loader2, Volume2, Video, VideoOff, PhoneOff, MessageSquare, MonitorUp, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { GeminiService } from '../services/geminiService';
import { AgentRole, ChatMessage } from '../types';
import { AGENT_COLORS } from '../constants';

// Helper to convert Float32 (Browser Audio) to Int16 (Gemini Requirement)
function floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return new Blob([output], { type: 'audio/pcm' });
}

// Downsampler
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number) {
    if (outputRate === inputRate) {
        return buffer;
    }
    const sampleRateRatio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

const MeetingRoom: React.FC = () => {
  const { addTicket, addLead, addCampaign, addCustomPage, addChangeRequest, config, recordTrace, navigateTo, leads, tickets, campaigns, customPages, changeRequests } = useStore();
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  
  // Meeting State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
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
    if (!config) return;

    // Initial Message
    if(messages.length === 0) {
        setMessages([{ 
            id: '0', 
            role: config.agentNames[AgentRole.IT] || 'IT', 
            roleType: AgentRole.IT,
            text: `System Online for ${config.businessName}. All agents ready.`, 
            timestamp: new Date() 
        }]);
    }

    geminiRef.current = new GeminiService(
      config,
      {
        createTicket: async (t, d, a) => {
            try { return await addTicket({ title: t, description: d, assignee: a as any }); }
            catch (e: any) { return `Error: ${e.message || e}`; }
        },
        createLead: async (n, e, v) => {
            try { return await addLead({ name: n, email: e, value: v }); }
            catch (e: any) { return `Error: ${e.message || e}`; }
        },
        createCampaign: async (n, p, b) => {
            try { return await addCampaign({ name: n, platform: p as any, budget: b }); }
            catch (e: any) { return `Error: ${e.message || e}`; }
        },
        changeDashboard: async (view) => {
            navigateTo(view);
            return `Navigated user to ${view} dashboard.`;
        },
        getRecentItems: async (type) => {
            if(type.includes('lead')) return JSON.stringify(leads.slice(-5));
            if(type.includes('ticket')) return JSON.stringify(tickets.slice(-5));
            if(type.includes('campaign')) return JSON.stringify(campaigns.slice(-5));
            if(type.includes('page')) return JSON.stringify(customPages);
            if(type.includes('change')) return JSON.stringify(changeRequests.slice(-5));
            return "No data found.";
        },
        deployAppModule: async (schema) => {
            try {
                const pageData = typeof schema === 'string' ? JSON.parse(schema) : schema;
                const res = await addCustomPage(pageData);
                setTimeout(() => navigateTo(pageData.id), 1000);
                return res;
            } catch (e: any) {
                return `Failed to deploy module: ${(e && e.message) ? e.message : 'Invalid JSON schema.'}`;
            }
        },
        logChangeRequest: async (title, desc) => {
            try { return await addChangeRequest({ title, description: desc, requestedBy: 'User' }); }
            catch (e: any) { return `Error: ${e.message || e}`; }
        }
      },
      (input, output, latency, status) => {
          recordTrace({
              requestId: crypto.randomUUID(),
              input: input.substring(0, 500),
              output: output.substring(0, 500),
              latencyMs: latency,
              model: 'gemini-2.5-flash',
              status
          });
      }
    );
  }, [config, addTicket, addLead, addCampaign, addCustomPage, addChangeRequest, recordTrace, navigateTo, leads, tickets, campaigns, customPages, changeRequests]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showChat]);

  // Helper to detect speaker from text
  const detectSpeaker = (text: string) => {
    if (!config) return null;
    const names = config.agentNames;
    if (text.includes(`[${names[AgentRole.SALES]}]`)) return names[AgentRole.SALES];
    if (text.includes(`[${names[AgentRole.MARKETING]}]`)) return names[AgentRole.MARKETING];
    if (text.includes(`[${names[AgentRole.CEO]}]`)) return names[AgentRole.CEO];
    if (text.includes(`[${names[AgentRole.IT]}]`)) return names[AgentRole.IT];
    return null;
  };

  const mapNameToRole = (name: string): AgentRole => {
     if(!config) return AgentRole.IT;
     const entry = Object.entries(config.agentNames).find(([_, val]) => val === name);
     return entry ? entry[0] as AgentRole : AgentRole.IT;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !geminiRef.current || !config) return;
    const userMsg = input;
    setInput('');
    setIsProcessing(true);
    const userRoleName = config.agentNames[AgentRole.USER] || 'User';
    setActiveSpeaker(userRoleName);
    setErrorMsg(null);

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: userRoleName,
      roleType: AgentRole.USER,
      text: userMsg,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMsg]);

    const history = messages.map(m => `${m.role}: ${m.text}`);
    setTimeout(() => setActiveSpeaker(null), 1000);

    const responseText = await geminiRef.current.sendMessage(history, userMsg);

    const detectedName = detectSpeaker(responseText) || config.agentNames[AgentRole.IT];
    setActiveSpeaker(detectedName);

    const responseMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: detectedName || 'System',
      roleType: mapNameToRole(detectedName || ''),
      text: responseText.replace(/\[.*?\]:/g, '').trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, responseMsg]);
    setIsProcessing(false);
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
      setErrorMsg(null);
      try {
        if (!geminiRef.current) return;
        
        // 1. Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // 2. Setup Audio Context & Processor
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const inputSampleRate = audioContext.sampleRate;
        
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        setIsLive(true);
        setUserMicOn(true);
        
        // 3. Connect to Gemini Live
        const sender = await geminiRef.current.connectLive(
            () => { }, // Audio data callback (can be used for visualizer)
            (text, isUser) => {
                if(!config) return;
                const detected = detectSpeaker(text);
                const userRoleName = config.agentNames[AgentRole.USER];
                
                if (isUser) setActiveSpeaker(userRoleName || 'User');
                else if (detected) setActiveSpeaker(detected);

                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    const targetRoleName = isUser ? userRoleName : (detected || config.agentNames[AgentRole.CEO]);
                    const isSameRole = lastMsg && lastMsg.role === targetRoleName;
                    const isRecent = lastMsg && (new Date().getTime() - lastMsg.timestamp.getTime() < 3000);
                    
                    if (isSameRole && isRecent) {
                        return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: m.text + " " + text } : m);
                    }
                    return [...prev, {
                        id: Date.now().toString(),
                        role: targetRoleName || 'Unknown',
                        roleType: isUser ? AgentRole.USER : mapNameToRole(targetRoleName || ''),
                        text: text,
                        timestamp: new Date(),
                        isAudio: true
                    }];
                });
                setTimeout(() => setActiveSpeaker(null), 3000);
            }
        );
        sendAudioRef.current = sender;

        // 4. Handle Audio Processing (Downsampling)
        processor.onaudioprocess = (e) => {
             if (!userMicOn || !sendAudioRef.current) return; 
             const inputData = e.inputBuffer.getChannelData(0);
             
             // Downsample to 16kHz
             const downsampled = downsampleBuffer(inputData, inputSampleRate, 16000);
             const pcmBlob = floatTo16BitPCM(downsampled);
             
             sendAudioRef.current(pcmBlob);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

      } catch (err: any) {
        console.error(err);
        setErrorMsg("Connection Failed. Check permissions.");
        cleanupLiveSession();
      }
    }
  };

  const ParticipantTile = ({ role, name, color }: { role: AgentRole, name: string, color: string }) => {
    const isSpeaking = activeSpeaker === name;
    if (!name) return null;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
      <div className={`relative flex flex-col items-center justify-center bg-slate-800 rounded-lg overflow-hidden transition-all duration-300 ${isSpeaking ? `ring-4 ring-offset-2 ring-offset-slate-900 ring-${color.split('-')[1]}-500 z-10 scale-[1.02]` : 'border border-slate-700'}`}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-4 ${isSpeaking ? 'animate-pulse' : ''} ${color.replace('text', 'bg').replace('400', '900')} text-slate-100`}>
          {initials}
        </div>
        <div className="absolute bottom-3 left-3 flex flex-col">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{role}</span>
            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {name} 
                {isSpeaking && <Volume2 size={14} className="text-green-500 animate-bounce" />}
            </span>
        </div>
        <div className="absolute top-3 right-3 flex gap-2">
            {isProcessing && role !== AgentRole.USER && (
                <div className="bg-slate-900/80 p-1.5 rounded-full"><Loader2 size={14} className="text-slate-400 animate-spin" /></div>
            )}
            <div className="bg-slate-900/80 p-1.5 rounded-full">
                <Mic size={14} className={isSpeaking ? "text-green-500" : "text-slate-500"} />
            </div>
        </div>
      </div>
    );
  };

  if (!config) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-2 backdrop-blur-sm">
              <AlertCircle size={18} /><span>{errorMsg}</span><button onClick={() => setErrorMsg(null)}>×</button>
          </div>
      )}

      <div className={`flex-1 flex flex-col relative bg-slate-900 ${showChat ? 'w-2/3' : 'w-full'}`}>
        <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-slate-900 to-transparent flex justify-between items-center">
             <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2"><MonitorUp className="text-amber-500" size={20} /> Executive Board</h2>
             <div className="flex items-center gap-2 bg-slate-800/80 rounded-full px-3 py-1 backdrop-blur border border-slate-700">
                 <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                 <span className="text-xs font-mono text-slate-300">{isLive ? 'LIVE' : 'READY'}</span>
             </div>
        </div>

        <div className="flex-1 p-4 grid grid-cols-2 gap-4 h-full pt-16 pb-20">
            <ParticipantTile role={AgentRole.CEO} name={config.agentNames[AgentRole.CEO]!} color="text-purple-400" />
            <ParticipantTile role={AgentRole.SALES} name={config.agentNames[AgentRole.SALES]!} color="text-green-400" />
            <ParticipantTile role={AgentRole.MARKETING} name={config.agentNames[AgentRole.MARKETING]!} color="text-pink-400" />
            <ParticipantTile role={AgentRole.IT} name={config.agentNames[AgentRole.IT]!} color="text-blue-400" />
        </div>

        <div className="absolute bottom-24 right-6 w-48 h-32 bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden z-20">
             {userVideoOn ? <div className="w-full h-full bg-slate-700 flex items-center justify-center"><User size={32} className="text-slate-500" /></div> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-xs">Off</div>}
             <div className="absolute bottom-2 left-2 text-xs font-bold text-white drop-shadow-md">You</div>
             <div className={`absolute top-2 right-2 p-1 rounded-full ${userMicOn ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{userMicOn ? <Mic size={12} /> : <MicOff size={12} />}</div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-30">
             <button onClick={() => setUserVideoOn(!userVideoOn)} className={`p-3 rounded-full transition-colors ${userVideoOn ? 'bg-slate-700 text-slate-200' : 'bg-red-500/20 text-red-500'}`}>{userVideoOn ? <Video size={20} /> : <VideoOff size={20} />}</button>
             <button onClick={() => setUserMicOn(!userMicOn)} className={`p-3 rounded-full transition-colors ${userMicOn ? 'bg-slate-700 text-slate-200' : 'bg-red-500/20 text-red-500'}`}>{userMicOn ? <Mic size={20} /> : <MicOff size={20} />}</button>
             <button onClick={toggleLiveMode} className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${isLive ? 'bg-red-600' : 'bg-green-600'}`}>{isLive ? <PhoneOff size={20} /> : <Volume2 size={20} />}{isLive ? 'End' : 'Join'}</button>
             <button onClick={() => setShowChat(!showChat)} className={`p-3 rounded-full transition-colors ${showChat ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'}`}><MessageSquare size={20} /></button>
        </div>
      </div>

      {showChat && (
          <div className="w-96 bg-slate-950 border-l border-slate-800 flex flex-col h-full">
              <div className="p-4 border-b border-slate-800 bg-slate-900"><h3 className="font-bold text-slate-200">Transcript</h3></div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.roleType === AgentRole.USER;
                  const styles = AGENT_COLORS[msg.roleType] || AGENT_COLORS[AgentRole.IT];
                  return (
                    <div key={msg.id} className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                       <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500">{msg.role}</span></div>
                       <div className={`p-3 rounded-xl text-sm leading-relaxed max-w-[90%] ${isUser ? 'bg-slate-800 text-slate-100 rounded-tr-none' : `${styles.replace('bg-opacity-20', 'bg-opacity-10')} border border-slate-700 rounded-tl-none`}`}>{msg.text}</div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 bg-slate-900 border-t border-slate-800 relative">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type message..." disabled={isLive} className="w-full bg-slate-800 border-slate-700 rounded-lg pl-4 pr-10 py-3 text-sm outline-none focus:ring-1 focus:ring-amber-500" />
                  <button onClick={handleSendMessage} disabled={!input.trim()} className="absolute right-6 top-6 text-slate-400 hover:text-amber-500"><Send size={16} /></button>
              </div>
          </div>
      )}
    </div>
  );
};

export default MeetingRoom;