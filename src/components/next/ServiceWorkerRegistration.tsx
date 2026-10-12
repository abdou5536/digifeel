'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        const worker = navigator.serviceWorker.controller ?? registration.active;
        const staticAssets = performance.getEntriesByType('resource')
          .map(entry => entry.name)
          .filter(url => {
            if (!url.startsWith(window.location.origin)) return false;
            const path = new URL(url).pathname;
            return path.startsWith('/_next/static/') || path.startsWith('/icons/') || path === '/manifest.webmanifest';
          });
        worker?.postMessage({ type: 'CACHE_POS_SHELL', staticAssets });
      } catch (error) {
        console.error('Le mode hors connexion Digifeel n’a pas pu être activé.', error);
      }
    })();
  }, []);

  return null;
}
