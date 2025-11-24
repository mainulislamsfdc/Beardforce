import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Campaign, Expense, Lead, Ticket, SystemLog, TicketStatus, AgentRole } from '../types';
import { INITIAL_CAMPAIGNS, INITIAL_EXPENSES, INITIAL_LEADS, INITIAL_LOGS, INITIAL_TICKETS } from '../constants';

interface StoreContextType {
  leads: Lead[];
  campaigns: Campaign[];
  tickets: Ticket[];
  expenses: Expense[];
  logs: SystemLog[];
  addLead: (lead: Omit<Lead, 'id' | 'status'>) => string;
  addTicket: (ticket: Omit<Ticket, 'id' | 'status' | 'createdAt'>) => string;
  addCampaign: (camp: Omit<Campaign, 'id' | 'status' | 'clicks'>) => string;
  addLog: (action: string, agent: AgentRole) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);

  const addLog = useCallback((action: string, agent: AgentRole) => {
      setLogs(prev => [{
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          action,
          agent
      }, ...prev]);
  }, []);

  const addLead = useCallback((leadData: Omit<Lead, 'id' | 'status'>) => {
    const newLead: Lead = { ...leadData, id: Date.now().toString(), status: 'New' };
    setLeads(prev => [...prev, newLead]);
    addLog(`New Lead Created: ${newLead.name}`, AgentRole.SALES);
    return `Lead ${newLead.name} created successfully.`;
  }, [addLog]);

  const addTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'status' | 'createdAt'>) => {
    const newTicket: Ticket = { 
        ...ticketData, 
        id: Date.now().toString(), 
        status: TicketStatus.BACKLOG, 
        createdAt: new Date().toISOString().split('T')[0] 
    };
    setTickets(prev => [...prev, newTicket]);
    addLog(`Ticket Created: ${newTicket.title}`, AgentRole.IT);
    return `Ticket #${newTicket.id} created and assigned to ${newTicket.assignee}.`;
  }, [addLog]);

  const addCampaign = useCallback((campData: Omit<Campaign, 'id' | 'status' | 'clicks'>) => {
      const newCamp: Campaign = {
          ...campData,
          id: Date.now().toString(),
          status: 'Draft',
          clicks: 0
      };
      setCampaigns(prev => [...prev, newCamp]);
      addLog(`Campaign Drafted: ${newCamp.name}`, AgentRole.MARKETING);
      return `Campaign ${newCamp.name} created as Draft.`;
  }, [addLog]);

  return (
    <StoreContext.Provider value={{ leads, campaigns, tickets, expenses, logs, addLead, addTicket, addCampaign, addLog }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};