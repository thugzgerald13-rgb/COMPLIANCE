import { Client, FormReference, NotificationLog, BIRForm } from '../types';
import { getFormsForClientAndPeriod } from '../utils';
import { todayISO, daysUntilDeadline } from '../dateUtils';

const LOGS_STORAGE_KEY = 'bizcomply_notification_logs_v1';
const SETTINGS_STORAGE_KEY = 'bizcomply_notification_settings_v1';

export interface NotificationSettings {
  autoDispatchOnLoad: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  autoDispatchOnLoad: true,
  soundEnabled: true,
  browserNotificationsEnabled: true,
};

// Play audio chime using Web Audio API synthesizer
export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // Note 1 (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Note 2 (B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.15);
    gain2.gain.setValueAtTime(0.2, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Audio context may require user interaction first
  }
}

// Request browser Web Push permission
export async function requestWebPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.warn('Error requesting Web Push notification permission:', e);
    return 'denied';
  }
}

// Trigger Web Browser Native & Push Notification
export async function triggerBrowserNotification(title: string, body: string, dataUrl?: string): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Web Push Notifications are not supported in this browser environment.');
    return false;
  }

  try {
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }

    if (perm === 'granted') {
      // Check for active Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'bizcomply-alert-' + Date.now(),
              data: { url: dataUrl || '/' }
            });
            return true;
          }
        } catch (e) {
          console.warn('Service worker showNotification fallback to window.Notification:', e);
        }
      }

      // Standard browser Notification API
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'bizcomply-alert-' + Date.now(),
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    }
  } catch (e) {
    console.warn('Browser Web Push Notification error:', e);
  }
  return false;
}

// Trigger a test Web Push notification for user verification
export async function sendTestWebPushNotification(): Promise<{ success: boolean; message: string; nativePushed: boolean }> {
  playNotificationChime();

  // Create a log entry for history tracking
  const currentLogs = loadNotificationLogs();
  const testLog: NotificationLog = {
    id: 'push-test-' + Date.now(),
    clientId: 'all',
    clientName: 'Web Push Subscriber',
    clientEmail: 'webpush@bizcomply.ph',
    formCode: 'WEB-PUSH',
    formDescription: 'BIR Tax Compliance Push Alert',
    deadline: todayISO(),
    type: 'Web Push',
    status: 'Sent',
    timestamp: new Date().toISOString(),
    message: 'Web Push test alert dispatched for BIR tax deadline reminders'
  };
  saveNotificationLogs([testLog, ...currentLogs]);

  if (!('Notification' in window)) {
    return { 
      success: true, 
      nativePushed: false, 
      message: 'Web Push test alert simulated in app! (Web Push API unavailable in this browser).' 
    };
  }

  let perm: string = Notification.permission;
  if (perm === 'default') {
    perm = await requestWebPushPermission();
  }

  if (perm === 'granted') {
    const success = await triggerBrowserNotification(
      'BIZ-COMPLY Web Push Test',
      'Web Push Notifications are active! You will receive instant alerts for upcoming BIR tax deadlines.'
    );

    return {
      success: true,
      nativePushed: success,
      message: success
        ? 'Native Web Push Notification dispatched to your desktop!'
        : 'Web Push test alert logged and simulated in app!'
    };
  }

  return {
    success: true,
    nativePushed: false,
    message: 'Web Push alert simulated with chime sound! (To grant OS native push popups, open app in a new tab).'
  };
}

export function loadNotificationLogs(): NotificationLog[] {
  try {
    const stored = localStorage.getItem(LOGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveNotificationLogs(logs: NotificationLog[]) {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 200))); // Keep last 200
  } catch (e) {
    console.warn('Failed to save notification logs:', e);
  }
}

export function loadNotificationSettings(userEmail?: string): NotificationSettings {
  try {
    const userKey = userEmail ? `${SETTINGS_STORAGE_KEY}_${userEmail}` : SETTINGS_STORAGE_KEY;
    const stored = localStorage.getItem(userKey) || localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultNotificationSettings,
        ...parsed,
      };
    }
    return defaultNotificationSettings;
  } catch {
    return defaultNotificationSettings;
  }
}

export function saveNotificationSettings(settings: NotificationSettings, userEmail?: string) {
  try {
    const userKey = userEmail ? `${SETTINGS_STORAGE_KEY}_${userEmail}` : SETTINGS_STORAGE_KEY;
    localStorage.setItem(userKey, JSON.stringify(settings));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save notification settings:', e);
  }
}

export interface DueItemForNotification {
  clientId: string;
  clientName: string;
  clientTin?: string;
  clientEmail?: string;
  form: BIRForm;
  deadline: string;
  diffDays: number;
  isDueToday: boolean;
  isOverdue: boolean;
  isUpcoming: boolean;
}

// Find forms due today, overdue, or upcoming in the next 7 days that are NOT filed or paid
export function getDueFormsForNotification(
  clients: Client[],
  formReferences: FormReference[],
  selectedPeriod: string
): DueItemForNotification[] {
  const dueItems: DueItemForNotification[] = [];

  for (const client of clients) {
    const periodForms = getFormsForClientAndPeriod(client, selectedPeriod, formReferences);

    for (const form of periodForms) {
      if (form.status === 'Filed' || form.status === 'Paid') {
        continue;
      }

      if (!form.deadline) continue;

      const diffDays = daysUntilDeadline(form.deadline);

      const isDueToday = diffDays === 0;
      const isOverdue = diffDays < 0;
      const isUpcoming = diffDays > 0 && diffDays <= 7;

      // Include if due today, overdue, or upcoming within 7 days
      if (isDueToday || isOverdue || isUpcoming) {
        dueItems.push({
          clientId: client.id,
          clientName: client.name,
          clientTin: client.tin,
          clientEmail: client.email,
          form,
          deadline: form.deadline,
          diffDays,
          isDueToday,
          isOverdue,
          isUpcoming,
        });
      }
    }
  }

  // Sort by urgency: overdue first (most negative diffDays), then due today, then upcoming (1 to 7)
  return dueItems.sort((a, b) => a.diffDays - b.diffDays);
}

// Trigger automated Web Push notifications for due/overdue/upcoming items
export function dispatchAutomatedNotifications(
  dueItems: DueItemForNotification[],
  settings: NotificationSettings
): { logs: NotificationLog[]; newDispatchesCount: number } {
  const currentLogs = loadNotificationLogs();
  const todayStr = todayISO();
  const newLogs: NotificationLog[] = [];
  let newDispatchesCount = 0;

  for (const item of dueItems) {
    // Prevent duplicate dispatches for the exact same form & date
    const existingLog = currentLogs.find(
      l => l.clientId === item.clientId && l.formCode === item.form.code && l.deadline === item.deadline && l.timestamp.startsWith(todayStr)
    );

    if (!existingLog) {
      newDispatchesCount++;

      const timingText = item.isDueToday 
        ? 'DUE TODAY' 
        : item.isOverdue 
        ? `OVERDUE by ${Math.abs(item.diffDays)} days` 
        : `DUE IN ${item.diffDays} DAY${item.diffDays > 1 ? 'S' : ''}`;

      const pushMsg = `[WEB PUSH ALERT DISPATCHED] BIR Form ${item.form.code} is ${timingText} (${item.deadline}) for ${item.clientName}. Status: ${item.form.status}. Please file/pay to prevent BIR penalties.`;

      // Web Push log
      newLogs.push({
        id: crypto.randomUUID(),
        clientId: item.clientId,
        clientName: item.clientName,
        clientEmail: item.clientEmail,
        formCode: item.form.code,
        formDescription: item.form.description,
        deadline: item.deadline,
        type: 'Web Push',
        status: 'Sent',
        timestamp: new Date().toISOString(),
        message: pushMsg,
        isOverdue: item.isOverdue,
      });

      if (settings.browserNotificationsEnabled) {
        triggerBrowserNotification(
          `BIZ-COMPLY Web Push: ${item.form.code} ${timingText}`,
          `${item.clientName} - Form ${item.form.code} is still ${item.form.status}. Web Push alert dispatched.`
        );
      }
    }
  }

  const updatedLogs = [...newLogs, ...currentLogs];
  saveNotificationLogs(updatedLogs);

  if (newDispatchesCount > 0 && settings.soundEnabled) {
    playNotificationChime();
  }

  return { logs: updatedLogs, newDispatchesCount };
}
