const CACHE = 'kvgrom-v2';
const ASSETS = ['./', './index.html', './manifest.json', './logo-fahrt.jpeg', './logo-schule.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// ── Firebase Push-Benachrichtigungen ──
self.addEventListener('push', e => {
  if (!e.data) return;
  const payload = e.data.json();
  const { title, body, icon } = payload.notification || payload;
  e.waitUntil(
    self.registration.showNotification(title || 'KvG Rom 2026', {
      body: body || '',
      icon: icon || './logo-schule.png',
      badge: './logo-schule.png',
      vibrate: [200, 100, 200],
      data: { url: self.location.origin + self.location.pathname.replace('sw.js','') }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
