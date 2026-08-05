import React, { useState, useEffect } from 'react';
import { Client, FormReference, BIRForm, NotificationLog } from '../types';
import { 
  X, Bell, Mail, CheckCircle2, 
  Settings, History, Volume2, VolumeX, ShieldCheck, 
  Trash2, ExternalLink, Calendar, User, FileText, Check, Send, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { MODAL_OVERLAY } from './ui';
import { 
  DueItemForNotification, 
  NotificationSettings, 
  dispatchAutomatedNotifications, 
  loadNotificationLogs, 
  saveNotificationLogs,
  saveNotificationSettings,
  playNotificationChime,
  triggerBrowserNotification,
  requestWebPushPermission,
  sendTestWebPushNotification
} from '../utils/notificationService';
import { useAuth } from '../context/AuthContext';

interface NotificationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  dueItems: DueItemForNotification[];
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  onUpdateForm?: (
    clientId: string,
    formId: string,
    updates: Partial<BIRForm>,
    formMeta?: { code: string; description: string; deadline: string; period: string }
  ) => void;
  selectedPeriod: string;
}

export function NotificationHubModal({
  isOpen,
  onClose,
  dueItems,
  settings,
  onUpdateSettings,
  onUpdateForm,
  selectedPeriod
}: NotificationHubModalProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'logs' | 'settings'>('profile');
  const [logs, setLogs] = useState<NotificationLog[]>(loadNotificationLogs());
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  // Settings form state
  const [autoLoad, setAutoLoad] = useState(settings.autoDispatchOnLoad);
  const [sound, setSound] = useState(settings.soundEnabled);
  const [browserNotif, setBrowserNotif] = useState(settings.browserNotificationsEnabled);
  const [pushPermission, setPushPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  useEffect(() => {
    if (isOpen) {
      setLogs(loadNotificationLogs());
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear the automated dispatch log history?')) {
      saveNotificationLogs([]);
      setLogs([]);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: NotificationSettings = {
      autoDispatchOnLoad: autoLoad,
      soundEnabled: sound,
      browserNotificationsEnabled: browserNotif,
    };
    onUpdateSettings(updated);
    saveNotificationSettings(updated, user?.email);
    setDispatchSuccessMsg('Notification settings updated successfully!');
    setTimeout(() => setDispatchSuccessMsg(null), 3000);
  };

  const handleRequestBrowserPermission = async () => {
    const perm = await requestWebPushPermission();
    if (perm !== 'unsupported') {
      setPushPermission(perm);
      if (perm === 'granted') {
        setBrowserNotif(true);
        triggerBrowserNotification('BIZ-COMPLY Web Push Active', 'Web Push alerts are now enabled for upcoming compliance deadlines.');
        setDispatchSuccessMsg('Web Push Notifications successfully enabled!');
      } else {
        setDispatchSuccessMsg('Web Push permission was denied in your browser settings.');
      }
      setTimeout(() => setDispatchSuccessMsg(null), 4000);
    }
  };

  const handleSendTestPush = async () => {
    const result = await sendTestWebPushNotification();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
    setLogs(loadNotificationLogs());
    setDispatchSuccessMsg(result.message);
    setTimeout(() => setDispatchSuccessMsg(null), 5000);
  };

  return (
    <div className={MODAL_OVERLAY}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center space-x-3 z-10">
            <div className="w-12 h-12 bg-blue-600/30 border border-blue-500/40 rounded-xl flex items-center justify-center text-blue-400">
              <Settings className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Settings & Web Push Notification Hub</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Web Push Service Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated Web Push notification engine for BIR tax compliance deadlines
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 text-blue-500" />
            <span>User Account</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Web Push Audit Logs ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Gateway Preferences</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {dispatchSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{dispatchSuccessMsg}</span>
            </div>
          )}

          {/* TAB 0: USER PROFILE & ACCOUNT */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-blue-600 border-2 border-blue-400 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{user?.name || 'Compliance Officer'}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || 'user@bizcomply.ph'}</p>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        {user?.role || 'Tax & Compliance Lead'}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Active Account
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Web Push Dispatcher Overview
                </h4>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">Current Assigned Period</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPeriod}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">Pending Due Items Monitored</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{dueItems.length} unfiled / unpaid form(s)</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-400">Automatic Web Push Dispatching</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Always Active
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={logout}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Web Push Dispatch History Log ({logs.length})
                </h4>
                {logs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  No automated Web Push notification logs recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                            {log.type}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{log.clientName}</span>
                          <span className="text-slate-400 dark:text-slate-500">({log.formCode})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 mt-1">
                        {log.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GATEWAY SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
                  <Bell className="w-4 h-4 mr-2 text-amber-600" /> Automated Trigger Controls
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={autoLoad}
                      onChange={e => setAutoLoad(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">Automatic Web Push Dispatch on Due Deadlines</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Automatically send and record Web Push notifications whenever unfiled due forms exist</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={sound}
                      onChange={e => {
                        setSound(e.target.checked);
                        if (e.target.checked) playNotificationChime();
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">Audio Sound Alert Chime</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Play synth sound chime when Web Push notifications trigger</span>
                    </div>
                  </label>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white block">Web Push Notifications</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            pushPermission === 'granted'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : pushPermission === 'denied'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          }`}>
                            {pushPermission === 'granted' ? '● Web Push Active' : pushPermission === 'denied' ? '⚠ Preview / Blocked' : '▲ Action Needed'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Receive instant floating desktop & device push popups when tax deadlines approach
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {pushPermission !== 'granted' && (
                          <button
                            type="button"
                            onClick={handleRequestBrowserPermission}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1 shadow-sm"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Enable Web Push</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleSendTestPush}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                          title="Trigger a test Web Push notification alert"
                        >
                          <Send className="w-3.5 h-3.5 text-blue-500" />
                          <span>Test Web Push</span>
                        </button>
                      </div>
                    </div>

                    {/* Explanatory callout for Preview Frames or Blocked permissions */}
                    {(pushPermission === 'denied' || (typeof window !== 'undefined' && window.self !== window.top)) && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                        <div className="flex items-start space-x-2">
                          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold">Why is Web Push restricted?</p>
                            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                              Modern browsers disable Web Push permission prompts inside embedded preview windows (iframes). Opening the app in a standalone browser tab allows full desktop notifications.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                          <button
                            type="button"
                            onClick={() => window.open(window.location.href, '_blank')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-md transition-colors cursor-pointer flex items-center space-x-1 shadow-xs"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open App in New Tab</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined' && 'Notification' in window) {
                                setPushPermission(Notification.permission);
                              }
                            }}
                            className="px-2 py-1 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-100 text-[11px] font-medium rounded-md transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Re-check Permission</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={browserNotif}
                        onChange={e => setBrowserNotif(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Dispatch Web Push notifications on automated compliance checks
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Save Gateway Settings
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
