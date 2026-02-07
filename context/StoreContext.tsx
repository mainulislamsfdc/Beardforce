import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Campaign, Expense, Lead, Ticket, SystemLog, TicketStatus, AgentRole, AppConfig, User, Metric, Trace, DynamicPage, ChangeRequest } from '../types';
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
  users: User[];
  changeRequests: ChangeRequest[];
  
  // Observability
  logs: SystemLog[];
  metrics: Metric[];
  traces: Trace[];

  // Actions
  addLead: (leadData: Omit<Lead, 'id' | 'status'>) => Promise<string>;
  addTicket: (ticketData: Omit<Ticket, 'id' | 'status' | 'createdAt'>) => Promise<string>;
  addCampaign: (camp: Omit<Campaign, 'id' | 'status' | 'clicks'>) => Promise<string>;
  addLog: (action: string, agent: string, level?: 'info' | 'warn' | 'error') => void;
  recordTrace: (trace: Omit<Trace, 'id' | 'timestamp'>) => void;
  addCustomPage: (page: DynamicPage) => Promise<string>;
  addChangeRequest: (req: Omit<ChangeRequest, 'id' | 'status' | 'timestamp'>) => Promise<string>; 
  updateChangeRequestStatus: (id: string, status: ChangeRequest['status']) => void;
  
  // User Mgmt Actions
  addNewUser: (email: string, role: 'admin'|'viewer', password?: string) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  resetUserPassword: (email: string) => Promise<string>;

  // Generic Action Handler for Forms
  executeAction: (actionName: string, data: any) => Promise<string>;
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
  const [users, setUsers] = useState<User[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  
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
    const [l, c, t, e, p, cr, lo, tr, me, u] = await Promise.all([
      DatabaseService.getTable<Lead>('leads'),
      DatabaseService.getTable<Campaign>('campaigns'),
      DatabaseService.getTable<Ticket>('tickets'),
      DatabaseService.getTable<Expense>('expenses'),
      DatabaseService.getTable<DynamicPage>('pages'),
      DatabaseService.getTable<ChangeRequest>('change_log'),
      DatabaseService.getTable<SystemLog>('logs'),
      DatabaseService.getTable<Trace>('traces'),
      DatabaseService.getTable<Metric>('metrics'),
      DatabaseService.getUsers(),
    ]);
    setLeads(l);
    setCampaigns(c);
    setTickets(t);
    setExpenses(e);
    setCustomPages(p);
    setChangeRequests(cr);
    setUsers(u);
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
    setUsers([]);
    setChangeRequests([]);
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

  const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'status'>) => {
    const newLead: Lead = { ...leadData, id: Date.now().toString(), status: 'New' };
    setLeads(prev => [...prev, newLead]);
    try {
      await DatabaseService.insert('leads', newLead);
      addLog(`New Prospect Detected: ${newLead.name}`, config?.agentNames[AgentRole.SALES] || 'Sales');
      return `Lead ${newLead.name} created.`;
    } catch (e: any) {
      setLeads(prev => prev.filter(l => l.id !== newLead.id));
      addLog(`Failed to create lead: ${newLead.name}`, 'System', 'error');
      throw e;
    }
  }, [addLog, config]);

  const addTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'status' | 'createdAt'>) => {
    const newTicket: Ticket = { 
        ...ticketData, 
        id: Date.now().toString(), 
        status: TicketStatus.BACKLOG, 
        createdAt: new Date().toISOString().split('T')[0] 
    };
    setTickets(prev => [...prev, newTicket]);
    try {
      await DatabaseService.insert('tickets', newTicket);
      addLog(`Requirement Logged: ${newTicket.title}`, config?.agentNames[AgentRole.IT] || 'IT');
      return `Ticket #${newTicket.id} logged.`;
    } catch (e: any) {
      setTickets(prev => prev.filter(t => t.id !== newTicket.id));
      addLog(`Failed to log ticket: ${newTicket.title}`, 'System', 'error');
      throw e;
    }
  }, [addLog, config]);

  const addCampaign = useCallback(async (campData: Omit<Campaign, 'id' | 'status' | 'clicks'>) => {
      const newCamp: Campaign = {
          ...campData,
          id: Date.now().toString(),
          status: 'Draft',
          clicks: 0
      };
      setCampaigns(prev => [...prev, newCamp]);
      try {
        await DatabaseService.insert('campaigns', newCamp);
        addLog(`Campaign Strategy: ${newCamp.name}`, config?.agentNames[AgentRole.MARKETING] || 'Marketing');
        return `Campaign ${newCamp.name} drafted.`;
      } catch (e: any) {
        setCampaigns(prev => prev.filter(c => c.id !== newCamp.id));
        addLog(`Failed to draft campaign: ${newCamp.name}`, 'System', 'error');
        throw e;
      }
  }, [addLog, config]);

  const addCustomPage = useCallback(async (pageData: DynamicPage) => {
    setCustomPages(prev => {
        const exists = prev.find(p => p.id === pageData.id);
        if (exists) return prev.map(p => p.id === pageData.id ? pageData : p);
        return [...prev, pageData];
    });
    try {
      await DatabaseService.insert('pages', pageData);
      addLog(`System Module Deployed: ${pageData.name}`, config?.agentNames[AgentRole.IT] || 'IT');
      return `Module ${pageData.name} deployed successfully.`;
    } catch (e: any) {
      setCustomPages(prev => prev.filter(p => p.id !== pageData.id));
      addLog(`Failed to deploy module: ${pageData.name}`, 'System', 'error');
      throw e;
    }
  }, [addLog, config]);

  const addChangeRequest = useCallback(async (req: Omit<ChangeRequest, 'id' | 'status' | 'timestamp'>) => {
      const newReq: ChangeRequest = {
          ...req,
          id: Date.now().toString(),
          status: 'Pending',
          timestamp: new Date().toISOString()
      };
      setChangeRequests(prev => [...prev, newReq]);
      try {
        await DatabaseService.insert('change_log', newReq);
        addLog(`Change Request Logged: ${req.title}`, 'System');
        return `Change Request ${newReq.id} logged.`;
      } catch (e: any) {
        setChangeRequests(prev => prev.filter(r => r.id !== newReq.id));
        addLog(`Failed to log change request: ${req.title}`, 'System', 'error');
        throw e;
      }
  }, [addLog]);

  const updateChangeRequestStatus = useCallback(async (id: string, status: ChangeRequest['status']) => {
      setChangeRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      await DatabaseService.update<ChangeRequest>('change_log', id, { status });
  }, []);

  const addNewUser = useCallback(async (email: string, role: 'admin'|'viewer', password?: string) => {
      const newUser: User = {
          id: Date.now().toString(),
          email,
          name: email.split('@')[0],
          role
      };
      setUsers(prev => [...prev, newUser]);
      await DatabaseService.addUser(newUser, password);
      addLog(`User Access Granted: ${email}`, 'System');
  }, [addLog]);

  const removeUser = useCallback(async (id: string) => {
      setUsers(prev => prev.filter(u => u.id !== id));
      await DatabaseService.deleteUser(id);
      addLog(`User Access Revoked: ID ${id}`, 'System');
  }, [addLog]);

  const resetUserPassword = useCallback(async (email: string) => {
      const resultLink = await DatabaseService.resetPassword(email);
      addLog(`Password Reset Requested: ${email}`, 'System', 'warn');
      return resultLink;
  }, [addLog]);

  const executeAction = useCallback(async (actionName: string, data: any) => {
      switch(actionName) {
          case 'addLead': return await addLead(data);
          case 'addTicket': return await addTicket(data);
          case 'addCampaign': return await addCampaign(data);
          default: return `Unknown action: ${actionName}`;
      }
  }, [addLead, addTicket, addCampaign]);

  return (
    <StoreContext.Provider value={{ 
        user, config, isLoading, currentView, setUser, updateConfig, resetSystem, navigateTo,
        leads, campaigns, tickets, expenses, customPages, logs, metrics, traces, users, changeRequests,
        addLead, addTicket, addCampaign, addCustomPage, addLog, recordTrace, addChangeRequest, updateChangeRequestStatus,
        addNewUser, removeUser, resetUserPassword, executeAction
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
