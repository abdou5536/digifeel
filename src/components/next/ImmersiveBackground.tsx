'use client';

import { lazy, Suspense, useEffect, useState } from 'react';

// La scène 3D (three + r3f + drei) n'est téléchargée qu'après le premier rendu.
const ImmersiveScene = lazy(() => import('./ImmersiveScene'));

/**
 * Fond immersif fixe derrière le contenu.
 * - Fond statique (dégradé) affiché immédiatement et si WebGL est indisponible.
 * - Scène 3D chargée en lazy, uniquement si WebGL est disponible.
 * - Respecte prefers-reduced-motion et le thème clair/sombre.
 */
export function ImmersiveBackground() {
  const [enabled, setEnabled] = useState(false);
  const [dark, setDark] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // WebGL disponible ?
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    } catch {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const syncMedia = () => { setReducedMotion(motionQuery.matches); setMobile(mobileQuery.matches); };
    const syncTheme = () => setDark(document.documentElement.dataset.theme !== 'light');
    syncMedia();
    syncTheme();

    motionQuery.addEventListener('change', syncMedia);
    mobileQuery.addEventListener('change', syncMedia);
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // On laisse d'abord la page devenir interactive avant de charger la 3D.
    const start = () => setEnabled(true);
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idle = hasIdle ? window.requestIdleCallback(start, { timeout: 1500 }) : (window as Window).setTimeout(start, 300);

    return () => {
      motionQuery.removeEventListener('change', syncMedia);
      mobileQuery.removeEventListener('change', syncMedia);
      observer.disconnect();
      if (hasIdle) window.cancelIdleCallback(idle);
      else (window as Window).clearTimeout(idle);
    };
  }, []);

  return (
    <div className="immersive-bg" aria-hidden="true">
      <div className="immersive-bg__static" />
      {enabled && (
        <Suspense fallback={null}>
          <div className="immersive-bg__canvas">
            <ImmersiveScene dark={dark} mobile={mobile} reducedMotion={reducedMotion} />
          </div>
        </Suspense>
      )}
    </div>
  );
}