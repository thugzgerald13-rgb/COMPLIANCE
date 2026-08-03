// BIZ-COMPLY Web Push & Service Worker Manager
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'BIZ-COMPLY Compliance Alert',
    body: 'You have upcoming BIR tax compliance deadlines that require attention.',
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
