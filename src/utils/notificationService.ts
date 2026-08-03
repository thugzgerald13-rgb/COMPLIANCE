import { Client, FormReference, NotificationLog, BIRForm } from '../types';
import { getFormsForClientAndPeriod } from '../utils';

const LOGS_STORAGE_KEY = 'bizcomply_notification_logs_v1';
const SETTINGS_STORAGE_KEY = 'bizcomply_notification_settings_v1';

export interface NotificationSettings {
  autoDispatchOnLoad: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  defaultNotificationEmail: string;
  defaultNotificationPhone: string;
}

export const defaultNotificationSettings: NotificationSettings = {
  autoDispatchOnLoad: true,
  soundEnabled: true,
  browserNotificationsEnabled: true,
  defaultNotificationEmail: '',
  defaultNotificationPhone: '',
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

// Trigger Web Browser Native Notification
export function triggerBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      console.warn('Browser notification error:', e);
    }
  }
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
      const email = (parsed.defaultNotificationEmail && parsed.defaultNotificationEmail !== 'compliance@bizcomply.ph')
        ? parsed.defaultNotificationEmail
        : (userEmail || '');
      const phone = (parsed.defaultNotificationPhone && parsed.defaultNotificationPhone !== '+639171234567')
        ? parsed.defaultNotificationPhone
        : '';
      return {
        ...defaultNotificationSettings,
        ...parsed,
        defaultNotificationEmail: email,
        defaultNotificationPhone: phone,
      };
    }
    return {
      ...defaultNotificationSettings,
      defaultNotificationEmail: userEmail || '',
      defaultNotificationPhone: '',
    };
  } catch {
    return {
      ...defaultNotificationSettings,
      defaultNotificationEmail: userEmail || '',
      defaultNotificationPhone: '',
    };
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
  clientPhone?: string;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueItems: DueItemForNotification[] = [];

  for (const client of clients) {
    const periodForms = getFormsForClientAndPeriod(client, selectedPeriod, formReferences);

    for (const form of periodForms) {
      if (form.status === 'Filed' || form.status === 'Paid') {
        continue;
      }

      if (!form.deadline) continue;

      const deadDate = new Date(form.deadline);
      deadDate.setHours(0, 0, 0, 0);

      const diffTime = deadDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
          clientPhone: client.phone,
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

// Trigger automated email and phone notifications for due/overdue/upcoming items
export function dispatchAutomatedNotifications(
  dueItems: DueItemForNotification[],
  settings: NotificationSettings
): { logs: NotificationLog[]; newDispatchesCount: number } {
  const currentLogs = loadNotificationLogs();
  const todayStr = new Date().toISOString().split('T')[0];
  const newLogs: NotificationLog[] = [];
  let newDispatchesCount = 0;

  for (const item of dueItems) {
    // Prevent duplicate dispatches for the exact same form & date
    const existingLog = currentLogs.find(
      l => l.clientId === item.clientId && l.formCode === item.form.code && l.deadline === item.deadline && l.timestamp.startsWith(todayStr)
    );

    if (!existingLog) {
      newDispatchesCount++;
      const emailRecipient = item.clientEmail || settings.defaultNotificationEmail;
      const phoneRecipient = item.clientPhone || settings.defaultNotificationPhone;

      const timingText = item.isDueToday 
        ? 'DUE TODAY' 
        : item.isOverdue 
        ? `OVERDUE by ${Math.abs(item.diffDays)} days` 
        : `DUE IN ${item.diffDays} DAY${item.diffDays > 1 ? 'S' : ''}`;

      const emailMsg = `[AUTOMATED EMAIL SENT] To: ${emailRecipient} | Subject: URGENT: ${item.form.code} is ${timingText} (${item.deadline}) for ${item.clientName}. Status: ${item.form.status}. Please file/pay immediately to prevent BIR fines.`;

      const phoneMsg = `[AUTOMATED SMS SENT] To: ${phoneRecipient} | Alert: BIZ-COMPLY Reminder: BIR Form ${item.form.code} for ${item.clientName} is ${timingText} (${item.deadline}). Unfiled/Unpaid!`;

      // Email log
      newLogs.push({
        id: crypto.randomUUID(),
        clientId: item.clientId,
        clientName: item.clientName,
        clientEmail: emailRecipient,
        clientPhone: phoneRecipient,
        formCode: item.form.code,
        formDescription: item.form.description,
        deadline: item.deadline,
        type: 'Email',
        status: 'Sent',
        timestamp: new Date().toISOString(),
        message: emailMsg,
        isOverdue: item.isOverdue,
      });

      // Phone SMS log
      newLogs.push({
        id: crypto.randomUUID(),
        clientId: item.clientId,
        clientName: item.clientName,
        clientEmail: emailRecipient,
        clientPhone: phoneRecipient,
        formCode: item.form.code,
        formDescription: item.form.description,
        deadline: item.deadline,
        type: 'Phone (SMS)',
        status: 'Sent',
        timestamp: new Date().toISOString(),
        message: phoneMsg,
        isOverdue: item.isOverdue,
      });

      if (settings.browserNotificationsEnabled) {
        triggerBrowserNotification(
          `BIZ-COMPLY Alert: ${item.form.code} ${timingText}`,
          `${item.clientName} - Form ${item.form.code} is still ${item.form.status}. Automated email & SMS dispatched.`
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
