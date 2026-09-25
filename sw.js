// !! CACHE-VERSION — automatisch bei jedem Build aktualisiert !!
const CACHE = 'kvgrom-v20260925-0951';
const ASSETS = ['./', './index.html', './manifest.json', './logo-fahrt.jpeg', './logo-schule.png', './hero-bg.jpg', './song.mp3'];

// Installation: Cache befüllen + SOFORT übernehmen (skipWaiting)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())  // nicht warten — sofort aktiv
  );
});

// Aktivierung: ALLE alten Caches löschen + alle Tabs übernehmen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE', version: 'kvgrom-v20260831-1218' }))
      ))
  );
});

// Fetch: index.html IMMER vom Netz (nie aus Cache)
// Alles andere: Network-first, Cache als Fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('/kvgrom/') || url.pathname.endsWith('/kvgrom');

  if (isHtml) {
    // HTML: immer frisch, nie aus Cache
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets: Network-first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// SKIP_WAITING auf Anfrage
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Push-Benachrichtigungen
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
