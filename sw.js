/**
 * i-LPG Service Worker
 * PWA Offline Support & Caching Strategy
 */

const CACHE_NAME   = 'ilpg-v1.0.0';
const STATIC_CACHE = 'ilpg-static-v1';
const API_CACHE    = 'ilpg-api-v1';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/charts.js',
  '/manifest.json',
  '/pages/driver.html',
  '/pages/admin.html',
  '/pages/hrd.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

/* ── Install ── */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http'))))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Cache install error:', err))
  );
});

/* ── Activate ── */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and GAS API calls
  if (event.request.method !== 'GET') return;
  if (url.hostname === 'script.google.com') return;

  // API-like requests — network first, fallback to cache
  if (url.pathname.includes('/api/') || url.hostname.includes('googleapis')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets — cache first, fallback to network
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

function offlineFallback(request) {
  if (request.headers.get('accept')?.includes('text/html')) {
    return caches.match('/offline.html')
      .then(res => res || caches.match('/index.html'));
  }
  return new Response(
    JSON.stringify({ status: 'offline', message: 'Tidak ada koneksi internet.' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/* ── Push Notifications (ready for future) ── */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'i-LPG', {
      body: data.body || '',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-72.png',
      tag: data.tag || 'ilpg-notif',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
