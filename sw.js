// !! CACHE-VERSION — automatisch bei jedem Build aktualisiert !!
const CACHE = 'kvgrom-v20261005-1430';
const ASSETS = ['./', './index.html', './manifest.json', './logo-fahrt.jpeg', './logo-schule.png', './hero-bg.jpg', './song.mp3'];
const AUDIO_PREFIX = './audio/';

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
      // Kein automatisches UPDATE_AVAILABLE senden — Seite lädt nach controllerchange selbst neu

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

// Push-Benachrichtigungen (von der Cloud Function über Firebase Cloud Messaging)
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload = {};
  try { payload = e.data.json(); } catch (err) { payload = { notification: { title: 'KvG Rom 2026', body: e.data.text() } }; }
  const n = payload.notification || payload.data || payload;
  const appUrl = self.location.origin + self.location.pathname.replace('sw.js', '');
  e.waitUntil(
    self.registration.showNotification(n.title || 'KvG Rom 2026', {
      body: n.body || '',
      icon: './logo-schule.png',
      badge: './logo-schule.png',
      vibrate: [200, 100, 200],
      tag: payload.fcmMessageId || undefined,
      data: { url: appUrl }
    })
  );
});

// Tipp auf die Benachrichtigung: offene App nach vorne holen, sonst öffnen
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url.startsWith(url) && 'focus' in c) return c.focus(); }
      return clients.openWindow(url);
    })
  );
});
