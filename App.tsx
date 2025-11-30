import React from 'react';
import Sidebar from './components/Sidebar';
import MeetingRoom from './components/MeetingRoom';
import SalesView from './components/dashboards/SalesView';
import MarketingView from './components/dashboards/MarketingView';
import CEOView from './components/dashboards/CEOView';
import ITView from './components/dashboards/ITView';
import ProjectBoard from './components/ProjectBoard';
import SetupWizard from './components/SetupWizard';
import Settings from './components/Settings';
import Auth from './components/Auth';
import UserManagement from './components/UserManagement';
import IDE from './components/IDE';
import DynamicPageRenderer from './components/DynamicPageRenderer';
import { StoreProvider, useStore } from './context/StoreContext';
import { Loader2 } from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, config, isLoading, currentView, navigateTo, customPages } = useStore();

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-amber-500" size={48} />
        <p className="text-slate-400 animate-pulse">Initializing System...</p>
      </div>
    );
  }

  // 1. Authentication Check
  if (!user) {
    return <Auth />;
  }

  // 2. Configuration Wizard Check
  if (!config) {
    return <SetupWizard />;
  }

  // 3. Main App Render
  const renderView = () => {
    switch (currentView) {
      case 'meeting':
        return <MeetingRoom />;
      case 'sales':
        return <SalesView />;
      case 'marketing':
        return <MarketingView />;
      case 'ceo':
        return <CEOView />;
      case 'it':
        return <ITView />;
      case 'projects':
        return <ProjectBoard />;
      case 'settings':
        return <Settings />;
      case 'users':
        return <UserManagement />;
      case 'ide':
        return <IDE />;
      default:
        // Check for Custom Pages
        const customPage = customPages.find(p => p.id === currentView);
        if (customPage) {
            return <DynamicPageRenderer page={customPage} />;
        }
        return <MeetingRoom />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      <Sidebar currentView={currentView} setView={navigateTo} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center px-8 justify-between backdrop-blur-md z-10">
          <h2 className="text-lg font-medium text-slate-200 capitalize">
            {currentView === 'ceo' ? 'Executive Overview' : currentView === 'it' ? 'IT & Observability' : currentView.replace('-', ' ')}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-300">{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-amber-500">
                {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto h-full">
              {renderView()}
            </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <DashboardLayout />
    </StoreProvider>
  );
};

export default App;