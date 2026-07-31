import React, { useState } from 'react';
import { Client, FormReference, BIRForm, NotificationLog } from '../types';
import { 
  X, Bell, Mail, Phone, Send, CheckCircle2, AlertTriangle, 
  Settings, History, Volume2, VolumeX, ShieldCheck, RefreshCw, 
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
  const [activeTab, setActiveTab] = useState<'alerts' | 'logs' | 'settings'>('alerts');
  const [logs, setLogs] = useState<NotificationLog[]>(loadNotificationLogs());
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  // Settings form state
  const [autoLoad, setAutoLoad] = useState(settings.autoDispatchOnLoad);
  const [sound, setSound] = useState(settings.soundEnabled);
  const [browserNotif, setBrowserNotif] = useState(settings.browserNotificationsEnabled);
  const [defaultEmail, setDefaultEmail] = useState(settings.defaultNotificationEmail);
  const [defaultPhone, setDefaultPhone] = useState(settings.defaultNotificationPhone);

  if (!isOpen) return null;

  const handleManualDispatch = () => {
    setIsDispatching(true);
    setDispatchSuccessMsg(null);

    setTimeout(() => {
      const result = dispatchAutomatedNotifications(dueItems, settings);
      setLogs(result.logs);
      setIsDispatching(false);

      if (dueItems.length === 0) {
        setDispatchSuccessMsg('Evaluated: All compliance forms for this period are already filed or paid!');
      } else {
        setDispatchSuccessMsg(`Automated Email & Phone dispatches successfully sent to ${dueItems.length} recipient(s)!`);
      }

      setTimeout(() => setDispatchSuccessMsg(null), 5000);
    }, 400);
  };

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
      defaultNotificationEmail: defaultEmail,
      defaultNotificationPhone: defaultPhone,
    };
    onUpdateSettings(updated);
    saveNotificationSettings(updated);
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

  const dueTodayCount = dueItems.filter(i => i.isDueToday).length;
  const overdueCount = dueItems.filter(i => i.isOverdue).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center space-x-3 z-10">
            <div className="w-12 h-12 bg-blue-600/30 border border-blue-500/40 rounded-xl flex items-center justify-center text-blue-400">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Automated Dispatch Hub</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Email & Phone Sync Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated email and phone (SMS) alerts for unfiled or unpaid compliance deadlines
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'alerts'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Active Due Alerts</span>
            {dueItems.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {dueItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Dispatch Audit Logs ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Gateway Settings</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {dispatchSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{dispatchSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: ACTIVE ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Automated Notification Status</h3>
                    <p className="text-xs text-slate-600">
                      {dueTodayCount} due today, {overdueCount} overdue form(s) currently require email & SMS notifications.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleManualDispatch}
                  disabled={isDispatching}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-2 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
                  <span>{isDispatching ? 'Dispatching Notifications...' : 'Trigger Automated Dispatch Now'}</span>
                </button>
              </div>

              {dueItems.length === 0 ? (
                <div className="p-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No Unfiled Due Items Found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    All compliance forms for the selected period are cleared or filed. No automated email or phone alerts are pending.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Unfiled / Unpaid Due Items Requiring Alerts ({dueItems.length})
                  </h4>

                  {dueItems.map((item) => {
                    const emailAddr = item.clientEmail || settings.defaultNotificationEmail;
                    const phoneAddr = item.clientPhone || settings.defaultNotificationPhone;

                    return (
                      <div 
                        key={`${item.clientId}-${item.form.id || item.form.code}`}
                        className={`p-4 rounded-xl border transition-all ${
                          item.isOverdue 
                            ? 'bg-red-50/40 border-red-200' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              item.isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.form.code}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-sm">{item.clientName}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                  item.isOverdue ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                  {item.isDueToday ? 'DUE TODAY' : `OVERDUE ${Math.abs(item.diffDays)}D`}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">{item.form.description}</p>
                              
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                <span className="flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                  <Mail className="w-3 h-3 text-blue-600" />
                                  <span>{emailAddr}</span>
                                </span>
                                <span className="flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{phoneAddr}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                            <button
                              onClick={() => {
                                if (onUpdateForm) {
                                  onUpdateForm(
                                    item.clientId,
                                    item.form.id,
                                    { 
                                      status: 'Filed',
                                      dateFiled: new Date().toISOString().split('T')[0]
                                    },
                                    {
                                      code: item.form.code,
                                      description: item.form.description,
                                      deadline: item.deadline,
                                      period: item.form.period || selectedPeriod
                                    }
                                  );
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark as Filed</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Automated Dispatch History Log ({logs.length})
                </h4>
                {logs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="text-xs text-slate-500 hover:text-red-600 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No automated notification logs generated yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === 'Email' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.type}
                          </span>
                          <span className="font-bold text-slate-900">{log.clientName}</span>
                          <span className="text-slate-400">({log.formCode})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed font-mono bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                        {log.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GATEWAY SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-600" /> Email & SMS Gateways
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Default Dispatch Email</label>
                    <input 
                      type="email" 
                      required
                      value={defaultEmail}
                      onChange={e => setDefaultEmail(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="compliance@bizcomply.ph"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Default Phone SMS Gateway</label>
                    <input 
                      type="tel" 
                      required
                      value={defaultPhone}
                      onChange={e => setDefaultPhone(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+639171234567"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
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
                      <span className="text-xs font-semibold text-slate-900 block">Auto-Dispatch on App Load</span>
                      <span className="text-[11px] text-slate-500">Automatically check & dispatch due alerts when opening the app</span>
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
                      <span className="text-xs font-semibold text-slate-900 block">Audio Sound Alert Chime</span>
                      <span className="text-[11px] text-slate-500">Play synth sound chime when automated due notifications trigger</span>
                    </div>
                  </label>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">Browser Native Push Alerts</span>
                      <span className="text-[11px] text-slate-500">Display floating desktop notification popups for due items</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestBrowserPermission}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
