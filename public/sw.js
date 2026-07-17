const CACHE_NAME = 'idear-pwa-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  // PWA requires a fetch handler, but in dev we just pass through to network
  // to avoid breaking Vite's dynamic imports and HMR.
  event.respondWith(fetch(event.request).catch(() => {
    return caches.match(event.request);
  }));
});
