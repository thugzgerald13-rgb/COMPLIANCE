import { LayoutDashboard, Users, User, FileText, BookOpen, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Calendar, CalendarDays, LogOut, Cloud, Menu, X, Settings, Sun, Moon, Crown, Lock, Sparkles, ShieldCheck, Rocket, Zap, MessageSquare } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeatureRelease } from '../context/FeatureReleaseContext';
import { useTheme } from '../context/ThemeContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { Client, FormReference, BIRForm } from '../types';
import { 
  getDueFormsForNotification, 
  loadNotificationSettings, 
  NotificationSettings,
  syncServiceWorkerDueItems 
} from '../utils/notificationService';
import { NotificationHubModal } from './NotificationHubModal';
import { AdminFeatureReleaseModal } from './AdminFeatureReleaseModal';
import { OfficerMessagingModal } from './OfficerMessagingModal';

interface SidebarProps {
  currentView: 'dashboard' | 'clients' | 'forms' | 'calendar';
  onChangeView: (view: 'dashboard' | 'clients' | 'forms' | 'calendar') => void;
  selectedPeriod: string;
  onChangePeriod: (period: string) => void;
  clients?: Client[];
  formReferences?: FormReference[];
  onUpdateForm?: (
    clientId: string,
    formId: string,
    updates: Partial<BIRForm>,
    formMeta?: { code: string; description: string; deadline: string; period: string }
  ) => void;
}

export function Sidebar({ 
  currentView, 
  onChangeView, 
  selectedPeriod, 
  onChangePeriod,
  clients = [],
  formReferences = [],
  onUpdateForm
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminReleaseModalOpen, setIsAdminReleaseModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOfficerMessagingOpen, setIsOfficerMessagingOpen] = useState(false);
  const [selectedMessagingClientEmail, setSelectedMessagingClientEmail] = useState<string | undefined>(undefined);
  const [showLockedNotice, setShowLockedNotice] = useState(false);
  const { 
    user, 
    isSuperAdmin,
    logout, 
    workspaceMode, 
    setWorkspaceMode,
    toggleWorkspaceMode,
    resetWorkspaceMode, 
    subscriptionTier, 
    isWorkspaceLocked, 
    upgradeToSubscriber, 
    unlockWorkspaceMode 
  } = useAuth();
  const { featureUpdates } = useFeatureRelease();
  const { theme, toggleTheme } = useTheme();

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => 
    loadNotificationSettings(user?.email)
  );

  useEffect(() => {
    if (user?.email) {
      setNotificationSettings(loadNotificationSettings(user.email));
    }
  }, [user?.email]);

  const dueItems = getDueFormsForNotification(clients, formReferences, selectedPeriod);

  // Automatically sync tax compliance items to Service Worker for background 8:00 AM Philippine Time (GMT+8) push
  useEffect(() => {
    if (dueItems && dueItems.length >= 0) {
      syncServiceWorkerDueItems(dueItems);
    }
  }, [clients, formReferences, selectedPeriod]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const desktopUserMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const collapsedMonthInputRef = useRef<HTMLInputElement>(null);

  const handleCollapsedPeriodClick = () => {
    if (collapsedMonthInputRef.current) {
      try {
        if ('showPicker' in collapsedMonthInputRef.current) {
          (collapsedMonthInputRef.current as any).showPicker();
        } else {
          collapsedMonthInputRef.current.focus();
          collapsedMonthInputRef.current.click();
        }
      } catch {
        collapsedMonthInputRef.current.focus();
        collapsedMonthInputRef.current.click();
      }
    }
  };

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (desktopUserMenuRef.current && desktopUserMenuRef.current.contains(target)) ||
        (mobileUserMenuRef.current && mobileUserMenuRef.current.contains(target))
      ) {
        return;
      }
      setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleNavClick = (view: 'dashboard' | 'clients' | 'forms' | 'calendar') => {
    onChangeView(view);
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
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
            className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none cursor-pointer"
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
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span className="font-medium">Dashboard</span>
              </button>

              <button
                onClick={() => handleNavClick('calendar')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                  currentView === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CalendarDays className="w-5 h-5 shrink-0" />
                <span className="font-medium">Workload Calendar</span>
              </button>

              <button
                onClick={() => handleNavClick('clients')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                  currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span className="font-medium">My Clients</span>
              </button>

              <button
                onClick={() => handleNavClick('forms')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                  currentView === 'forms' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-5 h-5 shrink-0" />
                <span className="font-medium">Monitoring Reference</span>
              </button>

              <button
                onClick={() => {
                  setIsOfficerMessagingOpen(true);
                  setIsMobileOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <MessageSquare className="w-5 h-5 shrink-0 text-blue-400" />
                <span className="font-medium">Client Messages</span>
              </button>
            </nav>

            <div ref={mobileUserMenuRef} className="p-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="font-medium text-slate-300">Supabase Storage</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {isSupabaseConfigured ? 'Synced Central' : 'Cloud Ready'}
                </span>
              </div>

              {/* Clickable Collapsible User Profile Card (Mobile) */}
              {isUserMenuOpen && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 space-y-2 shadow-2xl text-slate-100">
                  {/* Subscription Status Banner */}
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-xs">
                    {subscriptionTier === 'free_trial' ? (
                      <>
                        <div className="flex items-center space-x-1 text-emerald-400 font-bold text-[11px]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Free Trial</span>
                        </div>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsMobileOpen(false);
                            upgradeToSubscriber();
                          }}
                          className="px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-[10px] rounded hover:brightness-110 transition-all cursor-pointer shadow-xs flex items-center space-x-1"
                          title="Click to Subscribe and lock in your workspace mode"
                        >
                          <Crown className="w-3 h-3 fill-slate-950" />
                          <span>Upgrade</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center space-x-1 text-amber-300 font-bold text-[11px]">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Subscriber Plan</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                          <Lock className="w-2.5 h-2.5 text-amber-400" />
                          <span>Locked</span>
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => toggleTheme()}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-700/80 transition-colors cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Theme: Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Theme: Dark Mode</span>
                      </>
                    )}
                  </button>

                  {(isSuperAdmin || user?.role?.includes('Admin') || user?.email?.includes('gerald13')) && (
                    <button
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsUserMenuOpen(false);
                        setIsMobileOpen(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-700/80 transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Notification Settings</span>
                    </button>
                  )}

                  {/* Workspace Mode Action / Locked Indicator */}
                  {subscriptionTier === 'free_trial' ? (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMobileOpen(false);
                        resetWorkspaceMode();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 transition-colors cursor-pointer border border-emerald-500/30 bg-emerald-500/5"
                    >
                      <div className="flex items-center space-x-2.5">
                        {workspaceMode === 'single' ? (
                          <User className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Users className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                        <span>Switch Workspace Mode</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">Trial</span>
                    </button>
                  ) : (
                    <div className="w-full p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                        <div className="flex items-center space-x-2">
                          {workspaceMode === 'single' ? (
                            <User className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                          <span>Workspace: {workspaceMode === 'single' ? 'Single-User' : 'Multi-User'}</span>
                        </div>
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-400">Locked under active subscription plan.</p>
                      {(user?.role === 'Super Admin' || user?.email?.includes('gerald13')) && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsMobileOpen(false);
                            unlockWorkspaceMode();
                            resetWorkspaceMode(true);
                          }}
                          className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer pt-1"
                        >
                          Developer Unlock
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer border-t border-slate-700/50 pt-2 mt-1"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`w-full bg-slate-800/80 hover:bg-slate-800 rounded-xl p-2.5 flex items-center justify-between border ${isUserMenuOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-700/50'} cursor-pointer transition-all hover:border-slate-600 group/user text-left`}
                title="Click for Theme, Settings & Logout options"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 relative">
                    {getInitials(user?.name)}
                    {dueItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-slate-900 rounded-full animate-ping" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden pr-1">
                    <div className="flex items-center space-x-1">
                      <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || 'User'}</p>
                      {(user?.role?.includes('Admin') || user?.email?.includes('gerald13')) && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full flex items-center shrink-0">
                          <Crown className="w-2.5 h-2.5 mr-0.5 text-amber-400" />
                          <span>Developer</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email || user?.role || 'Compliance Officer'}</p>
                  </div>
                </div>
                <div className="text-slate-400 group-hover/user:text-white transition-colors shrink-0">
                  {isUserMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
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
              <div 
                onClick={handleCollapsedPeriodClick}
                className="flex flex-col items-center justify-center relative cursor-pointer group/period" 
                title={`Period: ${selectedPeriod} (Click to change)`}
              >
                <button
                  type="button"
                  onClick={handleCollapsedPeriodClick}
                  className="w-10 h-10 rounded-lg bg-slate-800 text-blue-400 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/60 shadow-sm"
                  title={`Period: ${selectedPeriod} (Click to change)`}
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <input
                  ref={collapsedMonthInputRef}
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => onChangePeriod(e.target.value)}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      if ('showPicker' in e.currentTarget) {
                        (e.currentTarget as any).showPicker();
                      }
                    } catch {}
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto"
                  title={`Selected Period: ${selectedPeriod}`}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => {
              onChangeView('dashboard');
              setIsUserMenuOpen(false);
            }}
            title={isCollapsed ? "Dashboard" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg transition-colors cursor-pointer ${
              currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">Dashboard</span>}
          </button>

          <button
            onClick={() => {
              onChangeView('calendar');
              setIsUserMenuOpen(false);
            }}
            title={isCollapsed ? "Workload Calendar" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg transition-colors cursor-pointer ${
              currentView === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">Workload Calendar</span>}
          </button>
          
          <button
            onClick={() => {
              onChangeView('clients');
              setIsUserMenuOpen(false);
            }}
            title={isCollapsed ? "My Clients" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg transition-colors cursor-pointer ${
              currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">My Clients</span>}
          </button>

          <button
            onClick={() => {
              onChangeView('forms');
              setIsUserMenuOpen(false);
            }}
            title={isCollapsed ? "Monitoring Reference" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg transition-colors cursor-pointer ${
              currentView === 'forms' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">Monitoring Reference</span>}
          </button>

          <button
            onClick={() => {
              setIsOfficerMessagingOpen(true);
              setIsUserMenuOpen(false);
            }}
            title={isCollapsed ? "Client Messages" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer`}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0 text-blue-400" />
            {!isCollapsed && <span className="font-medium truncate">Client Messages</span>}
          </button>
        </nav>

        {/* User Profile Footer - Clickable for Settings & Notification Hub */}
        <div ref={desktopUserMenuRef} className="p-3 border-t border-slate-800 relative space-y-2">
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

          {/* Collapsible Menu Options */}
          {isUserMenuOpen && (
            <div className={`bg-slate-800 border border-slate-700 rounded-xl p-2 space-y-2 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-150 ${isCollapsed ? 'flex flex-col items-center justify-center' : ''}`}>
              
              {/* Subscription Status Pill */}
              {!isCollapsed ? (
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-between text-xs">
                  {subscriptionTier === 'free_trial' ? (
                    <>
                      <div className="flex items-center space-x-1 text-emerald-400 font-bold text-[11px]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Free Trial</span>
                      </div>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          upgradeToSubscriber();
                        }}
                        className="px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-[10px] rounded hover:brightness-110 transition-all cursor-pointer shadow-xs flex items-center space-x-1"
                        title="Click to Subscribe and lock in your workspace mode"
                      >
                        <Crown className="w-3 h-3 fill-slate-950" />
                        <span>Upgrade</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1 text-amber-300 font-bold text-[11px]">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Subscriber Plan</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>Locked</span>
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {subscriptionTier === 'free_trial' ? (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        upgradeToSubscriber();
                      }}
                      className="p-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors cursor-pointer"
                      title="Free Trial (Click to Upgrade to Subscriber)"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="p-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg" title="Subscriber Plan (Locked)">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  toggleTheme();
                  setIsUserMenuOpen(false);
                }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'} rounded-lg text-xs font-semibold hover:bg-slate-700/80 transition-colors cursor-pointer`}
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                    {!isCollapsed && <span>Theme: Light Mode</span>}
                  </>
                ) : (
                  <>
                    <Moon className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                    {!isCollapsed && <span>Theme: Dark Mode</span>}
                  </>
                )}
              </button>

              {(isSuperAdmin || user?.role?.includes('Admin') || user?.email?.includes('gerald13')) && (
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'} rounded-lg text-xs font-semibold hover:bg-slate-700/80 transition-colors cursor-pointer`}
                  title="Automated Email & Phone Dispatcher Settings (Developer Only)"
                >
                  <Settings className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                  {!isCollapsed && <span>Notification Settings</span>}
                </button>
              )}

              {/* Super Admin Feature Release Portal Trigger */}
              {isSuperAdmin && (
                <button
                  onClick={() => {
                    setIsAdminReleaseModalOpen(true);
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'} rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 transition-colors cursor-pointer`}
                  title="Developer Release Control Center: Manage Web App Updates & Early Access"
                >
                  <Crown className="w-4.5 h-4.5 text-amber-400 shrink-0 fill-amber-400" />
                  {!isCollapsed && (
                    <div className="flex-1 text-left flex items-center justify-between">
                      <span>Release Control Portal</span>
                      <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">Developer</span>
                    </div>
                  )}
                </button>
              )}

              {/* Workspace Mode Switch / Locked Option */}
              {isSuperAdmin ? (
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    toggleWorkspaceMode();
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2.5'} rounded-lg text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 shadow-xs`}
                  title="Developer: Toggle between Single-User and Multi-User Mode"
                >
                  <div className="flex items-center space-x-2.5">
                    {workspaceMode === 'single' ? (
                      <User className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Users className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                    )}
                    {!isCollapsed && (
                      <div className="flex flex-col text-left">
                        <span className="text-white font-bold">Switch to {workspaceMode === 'single' ? 'Multi-User' : 'Single-User'}</span>
                        <span className="text-[10px] text-amber-300/90 font-normal">Active: {workspaceMode === 'single' ? 'Single-User' : 'Multi-User'}</span>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[9px] bg-amber-500/30 text-amber-200 font-mono font-black px-1.5 py-0.5 rounded uppercase">
                      Developer Toggle
                    </span>
                  )}
                </button>
              ) : subscriptionTier === 'free_trial' ? (
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    resetWorkspaceMode();
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'} rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 transition-colors cursor-pointer border border-emerald-500/30 bg-emerald-500/5`}
                  title="Free Trial: Switch between Single-User and Multi-User workspace mode"
                >
                  <div className="flex items-center space-x-2.5">
                    {workspaceMode === 'single' ? (
                      <User className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Users className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                    )}
                    {!isCollapsed && <span>Switch Workspace Mode</span>}
                  </div>
                  {!isCollapsed && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">Trial</span>}
                </button>
              ) : (
                <div className={`w-full ${isCollapsed ? 'p-1.5 flex justify-center' : 'p-2.5'} rounded-lg bg-slate-900/60 border border-slate-700/80 space-y-1`}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <div className="flex items-center space-x-2">
                      {workspaceMode === 'single' ? (
                        <User className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Users className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                      )}
                      {!isCollapsed && <span>Workspace: {workspaceMode === 'single' ? 'Single-User' : 'Multi-User'}</span>}
                    </div>
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Locked Subscriber Plan" />
                  </div>
                  {!isCollapsed && <p className="text-[10px] text-slate-400">Locked under active subscription plan.</p>}
                </div>
              )}

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'} rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer border-t border-slate-700/50 pt-2 ${isCollapsed ? 'mt-0' : 'mt-1'}`}
                title="Sign Out of Account"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0" />
                {!isCollapsed && <span>Logout</span>}
              </button>
            </div>
          )}

          {/* User Name Collapsible Button */}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`w-full bg-slate-800/80 hover:bg-slate-800 rounded-xl p-2.5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border ${isUserMenuOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-700/50'} cursor-pointer transition-all hover:border-slate-600 group/user relative text-left`}
            title="Click for Theme, Settings & Logout options"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 relative">
                {getInitials(user?.name)}
                {dueItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-slate-900 rounded-full animate-ping" />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden pr-1">
                  <div className="flex items-center space-x-1">
                    <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || 'User'}</p>
                    {(user?.role?.includes('Admin') || user?.email?.includes('gerald13')) && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full flex items-center shrink-0">
                        <Crown className="w-2.5 h-2.5 mr-0.5 text-amber-400" />
                        <span>Developer</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || user?.role || 'Compliance Officer'}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="text-slate-400 group-hover/user:text-white transition-colors shrink-0">
                {isUserMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Settings & Notification Dispatcher Hub Modal */}
      <NotificationHubModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        dueItems={dueItems}
        settings={notificationSettings}
        onUpdateSettings={setNotificationSettings}
        onUpdateForm={onUpdateForm}
        selectedPeriod={selectedPeriod}
      />

      {/* Super Admin Feature Release Control Modal */}
      <AdminFeatureReleaseModal
        isOpen={isAdminReleaseModalOpen}
        onClose={() => setIsAdminReleaseModalOpen(false)}
      />

      {/* Compliance Officer Messaging Desk Modal */}
      <OfficerMessagingModal
        isOpen={isOfficerMessagingOpen}
        onClose={() => setIsOfficerMessagingOpen(false)}
        clients={clients}
        initialSelectedClientEmail={selectedMessagingClientEmail}
        formReferences={formReferences}
      />
    </>
  );
}
