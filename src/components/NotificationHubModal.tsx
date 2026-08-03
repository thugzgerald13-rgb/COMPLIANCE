import React, { useState, useEffect } from 'react';
import { Client, FormReference, BIRForm, NotificationLog } from '../types';
import { 
  X, Bell, Mail, CheckCircle2, 
  Settings, History, Volume2, VolumeX, ShieldCheck, 
  Trash2, ExternalLink, Calendar, User, FileText, Check
} from 'lucide-react';
import { 
  DueItemForNotification, 
  NotificationSettings, 
  dispatchAutomatedNotifications, 
  loadNotificationLogs, 
  saveNotificationLogs,
  saveNotificationSettings,
  playNotificationChime,
  triggerBrowserNotification
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

  // Initial user-bound email default
  const resolvedEmail = settings.defaultNotificationEmail && settings.defaultNotificationEmail !== 'compliance@bizcomply.ph'
    ? settings.defaultNotificationEmail
    : (user?.email || '');

  // Settings form state
  const [autoLoad, setAutoLoad] = useState(settings.autoDispatchOnLoad);
  const [sound, setSound] = useState(settings.soundEnabled);
  const [browserNotif, setBrowserNotif] = useState(settings.browserNotificationsEnabled);
  const [defaultEmail, setDefaultEmail] = useState(resolvedEmail);

  useEffect(() => {
    if (user?.email && (!defaultEmail || defaultEmail === 'compliance@bizcomply.ph')) {
      setDefaultEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isOpen) {
      setLogs(loadNotificationLogs());
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
      defaultNotificationEmail: defaultEmail || user?.email || '',
    };
    onUpdateSettings(updated);
    saveNotificationSettings(updated, user?.email);
    setDispatchSuccessMsg('Notification settings updated successfully!');
    setTimeout(() => setDispatchSuccessMsg(null), 3000);
  };

  const handleRequestBrowserPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setBrowserNotif(true);
        triggerBrowserNotification('BIZ-COMPLY Alert Test', 'Browser native alerts are now active for due compliance deadlines.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
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
                <h2 className="text-xl font-bold tracking-tight text-white">Settings & Automated Dispatcher</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Email Dispatcher Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated email notification dispatcher for tax compliance deadlines
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
            <span>Email Dispatch Audit Logs ({logs.length})</span>
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

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 block font-medium">Default Dispatch Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{defaultEmail || 'Registered email'}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Automated Email Dispatcher Summary
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
                  <span className="text-slate-600 dark:text-slate-400">Automatic Email Dispatching</span>
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
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Automated Email Dispatch History Log ({logs.length})
                </h4>
                {logs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="text-xs text-slate-500 hover:text-red-600 flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No automated email notification logs generated yet.
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
                          <span className="text-slate-400">({log.formCode})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
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
                  <Mail className="w-4 h-4 mr-2 text-blue-600" /> Default Email Dispatcher
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Default Notification Recipient Email
                  </label>
                  <input 
                    type="email" 
                    required
                    value={defaultEmail}
                    onChange={e => setDefaultEmail(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={user?.email || "registered.user@email.com"}
                  />
                </div>
              </div>

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
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">Automatic Email Dispatch on Due Deadlines</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Automatically generate and record email notifications whenever unfiled due forms exist</span>
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
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Play synth sound chime when automated email notifications trigger</span>
                    </div>
                  </label>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">Browser Native Push Alerts</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Display floating desktop notification popups for due compliance items</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestBrowserPermission}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Enable Desktop Alerts
                    </button>
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
