const CACHE_NAME = 'digifeel-app-v2';
const isCacheableAsset = pathname =>
  pathname.startsWith('/_next/static/') ||
  pathname.startsWith('/icons/') ||
  pathname === '/manifest.webmanifest';
const OFFLINE_PAGE = `<!doctype html>
<html lang="fr">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#080b0a">
  <title>Digifeel POS hors connexion</title>
  <body style="margin:0;background:#080b0a;color:#f1f0eb;font:16px system-ui,sans-serif">
    <main style="max-width:32rem;margin:15vh auto;padding:2rem">
      <h1>Connexion indisponible</h1>
      <p>La caisse hors ligne nécessite une première ouverture avec Internet. Les tickets déjà enregistrés sur cet appareil seront synchronisés au retour du réseau.</p>
      <a href="/caisse" style="color:#c99445">Réessayer la caisse</a>
    </main>
  </body>
</html>`;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.put('/__digifeel_offline__', new Response(OFFLINE_PAGE, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter(name => name.startsWith('digifeel-app-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_POS_SHELL') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch('/caisse');
    if (shellResponse.ok) await cache.put('/caisse', shellResponse);
    const assets = Array.isArray(event.data.staticAssets) ? event.data.staticAssets : [];
    await Promise.all(assets.map(async assetUrl => {
      try {
        const url = new URL(assetUrl);
        if (url.origin !== self.location.origin || !isCacheableAsset(url.pathname)) return;
        const response = await fetch(url.href);
        if (response.ok) await cache.put(url.href, response);
      } catch (error) {
        console.error('POS static asset could not be cached.', error);
      }
    }));
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (isCacheableAsset(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const fresh = fetch(request).then(response => {
        if (response.ok) void cache.put(request, response.clone());
        return response;
      });
      return cached || fresh.catch(() => new Response('', { status: 503 }));
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && url.pathname === '/caisse') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/caisse', response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        if (url.pathname === '/caisse') {
          const cashier = await cache.match('/caisse');
          if (cashier) return cashier;
        }
        return await cache.match('/__digifeel_offline__') || new Response(OFFLINE_PAGE, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
  }
});
