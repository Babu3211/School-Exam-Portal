const CACHE_NAME = 'smss-pwa-v52-iemis-computer-20261110';
const APP_SHELL = [
  './',
  './index.html',
  './iemis-ledger.js',
  './iemis-entry.js',
  './iemis-ledger.js?v=20261110-computer2',
  './iemis-entry.js?v=20261110-computer2',
  './cdc-question-paper.js',
  './data/cdc-grade8-science-practice-pack-v1.json',
  './data/cdc-grade10-science-practice-pack-v1.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key.startsWith('smss-pwa-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const appRoot = new URL('./', self.location.href).pathname;
        const appIndex = new URL('./index.html', self.location.href).pathname;
        const isAppEntry = [appRoot, appIndex, appIndex.replace(/\.html$/, '')].includes(url.pathname);
        if (response && response.ok && isAppEntry) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetch(request);
  })());
});
