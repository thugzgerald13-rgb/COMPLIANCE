// BIZ-COMPLY Automatic Web Push & Service Worker Manager
// Schedules & handles automatic 8:00 AM Philippine Time (GMT+8) Web Push Notifications
// Works in the background even when the website tab is closed!

const DB_NAME = 'BizComply_SW_DB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getDBValue(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function setDBValue(key, val) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('store', 'readwrite');
      const store = tx.objectStore('store');
      const req = store.put(val, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

// Get Manila (Philippine Standard Time GMT+8) date and hour info
function getManilaTimeInfo() {
  const now = new Date();
  try {
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now); // 'YYYY-MM-DD'
    const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(now);
    const minuteStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', minute: 'numeric' }).format(now);
    return {
      dateStr, // YYYY-MM-DD in Philippine Time
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10)
    };
  } catch (e) {
    // Fallback if Asia/Manila timezone formatting fails: adjust offset +8 hours
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const manilaDate = new Date(utcTime + (3600000 * 8));
    const year = manilaDate.getFullYear();
    const month = String(manilaDate.getMonth() + 1).padStart(2, '0');
    const day = String(manilaDate.getDate()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      hour: manilaDate.getHours(),
      minute: manilaDate.getMinutes()
    };
  }
}

// Check and trigger 8:00 AM Philippine Time (GMT+8) Web Push Notification
async function checkAndTrigger8AMPushNotification(forceTest = false) {
  const { dateStr, hour } = getManilaTimeInfo();
  
  // Trigger if forceTest IS true OR if hour >= 8 AM PST and notification hasn't been sent for today
  const lastPushedDate = await getDBValue('last_pushed_date_gmt8');
  
  if (!forceTest && (hour < 8 || lastPushedDate === dateStr)) {
    return false; // Not yet 8:00 AM PST or already sent today
  }

  // Load due items synced from client
  const dueItems = (await getDBValue('due_items')) || [];
  
  let title = '🇵🇭 BIZ-COMPLY 8:00 AM PHT Tax Compliance Alert';
  let body = 'Daily 8:00 AM PHT Summary: Maintain BIR tax compliance across all client entities.';

  if (dueItems.length > 0) {
    const overdueCount = dueItems.filter(i => i.isOverdue).length;
    const dueTodayCount = dueItems.filter(i => i.isDueToday).length;
    const upcomingCount = dueItems.filter(i => i.isUpcoming).length;

    const urgentItems = dueItems.slice(0, 2).map(i => `${i.clientName} (${i.form ? i.form.code : 'BIR Form'})`).join(', ');

    if (overdueCount > 0) {
      title = `🚨 8:00 AM PHT Alert: ${overdueCount} Overdue BIR Form(s)!`;
      body = `Urgent BIR tax action required for: ${urgentItems}. File immediately to avoid penalties.`;
    } else if (dueTodayCount > 0) {
      title = `📅 8:00 AM PHT Alert: ${dueTodayCount} BIR Form(s) DUE TODAY!`;
      body = `Deadline Today: ${urgentItems}. Complete filing & tax payment today.`;
    } else if (upcomingCount > 0) {
      title = `📌 8:00 AM PHT Reminder: ${upcomingCount} Upcoming BIR Form(s)`;
      body = `Upcoming BIR deadlines this week for: ${urgentItems}.`;
    }
  }

  const options = {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'bizcomply-8am-philippines-' + dateStr,
    renotify: true,
    requireInteraction: true,
    data: { 
      url: '/',
      pushedAtGMT8: dateStr,
      pushedAt8AM: true
    }
  };

  try {
    await self.registration.showNotification(title, options);
    if (!forceTest) {
      await setDBValue('last_pushed_date_gmt8', dateStr);
    }
    return true;
  } catch (err) {
    console.warn('Service worker failed to show 8:00 AM Web Push:', err);
    return false;
  }
}

// Service Worker Install & Activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      // Check 8:00 AM trigger on activation
      checkAndTrigger8AMPushNotification();
    })
  );
});

// Periodic Background Sync Event (Supported in modern browsers/PWAs)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'bizcomply-daily-8am-push') {
    event.waitUntil(checkAndTrigger8AMPushNotification());
  }
});

// Handle messages sent from client app
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SYNC_DUE_ITEMS') {
    event.waitUntil(
      (async () => {
        if (Array.isArray(event.data.dueItems)) {
          await setDBValue('due_items', event.data.dueItems);
        }
        if (event.data.userTimezone) {
          await setDBValue('user_timezone', event.data.userTimezone);
        }
        // Check 8:00 AM trigger
        checkAndTrigger8AMPushNotification();
      })()
    );
  } else if (event.data.type === 'TEST_8AM_PUSH') {
    event.waitUntil(checkAndTrigger8AMPushNotification(true));
  }
});

// Handle standard Web Push events
self.addEventListener('push', (event) => {
  let data = {
    title: '🇵🇭 BIZ-COMPLY 8:00 AM PHT Push Alert',
    body: 'Automatic 8:00 AM PHT BIR Tax Compliance reminder.',
    url: '/'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'bizcomply-push-alert',
    renotify: true,
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'BIZ-COMPLY Alert', options)
  );
});

// Handle notification click action
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Background interval check while Service Worker is alive
setInterval(() => {
  checkAndTrigger8AMPushNotification();
}, 60000); // Check every minute
