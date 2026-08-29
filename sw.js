// Cache-Version — bei jedem Update automatisch hochgezählt
const CACHE = 'kvgrom-v20260829-0711';
const ASSETS = ['./', './index.html', './manifest.json', './logo-fahrt.jpeg', './logo-schule.png', './hero-bg.jpg'];

// ── Installation ──
// skipWaiting() sorgt dafür dass der neue SW sofort übernimmt
// ohne dass der Nutzer den Tab schließen muss
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Aktivierung ──
// ALLE alten Caches löschen + sofort alle offenen Tabs übernehmen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Lösche alten Cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Update-Meldung an alle Tabs
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE', version: 'kvgrom-v20260829-0711' }));
        });
      })
  );
});

// ── Fetch: Network-first mit Cache-Busting für HTML ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // index.html immer frisch vom Netz holen (kein Cache für Hauptdatei)
  if (e.request.url.endsWith('/') || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Alle anderen Assets: Network-first, Cache als Fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── SKIP_WAITING Nachricht vom Client empfangen ──
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
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
