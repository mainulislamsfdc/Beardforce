import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrgProvider } from './context/OrgContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { PrivateRoute } from './components/PrivateRoute';
import { Layout } from './components/Layout';
import DashboardPage from './components/DashboardPage';
import { ITAgentChat } from './components/ITAgentChat';
import { ApprovalQueue } from './components/ApprovalQueue';
import { LeadManagement } from './components/LeadManagement';
import { SalesAgentChat } from './components/SalesAgentChat';
import { MarketingAgentChat } from './components/MarketingAgentChat';
import { CEOAgentChat } from './components/CEOAgentChat';
import { VoiceAgentHub } from './components/VoiceAgentHub';
import { SettingsPage } from './components/SettingsPage';
import { DataBrowser } from './components/DataBrowser';

function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <Router>
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
              <Route path="/database/:tableName" element={<DataBrowser />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </OrgProvider>
    </AuthProvider>
  );
}

export default App;
