import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initAppearance } from './components/settings/AppearanceTab';
import { AuthProvider } from './context/AuthContext';
import { OrgProvider } from './context/OrgContext';
import { NotificationProvider } from './context/NotificationContext';
import { AgentConfigProvider } from './context/AgentConfigContext';
import { BrandingProvider } from './context/BrandingContext';
import { FieldConfigProvider } from './context/FieldConfigContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import LandingPage from './components/LandingPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import AcceptInvitePage from './components/AcceptInvitePage';
import ContactPage from './components/ContactPage';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';

// Lazy load all authenticated pages for code splitting
const MeetingRoomPage = lazy(() => import('./components/meeting/MeetingRoomPage'));
const VoiceAgentHub = lazy(() => import('./components/VoiceAgentHub'));
const ApprovalQueue = lazy(() => import('./components/ApprovalQueue'));
const LeadManagement = lazy(() => import('./components/LeadManagement'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const DataBrowser = lazy(() => import('./components/DataBrowser'));
const AuditTrailPage = lazy(() => import('./components/AuditTrailPage'));
const WorkflowsPage = lazy(() => import('./components/WorkflowsPage'));
const CodeEditorPage = lazy(() => import('./components/CodeEditorPage'));
const HelpPage = lazy(() => import('./components/HelpPage'));

// Apply saved appearance before first paint (synchronous)
initAppearance();

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <AgentConfigProvider>
        <BrandingProvider>
        <FieldConfigProvider>
        <NotificationProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* ── Public routes ───────────────────────────────── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* ── Authenticated routes (Layout with sidebar) ── */}
              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/dashboard" element={
                  <ErrorBoundary label="Meeting Room">
                    <MeetingRoomPage />
                  </ErrorBoundary>
                } />
                <Route path="/voice" element={<VoiceAgentHub />} />
                <Route path="/approvals" element={<ApprovalQueue />} />
                <Route path="/leads" element={<LeadManagement />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/audit" element={<AuditTrailPage />} />
                <Route path="/workflows" element={<WorkflowsPage />} />
                <Route path="/code-editor" element={<CodeEditorPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/database/:tableName" element={<DataBrowser />} />
              </Route>

              {/* Redirect /app to dashboard for backward compat */}
              <Route path="/app" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
          <ToastContainer />
        </Router>
        </NotificationProvider>
        </FieldConfigProvider>
        </BrandingProvider>
        </AgentConfigProvider>
      </OrgProvider>
    </AuthProvider>
  );
}

export default App;
