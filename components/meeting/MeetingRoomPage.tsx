import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Crown, TrendingUp, Megaphone, Database, DollarSign, Target, AlertCircle,
  ArrowLeft, Mic, MicOff, Volume2, VolumeX, Send, PhoneOff, Loader2, CheckCircle2,
  MessageCircle, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAgentConfig } from '../../context/AgentConfigContext';
import { useBranding } from '../../context/BrandingContext';
import { AvatarRenderer } from '../avatars/AvatarRenderer';
import { databaseService, initializeDatabase } from '../../services/database';
import {
  meetingOrchestrator,
  buildAgentParticipants,
  type MeetingMessage,
} from '../../services/agents/MeetingOrchestrator';
import AgentChatPanel from './AgentChatPanel';
import { AGENT_REGISTRY } from './agentRegistry';
import type { AgentId } from '../../types';

type Mode = 'selector' | 'individual' | 'team';

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

interface DashboardData {
  totalLeads: number;
  qualifiedLeads: number;
  pipelineValue: number;
  revenue: number;
  pendingApprovals: number;
  aiBudgetSpent: number;
}

const AGENT_IDS: AgentId[] = ['it', 'sales', 'marketing', 'ceo'];

const AGENT_ICONS: Record<string, any> = { ceo: Crown, sales: TrendingUp, marketing: Megaphone, it: Database };
const AGENT_COLORS: Record<string, string> = { ceo: 'bg-amber-600', sales: 'bg-green-600', marketing: 'bg-purple-600', it: 'bg-blue-600' };
const AGENT_BORDER_COLORS: Record<string, string> = { ceo: 'border-amber-500', sales: 'border-green-500', marketing: 'border-purple-500', it: 'border-blue-500' };
const AGENT_TEXT_COLORS: Record<string, string> = { ceo: 'text-amber-400', sales: 'text-green-400', marketing: 'text-purple-400', it: 'text-blue-400' };

export default function MeetingRoomPage() {
  const { user } = useAuth();
  const { getAgent, agents: agentConfigs } = useAgentConfig();
  const { branding } = useBranding();

  // Mode management
  const [mode, setMode] = useState<Mode>('selector');
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);

  // KPI data
  const [kpiData, setKpiData] = useState<DashboardData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const loadingRef = useRef(false);

  // Team meeting state
  const [dbInitialized, setDbInitialized] = useState(false);
  const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
  const [meetingInput, setMeetingInput] = useState('');
  const [inMeeting, setInMeeting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'thinking' | 'speaking'>>({
    ceo: 'idle', sales: 'idle', marketing: 'idle', it: 'idle',
  });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['ceo', 'sales', 'marketing', 'it']);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const meetingMessagesEndRef = useRef<HTMLDivElement>(null);
  const meetingInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const participants = buildAgentParticipants(agentConfigs);

  // Load KPI data
  const loadKPIData = useCallback(async () => {
    if (!user?.id || loadingRef.current) return;
    loadingRef.current = true;
    setKpiLoading(true);
    try {
      await initializeDatabase(user.id);
      setDbInitialized(true);

      const currentMonth = new Date().toISOString().substring(0, 7);
      const [leads, opportunities, orders, changeLogs, aiBudget] = await Promise.all([
        databaseService.getLeads(),
        databaseService.getOpportunities(),
        databaseService.getOrders(),
        databaseService.getChangeLogs([{ column: 'status', operator: '=', value: 'pending' }]),
        databaseService.getAIBudget(currentMonth),
      ]);

      const qualifiedLeads = leads.filter((l: any) => l.status === 'qualified').length;
      const pipelineValue = opportunities
        .filter((o: any) => o.stage !== 'closed_lost')
        .reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);
      const revenue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
      const totalBudgetSpent = aiBudget.reduce((sum: number, b: any) => sum + (parseFloat(b.estimated_cost) || 0), 0);

      setKpiData({
        totalLeads: leads.length,
        qualifiedLeads,
        pipelineValue,
        revenue,
        pendingApprovals: changeLogs.length,
        aiBudgetSpent: totalBudgetSpent,
      });
    } catch (err) {
      console.error('KPI load error:', err);
    } finally {
      setKpiLoading(false);
      loadingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => { loadKPIData(); }, [loadKPIData]);

  // Initialize speech recognition
  useEffect(() => {
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
          setMeetingInput(t);
          setTranscript('');
          setIsListening(false);
        }
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Scroll meeting messages
  useEffect(() => {
    meetingMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meetingMessages]);

  // Agent selector click
  const handleAgentSelect = (agentId: AgentId) => {
    setSelectedAgent(agentId);
    setMode('individual');
  };

  const handleBack = () => {
    setMode('selector');
    setSelectedAgent(null);
  };

  const handleStartTeamMode = () => {
    setMode('team');
  };

  // Sequential speech — returns a promise that resolves when the utterance finishes
  const speak = useCallback((text: string, agentId: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current || !speechEnabled) { resolve(); return; }
      const config = participants.find(a => a.id === agentId)?.voiceConfig;
      if (!config) { resolve(); return; }
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = config.pitch;
      utterance.rate = config.rate;
      utterance.volume = config.volume;
      const voices = synthRef.current.getVoices();
      const pref = voices.find(v => v.name.includes(config.voiceName || ''));
      if (pref) utterance.voice = pref;
      utterance.onstart = () => setAgentStatuses(s => ({ ...s, [agentId]: 'speaking' }));
      utterance.onend = () => { setAgentStatuses(s => ({ ...s, [agentId]: 'idle' })); resolve(); };
      utterance.onerror = () => { setAgentStatuses(s => ({ ...s, [agentId]: 'idle' })); resolve(); };
      synthRef.current.speak(utterance);
    });
  }, [speechEnabled, participants]);

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const startMeeting = async () => {
    if (!user?.id || selectedParticipants.length === 0) return;
    try {
      await initializeDatabase(user.id);
      setDbInitialized(true);
    } catch (err) {
      console.error('DB init failed:', err);
    }
    meetingOrchestrator.initialize(databaseService, agentConfigs, branding.app_name);
    setInMeeting(true);
    meetingOrchestrator.clearTranscript();
    const ceoName = participants.find(a => a.id === 'ceo')?.name || 'CEO';
    setMeetingMessages([{
      id: 'system-start',
      agentId: 'system',
      agentName: 'System',
      role: 'system',
      content: `Meeting started with ${selectedParticipants.map(id => participants.find(a => a.id === id)?.name).join(', ')}. ${ceoName} leads by default. Use @name to address specific agents (e.g. @Sales, @IT) or @all for everyone.`,
      timestamp: new Date(),
    }]);
    meetingInputRef.current?.focus();
  };

  const endMeeting = () => {
    setInMeeting(false);
    synthRef.current?.cancel();
    setMeetingMessages([]);
    setAgentStatuses({ ceo: 'idle', sales: 'idle', marketing: 'idle', it: 'idle' });
  };

  const handleMeetingSend = async () => {
    const msg = meetingInput.trim();
    if (!msg || isProcessing || selectedParticipants.length === 0) return;
    setMeetingInput('');
    setIsProcessing(true);

    const userMsg: MeetingMessage = {
      id: `msg-${Date.now()}-user`,
      agentId: 'user',
      agentName: 'You',
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMeetingMessages(prev => [...prev, userMsg]);

    // Resolve which agents should respond (@mention or CEO default)
    const { agentIds } = meetingOrchestrator.resolveTargets(msg, selectedParticipants);

    const onStatus = (agentId: string, status: 'thinking' | 'speaking' | 'idle') => {
      setAgentStatuses(s => ({ ...s, [agentId]: status }));
    };

    try {
      for await (const response of meetingOrchestrator.askAgents(msg, agentIds, onStatus)) {
        setMeetingMessages(prev => [...prev, response]);
        // Wait for speech to finish before next agent starts
        if (speechEnabled) await speak(response.content, response.agentId);
      }
    } catch (e: any) {
      console.error('Meeting error:', e);
    } finally {
      setIsProcessing(false);
      setAgentStatuses({ ceo: 'idle', sales: 'idle', marketing: 'idle', it: 'idle' });
      meetingInputRef.current?.focus();
    }
  };

  // Build agent cards for selector
  const agentCards = AGENT_IDS.map(id => {
    const cfg = getAgent(id);
    const visual = AGENT_REGISTRY[id];
    return {
      id,
      name: cfg.custom_name,
      title: cfg.custom_title,
      color: cfg.color_gradient,
      color_primary: cfg.color_primary,
      avatar_id: cfg.avatar_id,
      initials: cfg.custom_name.substring(0, 2).toUpperCase(),
      icon: visual.icon,
      gradient: visual.gradient,
      description: visual.description,
      capCount: visual.capabilities.length,
    };
  });

  // ═══════════════════════════════════════════
  // MODE 1: SELECTOR (Landing)
  // ═══════════════════════════════════════════
  if (mode === 'selector') {
    return (
      <div className="h-full overflow-y-auto bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                <LayoutDashboard className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Meeting Room</h2>
                <p className="text-gray-400 text-xs">Chat with agents or start a team meeting</p>
              </div>
            </div>
            <button
              onClick={handleStartTeamMode}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-700 transition shadow-lg text-sm"
            >
              <Users size={18} />
              Team Meeting
            </button>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {kpiLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
                  <div className="h-3 bg-gray-700 rounded w-16 mb-2" />
                  <div className="h-6 bg-gray-700 rounded w-12" />
                </div>
              ))
            ) : (
              <>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users size={14} className="text-blue-400" />
                    <span className="text-gray-400 text-xs">Leads</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{kpiData?.totalLeads || 0}</div>
                  <div className="text-[10px] text-blue-400">{kpiData?.qualifiedLeads || 0} qualified</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={14} className="text-purple-400" />
                    <span className="text-gray-400 text-xs">Pipeline</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(kpiData?.pipelineValue || 0)}</div>
                  <div className="text-[10px] text-purple-400">Active opportunities</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign size={14} className="text-green-400" />
                    <span className="text-gray-400 text-xs">Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(kpiData?.revenue || 0)}</div>
                  <div className="text-[10px] text-green-400">From orders</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle size={14} className={kpiData?.pendingApprovals ? 'text-orange-400' : 'text-gray-500'} />
                    <span className="text-gray-400 text-xs">Approvals</span>
                  </div>
                  <div className={`text-2xl font-bold ${kpiData?.pendingApprovals ? 'text-orange-400' : 'text-white'}`}>
                    {kpiData?.pendingApprovals || 0}
                  </div>
                  <div className="text-[10px] text-gray-500">AI: ${(kpiData?.aiBudgetSpent || 0).toFixed(2)}/mo</div>
                </div>
              </>
            )}
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-2 gap-5">
            {agentCards.map(agent => {
              const AgentIcon = agent.icon;
              return (
                <button
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent.id)}
                  className="group relative bg-gray-800 rounded-xl p-6 border-2 border-gray-700 hover:border-gray-600 transition-all duration-200 overflow-hidden text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative flex flex-col items-center text-center">
                    <div className="mb-4 group-hover:scale-110 transition-transform">
                      <AvatarRenderer
                        avatarId={agent.avatar_id}
                        size="xl"
                        color={agent.color_primary}
                        fallbackInitial={agent.initials}
                      />
                    </div>
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">{agent.title}</div>
                    <h3 className="text-white font-bold text-lg mb-1">{agent.name}</h3>
                    <p className="text-gray-500 text-xs mb-2">{agent.description}</p>
                    <div className="flex items-center gap-2">
                      <AgentIcon className="text-gray-500 group-hover:text-gray-400 transition-colors" size={16} />
                      <span className="text-gray-500 text-xs">{agent.capCount} tools</span>
                    </div>
                    <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm text-gray-400">Click to chat</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MODE 2: INDIVIDUAL AGENT CHAT
  // ═══════════════════════════════════════════
  if (mode === 'individual' && selectedAgent) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        {/* Agent switcher bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            title="Back to Meeting Room"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          {AGENT_IDS.map(id => {
            const cfg = getAgent(id);
            const visual = AGENT_REGISTRY[id];
            const AgentIcon = visual.icon;
            const isActive = id === selectedAgent;
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedAgent(id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? `${visual.bgColor} text-white`
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title={cfg.custom_name}
              >
                <AgentIcon size={14} />
                {cfg.custom_name}
              </button>
            );
          })}
          <div className="ml-auto">
            <button
              onClick={handleStartTeamMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition"
            >
              <Users size={14} />
              Team Meeting
            </button>
          </div>
        </div>

        {/* Chat panel — key forces remount on agent switch */}
        <div className="flex-1 overflow-hidden">
          <AgentChatPanel key={selectedAgent} agentId={selectedAgent} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MODE 3: TEAM MEETING
  // ═══════════════════════════════════════════
  if (mode === 'team') {
    // Pre-meeting lobby
    if (!inMeeting) {
      return (
        <div className="h-full flex flex-col bg-gray-900">
          {/* Back bar */}
          <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
              title="Back to Meeting Room"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-gray-400 text-sm">Team Meeting Setup</span>
          </div>

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
                    const AgentIcon = AGENT_ICONS[agent.id];
                    const selected = selectedParticipants.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => toggleParticipant(agent.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${
                          selected
                            ? `${AGENT_BORDER_COLORS[agent.id]} bg-gray-700`
                            : 'border-gray-700 bg-gray-800 opacity-50 hover:opacity-75'
                        }`}
                      >
                        <div className={`w-10 h-10 ${AGENT_COLORS[agent.id]} rounded-full flex items-center justify-center`}>
                          <AgentIcon size={20} className="text-white" />
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
                disabled={selectedParticipants.length === 0}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg"
              >
                Start Meeting ({selectedParticipants.length} participant{selectedParticipants.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Active meeting
    return (
      <div className="h-full flex flex-col bg-gray-900">
        {/* Meeting header */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-semibold">Meeting in Progress</span>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {selectedParticipants.map(id => {
              const agent = participants.find(a => a.id === id)!;
              const AgentIcon = AGENT_ICONS[id];
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
                  <AgentIcon size={12} />
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
          {/* Agent grid (left) — click to @mention */}
          <div className="w-72 border-r border-gray-700 bg-gray-800 p-3 flex flex-col gap-3 overflow-y-auto">
            {selectedParticipants.map(id => {
              const agent = participants.find(a => a.id === id)!;
              const AgentIcon = AGENT_ICONS[id];
              const status = agentStatuses[id];
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (!isProcessing) {
                      const mention = `@${agent.name.split(' ')[0]} `;
                      setMeetingInput(prev => prev.includes(`@${agent.name.split(' ')[0]}`) ? prev : mention + prev);
                      meetingInputRef.current?.focus();
                    }
                  }}
                  className={`relative rounded-xl border overflow-hidden transition-all text-left ${
                    status === 'thinking'
                      ? 'border-yellow-500/50 ring-1 ring-yellow-500/30'
                      : status === 'speaking'
                      ? `${AGENT_BORDER_COLORS[id]} ring-1 ring-opacity-50`
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  title={`Click to @mention ${agent.name}`}
                >
                  <div className={`bg-gradient-to-br ${agent.gradient} p-4 flex flex-col items-center text-white`}>
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <AgentIcon size={28} />
                    </div>
                    <p className="font-bold text-sm">{agent.name}</p>
                    <p className="text-xs opacity-80">{agent.title}</p>
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
                </button>
              );
            })}
            {/* Quick @all button */}
            <button
              onClick={() => {
                if (!isProcessing) {
                  setMeetingInput(prev => prev.includes('@all') ? prev : '@all ' + prev);
                  meetingInputRef.current?.focus();
                }
              }}
              className="rounded-xl border border-gray-700 hover:border-gray-600 bg-gray-700/50 p-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition text-sm font-medium"
              title="Address all agents"
            >
              <Users size={16} />
              @all agents
            </button>
          </div>

          {/* Chat transcript */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {meetingMessages.map(msg => {
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
                const MsgIcon = AGENT_ICONS[msg.agentId];

                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!isUser && (
                      <div className={`w-8 h-8 ${AGENT_COLORS[msg.agentId] || 'bg-gray-600'} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                        {MsgIcon ? <MsgIcon size={14} className="text-white" /> : <MessageCircle size={14} className="text-white" />}
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
                      <p className="text-[10px] mt-1.5 opacity-50">{msg.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={meetingMessagesEndRef} />
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
                  ref={meetingInputRef}
                  type="text"
                  value={meetingInput}
                  onChange={e => setMeetingInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleMeetingSend(); } }}
                  placeholder={isProcessing ? 'Agents are responding...' : 'Message CEO (or @Sales @IT @Marketing @all)'}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                />
                <button
                  onClick={handleMeetingSend}
                  disabled={isProcessing || !meetingInput.trim()}
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
  }

  // Fallback
  return null;
}
