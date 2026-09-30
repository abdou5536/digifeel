const CACHE_NAME = 'digifeel-app-v3';
const FALLBACK_URL = '/';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(FALLBACK_URL);
    if (!response.ok) {
      throw new Error('Impossible de précharger l’application.');
    }

    await cache.put(FALLBACK_URL, response);
    const manifestResponse = await fetch('/precache-assets.json');
    if (!manifestResponse.ok) {
      throw new Error('Impossible de préparer les fichiers hors connexion.');
    }
    const assetUrls = await manifestResponse.json();
    await cache.addAll([
      '/manifest.webmanifest',
      '/icons/icon.svg',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/precache-assets.json',
      ...assetUrls
    ]);

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('digifeel-app-') && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(FALLBACK_URL, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cachedPage = await cache.match(request);
        const offlineShell = cachedPage || await cache.match(FALLBACK_URL);
        return offlineShell || new Response(
          '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#19281f"><title>Digifeel indisponible</title><body style="margin:0;background:#19281f;color:#f6f4ed;font:16px system-ui,sans-serif"><main style="max-width:32rem;margin:15vh auto;padding:2rem"><h1>Connexion indisponible</h1><p>Reconnectez-vous à Internet, puis réessayez.</p><a href="/" style="color:#e6c6b4">Réessayer</a></main></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedAsset = await cache.match(request);
      if (cachedAsset) return cachedAsset;

      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
