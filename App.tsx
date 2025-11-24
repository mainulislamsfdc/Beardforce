import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MeetingRoom from './components/MeetingRoom';
import SalesView from './components/dashboards/SalesView';
import MarketingView from './components/dashboards/MarketingView';
import CEOView from './components/dashboards/CEOView';
import ITView from './components/dashboards/ITView';
import ProjectBoard from './components/ProjectBoard';
import { StoreProvider } from './context/StoreContext';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('meeting');

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
      default:
        return <MeetingRoom />;
    }
  };

  return (
    <StoreProvider>
      <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
        <Sidebar currentView={currentView} setView={setCurrentView} />
        
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* Top Bar */}
          <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center px-8 justify-between backdrop-blur-md z-10">
            <h2 className="text-lg font-medium text-slate-200 capitalize">
              {currentView === 'ceo' ? 'Executive Overview' : currentView.replace('-', ' ')}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">Connected as Owner</span>
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
                 <span className="font-bold text-xs">YO</span>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
             <div className="max-w-7xl mx-auto h-full">
                {renderView()}
             </div>
          </div>
        </main>
      </div>
    </StoreProvider>
  );
};

export default App;
