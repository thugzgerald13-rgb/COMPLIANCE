import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultNotificationSettings,
  dispatchAutomatedNotifications,
  getDueFormsForNotification,
  loadNotificationLogs,
  loadNotificationSettings,
  playNotificationChime,
  requestWebPushPermission,
  saveNotificationLogs,
  saveNotificationSettings,
  sendTestWebPushNotification,
  triggerBrowserNotification,
  type DueItemForNotification,
} from './notificationService';
import { BIRForm, Client, FormReference, NotificationLog } from '../types';

const LOGS_STORAGE_KEY = 'bizcomply_notification_logs_v1';
const SETTINGS_STORAGE_KEY = 'bizcomply_notification_settings_v1';

const MONTHLY_1601C: FormReference = {
  code: '1601-C',
  description: 'Monthly Remittance Return of Income Taxes Withheld on Compensation',
  frequency: 'Monthly',
  deadlineRule: '10th day of the following month',
};

function makeLog(overrides: Partial<NotificationLog> = {}): NotificationLog {
  return {
    id: 'log-1',
    clientId: 'client-1',
    clientName: 'Acme Corporation',
    formCode: '1601-C',
    formDescription: 'Monthly Remittance Return',
    deadline: '2026-03-10',
    type: 'Web Push',
    status: 'Sent',
    timestamp: '2026-03-10T00:00:00.000Z',
    message: 'test',
    ...overrides,
  };
}

function makeDueItem(overrides: Partial<DueItemForNotification> = {}): DueItemForNotification {
  const form: BIRForm = {
    id: 'form-1',
    code: '1601-C',
    description: 'Monthly Remittance Return',
    status: 'Pending',
    deadline: '2026-03-10',
  };
  return {
    clientId: 'client-1',
    clientName: 'Acme Corporation',
    clientEmail: 'billing@acme.test',
    form,
    deadline: '2026-03-10',
    diffDays: 0,
    isDueToday: true,
    isOverdue: false,
    isUpcoming: false,
    ...overrides,
  };
}

function makeClient(forms: BIRForm[], overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    name: 'Acme Corporation',
    tin: '123-456-789-00000',
    rdo: '044',
    type: 'Corporate',
    email: 'billing@acme.test',
    forms,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('notification log persistence', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadNotificationLogs()).toEqual([]);
  });

  it('round-trips logs through localStorage', () => {
    const logs = [makeLog({ id: 'a' }), makeLog({ id: 'b' })];
    saveNotificationLogs(logs);
    expect(loadNotificationLogs()).toEqual(logs);
  });

  it('keeps only the most recent 200 logs', () => {
    const logs = Array.from({ length: 250 }, (_, i) => makeLog({ id: `log-${i}` }));
    saveNotificationLogs(logs);
    const stored = loadNotificationLogs();
    expect(stored).toHaveLength(200);
    expect(stored[0].id).toBe('log-0');
    expect(stored[199].id).toBe('log-199');
  });

  it('returns an empty list when the stored payload is corrupt', () => {
    localStorage.setItem(LOGS_STORAGE_KEY, '{not json');
    expect(loadNotificationLogs()).toEqual([]);
  });

  it('warns instead of throwing when persisting fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => saveNotificationLogs([makeLog()])).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});

describe('notification settings persistence', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(loadNotificationSettings()).toEqual(defaultNotificationSettings);
    expect(loadNotificationSettings('user@test.ph')).toEqual(defaultNotificationSettings);
  });

  it('merges stored settings over the defaults', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ soundEnabled: false }));
    expect(loadNotificationSettings()).toEqual({ ...defaultNotificationSettings, soundEnabled: false });
  });

  it('prefers the per-user key over the shared key', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ soundEnabled: false }));
    localStorage.setItem(`${SETTINGS_STORAGE_KEY}_user@test.ph`, JSON.stringify({ soundEnabled: true, autoDispatchOnLoad: false }));
    expect(loadNotificationSettings('user@test.ph')).toEqual({
      autoDispatchOnLoad: false,
      soundEnabled: true,
      browserNotificationsEnabled: true,
    });
  });

  it('falls back to the shared key when the user has no saved settings', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ browserNotificationsEnabled: false }));
    expect(loadNotificationSettings('someone-else@test.ph').browserNotificationsEnabled).toBe(false);
  });

  it('returns the defaults when the stored payload is corrupt', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, 'not-json');
    expect(loadNotificationSettings()).toEqual(defaultNotificationSettings);
  });

  it('writes both the per-user and the shared key when saving', () => {
    const settings = { ...defaultNotificationSettings, soundEnabled: false };
    saveNotificationSettings(settings, 'user@test.ph');
    expect(JSON.parse(localStorage.getItem(`${SETTINGS_STORAGE_KEY}_user@test.ph`)!)).toEqual(settings);
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual(settings);
  });

  it('warns instead of throwing when saving fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => saveNotificationSettings(defaultNotificationSettings)).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});

describe('getDueFormsForNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns nothing when there are no clients', () => {
    expect(getDueFormsForNotification([], [MONTHLY_1601C], '2026-03')).toEqual([]);
  });

  it('reports a pending form that is due today', () => {
    const client = makeClient([
      { id: 'f1', code: '1601-C', description: 'Monthly', status: 'Pending', assignedPeriod: '2026-01' },
    ]);
    const items = getDueFormsForNotification([client], [MONTHLY_1601C], '2026-03');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      clientId: 'client-1',
      clientName: 'Acme Corporation',
      clientTin: '123-456-789-00000',
      clientEmail: 'billing@acme.test',
      deadline: '2026-03-10',
      diffDays: 0,
      isDueToday: true,
      isOverdue: false,
      isUpcoming: false,
    });
  });

  it('ignores forms that are already filed or paid', () => {
    const filed = makeClient(
      [{ id: 'f1', code: '1601-C', description: 'Monthly', status: 'Filed', period: '2026-02', assignedPeriod: '2026-01' }],
      { id: 'filed-client' }
    );
    const paid = makeClient(
      [{ id: 'f2', code: '1601-C', description: 'Monthly', status: 'Paid', period: '2026-02', assignedPeriod: '2026-01' }],
      { id: 'paid-client' }
    );
    expect(getDueFormsForNotification([filed, paid], [MONTHLY_1601C], '2026-03')).toEqual([]);
  });

  it('ignores forms whose deadline is more than a week away', () => {
    const client = makeClient([
      { id: 'f1', code: '1601-C', description: 'Monthly', status: 'Pending', assignedPeriod: '2026-01' },
    ]);
    // Filing month 2026-04 has a 2026-04-10 deadline, a month out from 2026-03-10
    expect(getDueFormsForNotification([client], [MONTHLY_1601C], '2026-04')).toEqual([]);
  });

  it('classifies overdue and upcoming items and sorts by urgency', () => {
    const overdueRef: FormReference = { ...MONTHLY_1601C, code: 'OVERDUE', deadlineRule: '5th day of the following month' };
    const upcomingRef: FormReference = { ...MONTHLY_1601C, code: 'UPCOMING', deadlineRule: '13th day of the following month' };
    const client = makeClient([
      { id: 'f1', code: 'UPCOMING', description: 'Upcoming', status: 'Pending', assignedPeriod: '2026-01' },
      { id: 'f2', code: 'OVERDUE', description: 'Overdue', status: 'Processing', assignedPeriod: '2026-01' },
    ]);

    const items = getDueFormsForNotification([client], [overdueRef, upcomingRef], '2026-03');
    expect(items.map(i => i.form.code)).toEqual(['OVERDUE', 'UPCOMING']);
    expect(items[0]).toMatchObject({ diffDays: -5, isOverdue: true, isDueToday: false, isUpcoming: false });
    expect(items[1]).toMatchObject({ diffDays: 3, isOverdue: false, isDueToday: false, isUpcoming: true });
  });

  it('aggregates across clients', () => {
    const a = makeClient(
      [{ id: 'f1', code: '1601-C', description: 'Monthly', status: 'Pending', assignedPeriod: '2026-01' }],
      { id: 'client-a', name: 'Client A' }
    );
    const b = makeClient(
      [{ id: 'f2', code: '1601-C', description: 'Monthly', status: 'Processing', assignedPeriod: '2026-01' }],
      { id: 'client-b', name: 'Client B' }
    );
    expect(getDueFormsForNotification([a, b], [MONTHLY_1601C], '2026-03').map(i => i.clientId)).toEqual(['client-a', 'client-b']);
  });
});

describe('dispatchAutomatedNotifications', () => {
  const settings = { ...defaultNotificationSettings, browserNotificationsEnabled: false, soundEnabled: false };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates one log per due item and persists them', () => {
    const items = [
      makeDueItem(),
      makeDueItem({ clientId: 'client-2', clientName: 'Beta Inc', deadline: '2026-03-12', diffDays: 2, isDueToday: false, isUpcoming: true }),
    ];
    const { logs, newDispatchesCount } = dispatchAutomatedNotifications(items, settings);
    expect(newDispatchesCount).toBe(2);
    expect(logs).toHaveLength(2);
    expect(loadNotificationLogs()).toHaveLength(2);
    expect(logs.every(l => l.type === 'Web Push' && l.status === 'Sent')).toBe(true);
  });

  it('describes the timing of due-today, overdue and upcoming items', () => {
    const items = [
      makeDueItem({ clientId: 'a' }),
      makeDueItem({ clientId: 'b', diffDays: -3, isDueToday: false, isOverdue: true }),
      makeDueItem({ clientId: 'c', diffDays: 1, isDueToday: false, isUpcoming: true }),
      makeDueItem({ clientId: 'd', diffDays: 4, isDueToday: false, isUpcoming: true }),
    ];
    const { logs } = dispatchAutomatedNotifications(items, settings);
    const messages = logs.map(l => l.message);
    expect(messages[0]).toContain('DUE TODAY');
    expect(messages[1]).toContain('OVERDUE by 3 days');
    expect(messages[2]).toContain('DUE IN 1 DAY');
    expect(messages[2]).not.toContain('DAYS');
    expect(messages[3]).toContain('DUE IN 4 DAYS');
    expect(logs[1].isOverdue).toBe(true);
  });

  it('does not re-dispatch an item already logged today', () => {
    dispatchAutomatedNotifications([makeDueItem()], settings);
    const second = dispatchAutomatedNotifications([makeDueItem()], settings);
    expect(second.newDispatchesCount).toBe(0);
    expect(second.logs).toHaveLength(1);
  });

  it('re-dispatches when the previous log is from an earlier day', () => {
    saveNotificationLogs([makeLog({ timestamp: '2026-03-09T10:00:00.000Z' })]);
    const { newDispatchesCount, logs } = dispatchAutomatedNotifications([makeDueItem()], settings);
    expect(newDispatchesCount).toBe(1);
    expect(logs).toHaveLength(2);
  });

  it('re-dispatches when the deadline differs from the logged one', () => {
    saveNotificationLogs([makeLog({ deadline: '2026-03-11' })]);
    expect(dispatchAutomatedNotifications([makeDueItem()], settings).newDispatchesCount).toBe(1);
  });

  it('plays the chime only when sound is enabled and something was dispatched', () => {
    const audioSpy = vi.fn();
    vi.stubGlobal('AudioContext', class {
      currentTime = 0;
      destination = {};
      constructor() {
        audioSpy();
      }
      createOscillator() {
        return { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
    });

    dispatchAutomatedNotifications([makeDueItem()], { ...settings, soundEnabled: true });
    expect(audioSpy).toHaveBeenCalledTimes(1);

    // Nothing new to dispatch -> no chime
    dispatchAutomatedNotifications([makeDueItem()], { ...settings, soundEnabled: true });
    expect(audioSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('does nothing when there are no due items', () => {
    const { logs, newDispatchesCount } = dispatchAutomatedNotifications([], settings);
    expect(newDispatchesCount).toBe(0);
    expect(logs).toEqual([]);
  });
});

describe('playNotificationChime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('schedules two oscillators on the audio context', () => {
    const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('AudioContext', class {
      currentTime = 0;
      destination = {};
      createOscillator() {
        const osc = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        oscillators.push(osc);
        return osc;
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
      }
    });

    playNotificationChime();
    expect(oscillators).toHaveLength(2);
    expect(oscillators.every(o => o.start.mock.calls.length === 1 && o.stop.mock.calls.length === 1)).toBe(true);
  });

  it('is a no-op when the Web Audio API is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => playNotificationChime()).not.toThrow();
  });

  it('swallows errors thrown by the audio context', () => {
    vi.stubGlobal('AudioContext', class {
      constructor() {
        throw new Error('user gesture required');
      }
    });
    expect(() => playNotificationChime()).not.toThrow();
  });
});

describe('requestWebPushPermission', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unsupported environments', async () => {
    vi.stubGlobal('Notification', undefined);
    // jsdom keeps the property defined, so remove it to simulate an unsupported browser
    const original = Reflect.get(window, 'Notification');
    Reflect.deleteProperty(window, 'Notification');
    await expect(requestWebPushPermission()).resolves.toBe('unsupported');
    if (original !== undefined) {
      Reflect.set(window, 'Notification', original);
    }
  });

  it('returns the permission granted by the browser', async () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') });
    await expect(requestWebPushPermission()).resolves.toBe('granted');
  });

  it('returns denied and warns when the request throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockRejectedValue(new Error('nope')) });
    await expect(requestWebPushPermission()).resolves.toBe('denied');
    expect(warn).toHaveBeenCalled();
  });
});

describe('triggerBrowserNotification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false and warns when notifications are unsupported', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = Reflect.get(window, 'Notification');
    Reflect.deleteProperty(window, 'Notification');
    await expect(triggerBrowserNotification('title', 'body')).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
    if (original !== undefined) {
      Reflect.set(window, 'Notification', original);
    }
  });

  it('returns false when permission is denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    await expect(triggerBrowserNotification('title', 'body')).resolves.toBe(false);
  });

  it('requests permission when it has not been decided yet', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied');
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    await expect(triggerBrowserNotification('title', 'body')).resolves.toBe(false);
    expect(requestPermission).toHaveBeenCalled();
  });

  it('prefers the service worker registration when one is available', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ showNotification }) } });

    await expect(triggerBrowserNotification('title', 'body', '/dashboard')).resolves.toBe(true);
    expect(showNotification).toHaveBeenCalledWith('title', expect.objectContaining({ body: 'body', data: { url: '/dashboard' } }));
  });

  it('falls back to the Notification constructor when there is no service worker', async () => {
    const constructed: Array<{ title: string; body?: string }> = [];
    const NotificationMock = vi.fn(function (this: Record<string, unknown>, title: string, options?: NotificationOptions) {
      constructed.push({ title, body: options?.body });
      this.close = vi.fn();
    }) as unknown as typeof Notification & { permission: string };
    NotificationMock.permission = 'granted';
    vi.stubGlobal('Notification', NotificationMock);
    vi.stubGlobal('navigator', {});

    await expect(triggerBrowserNotification('title', 'body')).resolves.toBe(true);
    expect(constructed).toEqual([{ title: 'title', body: 'body' }]);
  });

  it('returns false and warns when the notification API throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const NotificationMock = vi.fn(() => {
      throw new Error('blocked');
    }) as unknown as typeof Notification & { permission: string };
    NotificationMock.permission = 'granted';
    vi.stubGlobal('Notification', NotificationMock);
    vi.stubGlobal('navigator', {});

    await expect(triggerBrowserNotification('title', 'body')).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

describe('sendTestWebPushNotification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs the test dispatch and reports simulation when notifications are unsupported', async () => {
    const original = Reflect.get(window, 'Notification');
    Reflect.deleteProperty(window, 'Notification');

    const result = await sendTestWebPushNotification();
    expect(result).toMatchObject({ success: true, nativePushed: false });
    expect(result.message).toContain('Web Push API unavailable');

    const logs = loadNotificationLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ formCode: 'WEB-PUSH', type: 'Web Push', status: 'Sent' });

    if (original !== undefined) {
      Reflect.set(window, 'Notification', original);
    }
  });

  it('dispatches a native notification when permission is granted', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ showNotification }) } });

    const result = await sendTestWebPushNotification();
    expect(result).toMatchObject({ success: true, nativePushed: true });
    expect(result.message).toContain('dispatched to your desktop');
    expect(showNotification).toHaveBeenCalled();
  });

  it('simulates the alert when permission is denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    const result = await sendTestWebPushNotification();
    expect(result).toMatchObject({ success: true, nativePushed: false });
    expect(result.message).toContain('simulated with chime sound');
  });

  it('prepends the test log ahead of existing history', async () => {
    saveNotificationLogs([makeLog({ id: 'older' })]);
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    await sendTestWebPushNotification();
    const logs = loadNotificationLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].formCode).toBe('WEB-PUSH');
    expect(logs[1].id).toBe('older');
  });
});
