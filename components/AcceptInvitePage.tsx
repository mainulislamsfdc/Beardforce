import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BarChart3, CheckCircle, XCircle, Users, Shield, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { accessControl } from '../services/accessControl';

interface InviteDetails {
  invite_id: string;
  org_id: string;
  org_name: string;
  role: string;
  email: string;
  expires_at: string;
  status: string;
}

const roleInfo: Record<string, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  admin:  { label: 'Admin',  icon: <Shield className="w-4 h-4" />, color: 'text-red-400 bg-red-500/10 border-red-500/30',   description: 'Full access — manage members, settings, and all data' },
  editor: { label: 'Editor', icon: <Users  className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', description: 'Can use agents, create and edit CRM data' },
  viewer: { label: 'Viewer', icon: <Eye    className="w-4 h-4" />, color: 'text-gray-400 bg-gray-500/10 border-gray-500/30', description: 'Read-only access and can chat with agents' },
};

export default function AcceptInvitePage() {
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token') ?? '';
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const { refresh }     = useOrg();

  const [invite,    setInvite]    = useState<InviteDetails | null>(null);
  const [status,    setStatus]    = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'accepting'>('loading');
  const [error,     setError]     = useState('');

  // Load invite details (works unauthenticated via SECURITY DEFINER RPC)
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    accessControl.getInviteDetails(token).then(details => {
      if (!details) { setStatus('invalid'); return; }

      if (details.status === 'accepted') {
        // Already accepted — if logged in, go to dashboard
        if (user) { navigate('/dashboard'); return; }
        setStatus('accepted');
        return;
      }
      if (details.status !== 'pending' || new Date(details.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }
      setInvite(details);
      setStatus('valid');
    }).catch(() => setStatus('invalid'));
  }, [token, user]);

  const handleAccept = async () => {
    if (!user || !token) return;
    setStatus('accepting');
    try {
      await accessControl.acceptInvite(token, user.id);
      await refresh(); // reload OrgContext → user now sees new org
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to accept invite. Please try again.');
      setStatus('valid');
    }
  };

  const storeTokenAndGo = (path: string) => {
    localStorage.setItem('pending_invite_token', token);
    navigate(path);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading invite...</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired ────────────────────────────────────────────────────────
  if (status === 'invalid' || status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {status === 'expired' ? 'Invite link expired' : 'Invalid invite link'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {status === 'expired'
              ? 'This invite link has expired. Ask the workspace admin to send a new one.'
              : 'This invite link is invalid or has already been used.'}
          </p>
          <Link to="/" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
            ← Back to RunwayCRM
          </Link>
        </div>
      </div>
    );
  }

  // ── Valid invite ─────────────────────────────────────────────────────────────
  const role = invite ? roleInfo[invite.role] ?? roleInfo.viewer : null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 border-b border-gray-800 px-6 py-4 flex items-center gap-2">
        <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white">RunwayCRM</span>
      </nav>

      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center mt-16">
        {/* Org avatar */}
        <div className="w-16 h-16 bg-orange-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl font-bold text-orange-400">
          {invite?.org_name?.[0]?.toUpperCase() ?? 'O'}
        </div>

        <h2 className="text-xl font-semibold text-white mb-1">You're invited!</h2>
        <p className="text-gray-400 text-sm mb-6">
          Join <span className="text-white font-medium">{invite?.org_name}</span> on RunwayCRM
        </p>

        {/* Role badge */}
        {role && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${role.color} mb-2`}>
            {role.icon}
            {role.label}
          </div>
        )}
        {role && <p className="text-xs text-gray-500 mb-6">{role.description}</p>}

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* CTA buttons */}
        {user ? (
          // Already logged in — one-click accept
          <button
            onClick={handleAccept}
            disabled={status === 'accepting'}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {status === 'accepting' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Joining…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Accept Invitation
              </>
            )}
          </button>
        ) : (
          // Not logged in — give options
          <div className="space-y-3">
            <button
              onClick={() => storeTokenAndGo('/login')}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
            >
              Login to accept
            </button>
            <button
              onClick={() => storeTokenAndGo('/register')}
              className="w-full py-3 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-xl font-medium transition-colors"
            >
              Create account &amp; join
            </button>
            <p className="text-xs text-gray-500">
              After signing in, you'll automatically be added to <strong className="text-gray-400">{invite?.org_name}</strong>.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-600 mt-5">
          Expires {invite ? new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </p>
      </div>
    </div>
  );
}
