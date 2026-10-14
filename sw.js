const CACHE_NAME = 'vp-portfolio-cache-v5';
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'app.bundle.js?v=22',
  'favicon.png?v=2',
  'manifest.json',
  'assets/asset/myself/main_01_nobg.webp',
  'assets/asset/myself/project_experience_nobg.webp',
  'assets/asset/myself/avatar_nobg.webp',
  'assets/asset/myself/honors_banner.webp',
  'assets/AssetManifest.bin.json',
  'assets/FontManifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching partial fail:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Ignore non-GET or cross-origin analytics/CDN calls
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Stale-While-Revalidate for application assets
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
