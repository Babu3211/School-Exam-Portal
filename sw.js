const CACHE_NAME = 'smss-pwa-v105-grade9-review-integrity-2083';
const APP_SHELL = [
  './',
  './index.html',
  './iemis-ledger.js',
  './iemis-entry.js',
  './iemis-transfer-export.js',
  './iemis-importer/transfer.js',
  './iemis-ledger.js?v=20261115-class6-ledger',
  './iemis-entry.js?v=20261122-viewer-readonly',
  './cdc-question-paper.js',
  './cdc-question-autogen.mjs',
  './cdc-exact-grid.mjs',
  './cdc-question-excel.mjs',
  './cdc-verified-computer-grids.mjs',
  './cdc-optional-math-2082.mjs',
  './cdc-optional-math-model-compare.mjs',
  './cdc-optional-math-composite.mjs',
  './cdc-optional-math-original-practice.mjs',
  './cdc-optional-math-render.mjs',
  './cdc-grid-source-index.mjs',
  './cdc-grade9-release-audit.mjs',
  './cdc-grade9-paper-grid-guard.mjs',
  './cdc-grade9-model-reference-audit.mjs',
  './cdc-grade9-reference-readiness.mjs',
  './cdc-grade9-reference-preview.mjs',
  './cdc-grade9-nepali-model-2078.mjs',
  './cdc-grade9-nepali-grouped-planner.mjs',
  './cdc-grade9-nepali-reference-bank.mjs',
  './cdc-grade9-nepali-textbook-reference.mjs',
  './cdc-grade9-english-grouped-planner.mjs',
  './cdc-grade9-english-reference-bank.mjs',
  './cdc-grade9-english-seen-reference.mjs',
  './cdc-grade9-english-seen-prose-data.mjs',
  './cdc-grade9-compulsory-math-grouped.mjs',
  './cdc-grade9-compulsory-math-reference-bank.mjs',
  './cdc-grade9-science-archive-audit.mjs',
  './cdc-grade9-science-reference-planner.mjs',
  './cdc-grade9-social-reference-planner.mjs',
  './cdc-grade9-social-reference-bank.mjs',
  './cdc-grade9-computer-original-practice.mjs',
  './cdc-grade9-environment-original-practice.mjs',
  './cdc-grade9-environment-reference-bank.mjs',
  './cdc-grade9-social-original-practice.mjs',
  './cdc-grade9-compulsory-math-practice.mjs',
  './cdc-grade9-english-practice.mjs',
  './cdc-grade9-nepali-practice.mjs',
  './cdc-grade9-science-original-practice.mjs',
  './cdc-grade9-science-school-reference.mjs',
  './cdc-grade8-science-model-audit.mjs',
  './cdc-grade8-science-original-supplement.mjs',
  './data/cdc-question-paper-sources-2083.json',
  './data/cdc-science-bilingual-mcq-v1.json',
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
    // Mutable same-URL assets must refresh online when a hosted PWA/APK WebView opens.
    // Versioned release imports remain cache-first for reliable offline use.
    const mutable = /\.(?:m?js|css|json|webmanifest)$/i.test(url.pathname) && !url.searchParams.has('v');
    if (mutable) {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(request)) || Response.error();
      }
    }
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetch(request);
  })());
});
