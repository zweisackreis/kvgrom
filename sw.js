// Cache-Version — wird bei jedem Update automatisch hochgezählt
const CACHE = 'kvgrom-v20260607-0543';
const ASSETS = ['./', './index.html', './manifest.json', './logo-fahrt.jpeg', './logo-schule.png', './hero-bg.jpg'];

// Installation: neuen Cache befüllen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // sofort aktivieren, nicht auf Tab-Schließen warten
  );
});

// Aktivierung: alten Cache löschen + alle offenen Tabs übernehmen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // alle offenen Tabs sofort aktualisieren
  );
});

// Fetch: Network-first — immer versuchen die aktuelle Version zu laden
// Nur bei fehlender Verbindung auf Cache zurückfallen (Offline-Modus)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Erfolgreiche Antwort im Cache speichern
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // Offline: aus Cache laden
  );
});

// Update-Nachricht an alle offenen Tabs senden
self.addEventListener('activate', e => {
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE', version: 'kvgrom-v20260527-0434' }));
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
