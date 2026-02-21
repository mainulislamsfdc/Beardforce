import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { accessControl } from '../services/accessControl';
import { databaseService } from '../services/database';
import type { OrgRole, Organization, OrgMember } from '../types';

interface OrgContextType {
  org: Organization | null;
  membership: OrgMember | null;
  role: OrgRole | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrgMember | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = async () => {
    if (!user) {
      setOrg(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      let m = await accessControl.getCurrentMembership(user.id);

      // Auto-provision: if no membership exists, create org and assign admin
      if (!m) {
        try {
          const email = user.email || '';
          const orgName = `${email.split('@')[0]}'s Organization`;
          await accessControl.createOrganization(orgName, user.id);
          m = await accessControl.getCurrentMembership(user.id);
        } catch (provisionError) {
          console.warn('Auto-provision org skipped:', provisionError);
        }
      }

      // Check for a pending invite token stored before redirect to login/register
      const pendingToken = localStorage.getItem('pending_invite_token');
      if (pendingToken && user?.id) {
        localStorage.removeItem('pending_invite_token');
        try {
          await accessControl.acceptInvite(pendingToken, user.id);
          // Reload membership — user is now in the invited org
          m = await accessControl.getCurrentMembership(user.id);
        } catch (e) {
          console.warn('Auto-accept invite failed:', e);
        }
      }

      setMembership(m);

      if (m?.org_id) {
        const o = await accessControl.getOrganization(m.org_id);
        setOrg(o);
        // Make DatabaseService aware of the org so new records are tagged org_id
        databaseService.setOrgId(m.org_id);
      } else {
        setOrg(null);
      }
    } catch (error) {
      console.error('Failed to load org membership:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembership();
  }, [user?.id]); // primitive id — avoids re-firing on token refresh (user object ref changes)

  const role = membership?.role ?? null;

  return (
    <OrgContext.Provider
      value={{
        org,
        membership,
        role,
        loading,
        isAdmin: role === 'admin',
        isEditor: role === 'admin' || role === 'editor',
        refresh: loadMembership,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
};
