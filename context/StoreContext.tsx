import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Campaign, Expense, Lead, Ticket, SystemLog, TicketStatus, AgentRole, AppConfig, User, Metric, Trace, DynamicPage } from '../types';
import { DatabaseService } from '../services/db';

interface StoreContextType {
  // Auth & Config
  user: User | null;
  config: AppConfig | null;
  isLoading: boolean;
  currentView: string;
  setUser: (u: User | null) => void;
  updateConfig: (c: AppConfig) => Promise<void>;
  resetSystem: () => Promise<void>;
  navigateTo: (view: string) => void;

  // Data
  leads: Lead[];
  campaigns: Campaign[];
  tickets: Ticket[];
  expenses: Expense[];
  customPages: DynamicPage[];
  
  // Observability
  logs: SystemLog[];
  metrics: Metric[];
  traces: Trace[];

  // Actions
  addLead: (lead: Omit<Lead, 'id' | 'status'>) => string;
  addTicket: (ticket: Omit<Ticket, 'id' | 'status' | 'createdAt'>) => string;
  addCampaign: (camp: Omit<Campaign, 'id' | 'status' | 'clicks'>) => string;
  addLog: (action: string, agent: string, level?: 'info' | 'warn' | 'error') => void;
  recordTrace: (trace: Omit<Trace, 'id' | 'timestamp'>) => void;
  addCustomPage: (page: DynamicPage) => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('meeting');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customPages, setCustomPages] = useState<DynamicPage[]>([]);
  
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [traces, setTraces] = useState<Trace[]>([]);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await DatabaseService.initialize();

      const currentUser = DatabaseService.getCurrentUser();
      const currentConfig = await DatabaseService.getConfig();
      
      setUser(currentUser);
      setConfig(currentConfig);

      if (currentUser && currentConfig) {
        await refreshData();
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const refreshData = async () => {
    const [l, c, t, e, p, lo, tr, me] = await Promise.all([
      DatabaseService.getTable<Lead>('leads'),
      DatabaseService.getTable<Campaign>('campaigns'),
      DatabaseService.getTable<Ticket>('tickets'),
      DatabaseService.getTable<Expense>('expenses'),
      DatabaseService.getTable<DynamicPage>('pages'),
      DatabaseService.getTable<SystemLog>('logs'),
      DatabaseService.getTable<Trace>('traces'),
      DatabaseService.getTable<Metric>('metrics'),
    ]);
    setLeads(l);
    setCampaigns(c);
    setTickets(t);
    setExpenses(e);
    setCustomPages(p);
    setLogs(lo.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setTraces(tr.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setMetrics(me);
  };

  const updateConfig = async (newConfig: AppConfig) => {
    await DatabaseService.saveConfig(newConfig);
    setConfig(newConfig);
  };

  const resetSystem = async () => {
    await DatabaseService.resetAll();
    setUser(null);
    setConfig(null);
    setLeads([]);
    setCampaigns([]);
    setTickets([]);
    setCustomPages([]);
  };

  const navigateTo = (view: string) => {
      setCurrentView(view);
  };

  const addLog = useCallback((action: string, agent: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const newLog: SystemLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action,
      agent,
      level
    };
    setLogs(prev => [newLog, ...prev]);
    DatabaseService.insert('logs', newLog);
  }, []);

  const recordTrace = useCallback((traceData: Omit<Trace, 'id' | 'timestamp'>) => {
      const newTrace: Trace = {
          ...traceData,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString()
      };
      setTraces(prev => [newTrace, ...prev]);
      DatabaseService.insert('traces', newTrace);

      const latencyMetric: Metric = {
          id: crypto.randomUUID(),
          name: 'llm_latency',
          value: traceData.latencyMs,
          unit: 'ms',
          timestamp: new Date().toISOString()
      };
      setMetrics(prev => [...prev, latencyMetric]);
      DatabaseService.insert('metrics', latencyMetric);
  }, []);

  const addLead = useCallback((leadData: Omit<Lead, 'id' | 'status'>) => {
    const newLead: Lead = { ...leadData, id: Date.now().toString(), status: 'New' };
    setLeads(prev => [...prev, newLead]);
    DatabaseService.insert('leads', newLead);
    addLog(`New Prospect Detected: ${newLead.name}`, config?.agentNames[AgentRole.SALES] || 'Sales');
    return `Lead ${newLead.name} created.`;
  }, [addLog, config]);

  const addTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'status' | 'createdAt'>) => {
    const newTicket: Ticket = { 
        ...ticketData, 
        id: Date.now().toString(), 
        status: TicketStatus.BACKLOG, 
        createdAt: new Date().toISOString().split('T')[0] 
    };
    setTickets(prev => [...prev, newTicket]);
    DatabaseService.insert('tickets', newTicket);
    addLog(`Requirement Logged: ${newTicket.title}`, config?.agentNames[AgentRole.IT] || 'IT');
    return `Ticket #${newTicket.id} logged.`;
  }, [addLog, config]);

  const addCampaign = useCallback((campData: Omit<Campaign, 'id' | 'status' | 'clicks'>) => {
      const newCamp: Campaign = {
          ...campData,
          id: Date.now().toString(),
          status: 'Draft',
          clicks: 0
      };
      setCampaigns(prev => [...prev, newCamp]);
      DatabaseService.insert('campaigns', newCamp);
      addLog(`Campaign Strategy: ${newCamp.name}`, config?.agentNames[AgentRole.MARKETING] || 'Marketing');
      return `Campaign ${newCamp.name} drafted.`;
  }, [addLog, config]);

  const addCustomPage = useCallback((pageData: DynamicPage) => {
    // Check if page exists update it, else add
    setCustomPages(prev => {
        const exists = prev.find(p => p.id === pageData.id);
        if (exists) return prev.map(p => p.id === pageData.id ? pageData : p);
        return [...prev, pageData];
    });
    // For DB, we just overwrite by ID logic conceptually, in reality insert appends so we might duplicate in local storage but last one wins in memory
    // Better implementation for DB service would be upsert, but insert works for this demo level
    DatabaseService.insert('pages', pageData);
    addLog(`System Module Deployed: ${pageData.name}`, config?.agentNames[AgentRole.IT] || 'IT');
    return `Module ${pageData.name} deployed successfully.`;
  }, [addLog, config]);

  return (
    <StoreContext.Provider value={{ 
        user, config, isLoading, currentView, setUser, updateConfig, resetSystem, navigateTo,
        leads, campaigns, tickets, expenses, customPages, logs, metrics, traces,
        addLead, addTicket, addCampaign, addCustomPage, addLog, recordTrace
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};