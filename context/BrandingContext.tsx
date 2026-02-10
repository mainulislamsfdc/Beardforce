import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useOrg } from './OrgContext';
import { agentConfigService, DEFAULT_BRANDING } from '../services/agentConfigService';
import type { OrgBranding } from '../types';

interface BrandingContextType {
  branding: OrgBranding;
  loading: boolean;
  updateBranding: (data: Partial<OrgBranding>) => Promise<void>;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const defaultBranding: OrgBranding = { id: '', org_id: '', ...DEFAULT_BRANDING };

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { org } = useOrg();
  const [branding, setBranding] = useState<OrgBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org?.id) {
      setBranding(defaultBranding);
      setLoading(false);
      return;
    }
    try {
      const data = await agentConfigService.getBranding(org.id);
      if (data) setBranding(data);
    } catch (err) {
      console.warn('Branding load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (branding.app_name) {
      document.title = branding.app_name;
    }
  }, [branding.app_name]);

  const update = useCallback(async (data: Partial<OrgBranding>) => {
    if (!org?.id) return;
    if (branding.id) {
      const updated = await agentConfigService.updateBranding(branding.id, data);
      setBranding(updated);
    } else {
      const updated = await agentConfigService.upsertBranding(org.id, data);
      setBranding(updated);
    }
  }, [org?.id, branding.id]);

  return (
    <BrandingContext.Provider value={{ branding, loading, updateBranding: update, refresh: load }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
};
