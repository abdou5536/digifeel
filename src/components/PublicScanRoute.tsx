import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, LoaderCircle, Radio } from 'lucide-react';

const CustomerRatingView = React.lazy(() => import('./CustomerRatingView').then(module => ({ default: module.CustomerRatingView })));

type ScanResult = {
  restaurant: {
    id: string;
    slug: string;
    name: string;
    googleReviewUrl: string;
    tipEnabled: boolean;
  };
  target: {
    type: 'server' | 'table';
    id: string;
    label: string;
  };
};

type ScanState =
  | { status: 'loading' }
  | { status: 'active'; result: ScanResult }
  | { status: 'unknown' | 'disabled' | 'unconfigured' | 'unavailable'; message: string };

const defaultErrors: Record<Exclude<ScanState['status'], 'loading' | 'active'>, string> = {
  unknown: 'Ce lien de scan est introuvable. Vérifiez le QR code ou demandez de l’aide à l’équipe.',
  disabled: 'Ce lien est momentanément désactivé. Demandez à l’équipe du restaurant de vous aider.',
  unconfigured: 'La page d’avis de ce restaurant n’est pas encore prête. L’équipe pourra vous aider.',
  unavailable: 'Le service de scan est temporairement indisponible. Réessayez dans quelques instants.'
};

const newDedupeKey = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const getDedupeKey = (publicId: string): string => {
  const storageKey = `digifeel.scan-dedupe.${publicId}`;
  try {
    const previous = sessionStorage.getItem(storageKey);
    if (previous) {
      const entry = JSON.parse(previous) as { key?: string; createdAt?: number };
      if (entry.key && entry.createdAt && Date.now() - entry.createdAt < 30_000) return entry.key;
    }
    const key = newDedupeKey();
    sessionStorage.setItem(storageKey, JSON.stringify({ key, createdAt: Date.now() }));
    return key;
  } catch {
    return newDedupeKey();
  }
};

export const PublicScanRoute: React.FC<{ publicId: string }> = ({ publicId }) => {
  const [state, setState] = useState<ScanState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setState({ status: 'loading' });

    void fetch(`/api/public/scan-targets/${encodeURIComponent(publicId)}/scan`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dedupeKey: getDedupeKey(publicId) }),
      signal: controller.signal
    }).then(async response => {
      const result = await response.json().catch(() => null) as (ScanResult & {
        status?: string;
        error?: string;
      }) | null;
      if (response.ok && result?.restaurant && result.target) {
        setState({ status: 'active', result: result as ScanResult });
        return;
      }

      const status = result?.status;
      if (status === 'unknown' || status === 'disabled' || status === 'unconfigured') {
        setState({ status, message: result?.error || defaultErrors[status] });
        return;
      }
      setState({ status: 'unavailable', message: result?.error || defaultErrors.unavailable });
    }).catch(() => {
      setState({ status: 'unavailable', message: defaultErrors.unavailable });
    }).finally(() => window.clearTimeout(timeout));

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [publicId]);

  if (state.status === 'active') {
    const { restaurant, target } = state.result;
    const tableNumber = target.type === 'table' ? Number.parseInt(target.id, 10) : undefined;
    return (
      <React.Suspense fallback={<main className="product-shell chip-error-page"><p role="status">Chargement de la page du restaurant…</p></main>}>
      <CustomerRatingView
        restaurantOverride={{ ...restaurant, tipEnabled: restaurant.tipEnabled }}
        tableNumberOverride={tableNumber && Number.isFinite(tableNumber) ? tableNumber : undefined}
        waiterIdOverride={target.type === 'server' ? target.id : undefined}
        publicTargetId={publicId}
      />
      </React.Suspense>
    );
  }

  const isLoading = state.status === 'loading';
  return (
    <main className="product-shell chip-error-page">
      <section className="chip-error-card" aria-labelledby="scan-route-title">
        <span className="chip-error-card__icon">
          {isLoading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <AlertCircle aria-hidden="true" />}
        </span>
        <span className="product-eyebrow">{isLoading ? 'Vérification du lien' : 'Scan NFC ou QR'}</span>
        <h1 id="scan-route-title">{isLoading ? 'Ouverture de la page du restaurant…' : 'Ce lien ne peut pas être ouvert.'}</h1>
        <p role={isLoading ? 'status' : 'alert'}>
          {isLoading ? 'Cela ne prend qu’un instant.' : state.message}
        </p>
        {!isLoading && (
          <a href="/" className="product-button">
            <ArrowLeft aria-hidden="true" /> Retour à l’accueil
          </a>
        )}
        {isLoading && <Radio aria-hidden="true" className="mx-auto text-cyan-300" />}
      </section>
    </main>
  );
};
