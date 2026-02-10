import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useOrg } from './OrgContext';
import { agentConfigService } from '../services/agentConfigService';
import type { FieldConfig } from '../types';

interface FieldConfigContextType {
  fields: FieldConfig[];
  loading: boolean;
  getFieldConfig: (entity: string, fieldKey: string) => FieldConfig | null;
  getVisibleFields: (entity: string) => FieldConfig[];
  refresh: () => Promise<void>;
}

const FieldConfigContext = createContext<FieldConfigContextType | undefined>(undefined);

const DEFAULT_FIELD_CONFIGS: FieldConfig[] = [
  {
    id: '', org_id: '', entity: 'lead', field_key: 'beard_type',
    display_name: 'Category', field_type: 'select',
    options: ['Type A', 'Type B', 'Type C', 'None'],
    is_visible: true, sort_order: 1,
  },
];

export const FieldConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { org } = useOrg();
  const [fields, setFields] = useState<FieldConfig[]>(DEFAULT_FIELD_CONFIGS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org?.id) {
      setFields(DEFAULT_FIELD_CONFIGS);
      setLoading(false);
      return;
    }
    try {
      const data = await agentConfigService.getFieldConfigs(org.id);
      if (data.length > 0) setFields(data);
    } catch (err) {
      console.warn('Field config load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const getFieldConfig = useCallback((entity: string, fieldKey: string): FieldConfig | null => {
    return fields.find(f => f.entity === entity && f.field_key === fieldKey) || null;
  }, [fields]);

  const getVisibleFields = useCallback((entity: string): FieldConfig[] => {
    return fields.filter(f => f.entity === entity && f.is_visible).sort((a, b) => a.sort_order - b.sort_order);
  }, [fields]);

  return (
    <FieldConfigContext.Provider value={{ fields, loading, getFieldConfig, getVisibleFields, refresh: load }}>
      {children}
    </FieldConfigContext.Provider>
  );
};

export const useFieldConfig = () => {
  const ctx = useContext(FieldConfigContext);
  if (!ctx) throw new Error('useFieldConfig must be used within FieldConfigProvider');
  return ctx;
};
