import { LayoutDashboard, Users, FileText, BookOpen, ChevronLeft, ChevronRight, Calendar, LogOut, Cloud, Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface SidebarProps {
  currentView: 'dashboard' | 'clients' | 'forms';
  onChangeView: (view: 'dashboard' | 'clients' | 'forms') => void;
  selectedPeriod: string;
  onChangePeriod: (period: string) => void;
}

export function Sidebar({ currentView, onChangeView, selectedPeriod, onChangePeriod }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (view: 'dashboard' | 'clients' | 'forms') => {
    onChangeView(view);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header (Visible on screens smaller than md) */}
      <div className="md:hidden bg-slate-900 text-white w-full px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-6 h-6 text-blue-400 shrink-0" />
          <span className="font-bold text-base tracking-tight">BIZ-COMPLY</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-400 mr-1.5 shrink-0" />
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => onChangePeriod(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs [color-scheme:dark]"
            />
          </div>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-72 max-w-[80vw] bg-slate-900 text-white h-full flex flex-col shadow-2xl z-10">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <FileText className="w-7 h-7 text-blue-400 shrink-0" />
                <span className="text-lg font-bold tracking-tight">BIZ-COMPLY</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
              <div className="mb-4 px-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Period
                </label>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => onChangePeriod(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
                />
              </div>

              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span className="font-medium">Dashboard</span>
              </button>

              <button
                onClick={() => handleNavClick('clients')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                  currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span className="font-medium">My Clients</span>
              </button>

              <button
                onClick={() => handleNavClick('forms')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                  currentView === 'forms' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-5 h-5 shrink-0" />
                <span className="font-medium">Monitoring Reference</span>
              </button>
            </nav>

            <div className="p-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="font-medium text-slate-300">Supabase Storage</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {isSupabaseConfigured ? 'Synced Central' : 'Cloud Ready'}
                </span>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-2.5 flex items-center justify-between border border-slate-700/50">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-full flex items-center justify-center font-semibold text-xs shrink-0">
                    {getInitials(user?.name)}
                  </div>
                  <div className="flex-1 overflow-hidden pr-1">
                    <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email || user?.role || 'Compliance Officer'}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition-colors shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Permanent Sidebar */}
      <div className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white h-full flex-shrink-0 flex-col transition-all duration-300 ease-in-out relative group`}>
        {/* Header */}
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-800`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-3 overflow-hidden">
              <FileText className="w-7 h-7 text-blue-400 flex-shrink-0" />
              <span className="text-lg font-bold tracking-tight truncate">BIZ-COMPLY</span>
            </div>
          )}
          {isCollapsed && (
            <FileText className="w-7 h-7 text-blue-400 flex-shrink-0 mb-1" />
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto overflow-x-hidden">
          {/* Period Selector */}
          <div className="mb-4">
            {!isCollapsed ? (
              <div className="px-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Period
                </label>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => onChangePeriod(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center group/period relative" title={`Period: ${selectedPeriod}`}>
                <div className="p-2.5 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center cursor-pointer hover:bg-slate-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => onChangePeriod(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title={`Selected Period: ${selectedPeriod}`}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => onChangeView('dashboard')}
            title={isCollapsed ? "Dashboard" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg transition-colors ${
              currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">Dashboard</span>}
          </button>
          
          <button
            onClick={() => onChangeView('clients')}
            title={isCollapsed ? "My Clients" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg transition-colors ${
              currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">My Clients</span>}
          </button>

          <button
            onClick={() => onChangeView('forms')}
            title={isCollapsed ? "Monitoring Reference" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg transition-colors ${
              currentView === 'forms' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">Monitoring Reference</span>}
          </button>
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800 relative space-y-2">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-medium text-slate-300">Supabase Storage</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {isSupabaseConfigured ? 'Synced Central' : 'Cloud Ready'}
              </span>
            </div>
          )}

          <div className={`bg-slate-800/80 rounded-xl p-2.5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border border-slate-700/50`}>
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {getInitials(user?.name)}
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden pr-1">
                  <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || user?.role || 'Compliance Officer'}</p>
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition-colors focus:outline-none flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
