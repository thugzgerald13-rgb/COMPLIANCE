import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Sun, 
  Moon, 
  ShieldCheck, 
  SlidersHorizontal, 
  Share2, 
  Crown, 
  Menu, 
  X,
  Calendar,
  UserCheck
} from 'lucide-react';

export type BusinessTab = 'overview' | 'forms' | 'messaging' | 'settings';

interface BusinessSidebarProps {
  currentTab: BusinessTab;
  onChangeTab: (tab: BusinessTab) => void;
  activeClient: Client;
  selectedPeriod: string;
  onChangePeriod: (period: string) => void;
  onOpenManageForms?: () => void;
  onOpenShareModal?: () => void;
  onOpenDashboardModeModal?: () => void;
  onSwitchBackToPractice?: () => void;
}

export function BusinessSidebar({
  currentTab,
  onChangeTab,
  activeClient,
  selectedPeriod,
  onChangePeriod,
  onOpenManageForms,
  onOpenShareModal,
  onOpenDashboardModeModal,
  onSwitchBackToPractice
}: BusinessSidebarProps) {
  const { user, isSuperAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const desktopSidebarRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  // Close desktop sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Collapse desktop sidebar if expanded and click is outside
      if (!isCollapsed && desktopSidebarRef.current && !desktopSidebarRef.current.contains(target)) {
        setIsCollapsed(true);
      }

      // Close mobile drawer if open and click is outside
      if (isMobileOpen && mobileDrawerRef.current && !mobileDrawerRef.current.contains(target)) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, isMobileOpen]);

  const handleTabClick = (tab: BusinessTab) => {
    onChangeTab(tab);
    setIsCollapsed(true);
    setIsMobileOpen(false);
  };

  const navItems: { id: BusinessTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Tax Overview', icon: LayoutDashboard },
    { id: 'forms', label: 'BIR Tax Returns', icon: FileText },
    { id: 'messaging', label: 'CPA Messaging', icon: MessageSquare },
    { id: 'settings', label: 'Company Profile', icon: Building2 },
  ];

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white shrink-0 font-bold text-xs">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-white truncate">{activeClient.name}</h1>
              <p className="text-[10px] text-blue-400 font-mono font-bold">TIN: {activeClient.tin}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => onChangePeriod(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs font-mono text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Mobile Overlay Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          <div 
            ref={mobileDrawerRef}
            className="relative w-72 max-w-[80vw] bg-slate-900 text-white h-full flex flex-col shadow-2xl z-50 border-r border-slate-800"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white shrink-0 font-black text-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white truncate">{activeClient.name}</h2>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider block w-fit mt-0.5">
                    Business Account
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                Business Portal
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
                <div className="px-3 py-1 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                  Quick Actions
                </div>
                {onOpenManageForms && (
                  <button
                    onClick={() => { onOpenManageForms(); setIsMobileOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                    <span>Self-Assign Forms</span>
                  </button>
                )}
                {onOpenShareModal && (
                  <button
                    onClick={() => { onOpenShareModal(); setIsMobileOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    <span>Share Client Portal</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Theme Mode</span>
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
                </button>
              </div>

              <button
                onClick={logout}
                className="w-full px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Permanent Sidebar */}
      <div 
        ref={desktopSidebarRef} 
        className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white h-full flex-shrink-0 flex-col transition-all duration-300 ease-in-out relative border-r border-slate-800 z-20 group`}
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-30 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-500 transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Brand Header */}
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-800 shrink-0`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center text-white shrink-0 font-black text-lg shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-black text-white truncate tracking-tight">{activeClient.name}</h2>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Business Account
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Period Selector Widget */}
        <div className={`p-3 border-b border-slate-800/80 bg-slate-950/40 ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed ? (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" />
                Tax Period
              </label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => onChangePeriod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          ) : (
            <div title={`Tax Period: ${selectedPeriod}`} className="text-[11px] font-mono font-bold text-blue-400 text-center py-1">
              {selectedPeriod.split('-')[1]}/{selectedPeriod.split('-')[0].slice(2)}
            </div>
          )}
        </div>

        {/* Nav Links */}
        <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 py-1 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
              Tax Navigation
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'} py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          {!isCollapsed && (
            <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-1.5">
              <div className="px-3 py-1 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                Actions & Setup
              </div>

              {onOpenManageForms && (
                <button
                  onClick={() => { onOpenManageForms(); setIsCollapsed(true); }}
                  className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Self-Assign BIR Forms</span>
                </button>
              )}

              {onOpenShareModal && (
                <button
                  onClick={() => { onOpenShareModal(); setIsCollapsed(true); }}
                  className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Share Client Portal</span>
                </button>
              )}

              {onOpenDashboardModeModal && (
                <button
                  onClick={() => { onOpenDashboardModeModal(); setIsCollapsed(true); }}
                  className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Dashboard Setup Mode</span>
                </button>
              )}

              {onSwitchBackToPractice && (
                <button
                  onClick={onSwitchBackToPractice}
                  className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Practice View</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sync Status Box */}
        {!isCollapsed && (
          <div className="mx-3 mb-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {user?.isSyncedWithAccountant || user?.syncedAccountantEmail ? 'CPA Practice Linked' : 'Self-Managed'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.syncedAccountantName || user?.syncedAccountantEmail || 'Link your designated CPA firm'}
            </p>
          </div>
        )}

        {/* User Footer Profile */}
        <div className={`p-3 border-t border-slate-800 bg-slate-950/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          {!isCollapsed && (
            <div className="min-w-0 flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-black text-xs shrink-0">
                {(user?.name || user?.email || 'B')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Business Owner'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Toggle Theme Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
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
