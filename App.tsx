import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrgProvider } from './context/OrgContext';
import { NotificationProvider } from './context/NotificationContext';
import { AgentConfigProvider } from './context/AgentConfigContext';
import { BrandingProvider } from './context/BrandingContext';
import { FieldConfigProvider } from './context/FieldConfigContext';
import ToastContainer from './components/ToastContainer';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';

// Lazy load all authenticated pages for code splitting
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const ITAgentChat = lazy(() => import('./components/ITAgentChat'));
const SalesAgentChat = lazy(() => import('./components/SalesAgentChat'));
const MarketingAgentChat = lazy(() => import('./components/MarketingAgentChat'));
const CEOAgentChat = lazy(() => import('./components/CEOAgentChat'));
const VoiceAgentHub = lazy(() => import('./components/VoiceAgentHub'));
const ApprovalQueue = lazy(() => import('./components/ApprovalQueue'));
const LeadManagement = lazy(() => import('./components/LeadManagement'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const DataBrowser = lazy(() => import('./components/DataBrowser'));
const AuditTrailPage = lazy(() => import('./components/AuditTrailPage'));
const WorkflowsPage = lazy(() => import('./components/WorkflowsPage'));
const TeamsMeetingRoom = lazy(() => import('./components/TeamsMeetingRoom'));
const CodeEditorPage = lazy(() => import('./components/CodeEditorPage'));

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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* All authenticated routes share the Layout with sidebar */}
              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/it-agent" element={<ITAgentChat />} />
                <Route path="/sales-agent" element={<SalesAgentChat />} />
                <Route path="/marketing-agent" element={<MarketingAgentChat />} />
                <Route path="/ceo-agent" element={<CEOAgentChat />} />
                <Route path="/voice" element={<VoiceAgentHub />} />
                <Route path="/approvals" element={<ApprovalQueue />} />
                <Route path="/leads" element={<LeadManagement />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/audit" element={<AuditTrailPage />} />
                <Route path="/workflows" element={<WorkflowsPage />} />
                <Route path="/meeting" element={<TeamsMeetingRoom />} />
                <Route path="/code-editor" element={<CodeEditorPage />} />
                <Route path="/database/:tableName" element={<DataBrowser />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" />} />
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
