import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Users, CheckSquare, Mic, LogOut, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings, Table2, ChevronDown, ChevronRight, Shield, GitBranch, Code2, HelpCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { useBranding } from '../context/BrandingContext';
import NotificationBell from './NotificationBell';

export const Layout: React.FC = () => {
  // Desktop: sidebar collapsed/expanded. Mobile: drawer open/closed.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dbSectionOpen, setDbSectionOpen] = useState(false);
  const [mgmtSectionOpen, setMgmtSectionOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useOrg();
  const { branding } = useBranding();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const managementItems = [
    { path: '/leads', label: 'Lead Management', icon: Users },
    { path: '/approvals', label: 'Approval Queue', icon: CheckSquare },
    { path: '/workflows', label: 'Workflows', icon: GitBranch },
    { path: '/voice', label: 'Voice Interface', icon: Mic },
    { path: '/code-editor', label: 'Code Editor', icon: Code2 },
    { path: '/audit', label: 'Audit Trail', icon: Shield },
    { path: '/help', label: 'Help & Docs', icon: HelpCircle },
    ...(isAdmin ? [{ path: '/settings', label: 'Settings', icon: Settings }] : []),
  ];

  const navItems = [
    { section: 'main', items: [
      { path: '/dashboard', label: 'Meeting Room', icon: LayoutDashboard }
    ]},
    { section: 'Management', items: managementItems },
    { section: 'Database', items: [
      { path: '/database/leads', label: 'Leads', icon: Table2 },
      { path: '/database/contacts', label: 'Contacts', icon: Table2 },
      { path: '/database/accounts', label: 'Accounts', icon: Table2 },
      { path: '/database/opportunities', label: 'Opportunities', icon: Table2 },
      { path: '/database/orders', label: 'Orders', icon: Table2 },
      { path: '/database/products', label: 'Products', icon: Table2 },
    ]}
  ];

  const roleBadgeColor = role === 'admin' ? 'text-orange-400' : role === 'editor' ? 'text-blue-400' : 'text-gray-400';

  // Close mobile drawer when navigating
  const handleNavClick = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — mobile: fixed overlay drawer; desktop: inline collapsible */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-800 border-r border-gray-700
          transition-transform duration-300
          md:relative md:z-auto md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden'}
          w-72
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between min-w-[240px]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: branding.accent_color || '#f97316' }}>
              {branding.logo_initial || 'R'}
            </div>
            <span className="text-white font-semibold">{branding.app_name || 'RunwayCRM'}</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 min-w-[240px]">
          {navItems.map((group) => {
            const isCollapsible = group.section === 'Database' || group.section === 'Management';
            const isOpen = group.section === 'Database' ? dbSectionOpen : group.section === 'Management' ? mgmtSectionOpen : true;

            return (
              <div key={group.section} className={group.section !== 'main' ? 'mt-6 px-4' : ''}>
                {group.section !== 'main' && (
                  <div
                    className={`flex items-center justify-between mb-2 ${isCollapsible ? 'cursor-pointer hover:text-gray-300' : ''}`}
                    onClick={() => {
                      if (group.section === 'Database') setDbSectionOpen(!dbSectionOpen);
                      if (group.section === 'Management') setMgmtSectionOpen(!mgmtSectionOpen);
                    }}
                  >
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {group.section}
                    </h3>
                    {isCollapsible && (
                      <span className="text-gray-500">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    )}
                  </div>
                )}
                {isOpen && group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        group.section === 'main' ? '' : 'rounded'
                      } ${
                        active
                          ? group.section === 'main'
                            ? 'text-orange-400 bg-gray-700 border-l-4 border-orange-400'
                            : 'text-white bg-gray-700'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User + Sign Out */}
        <div className="border-t border-gray-700 p-4 min-w-[240px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {(user?.user_metadata?.full_name || user?.email)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.user_metadata?.full_name || user?.email || 'User'}
              </p>
              <p className={`text-xs font-medium ${roleBadgeColor}`}>{role?.toUpperCase() || 'MEMBER'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            <Menu size={20} />
          </button>
          {/* Desktop panel toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <div className="text-gray-400 text-sm">
            {navItems.flatMap(g => g.items).find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))?.label
              || (location.pathname.startsWith('/database/') ? location.pathname.split('/')[2]?.charAt(0).toUpperCase() + location.pathname.split('/')[2]?.slice(1) + ' Database' : branding.app_name || 'RunwayCRM')}
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
