import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Link2, QrCode, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

type ScanTarget = {
  public_id: string;
  restaurant_id: string;
  kind: 'nfc' | 'qr';
  uid: string | null;
  label: string;
  target_type: 'server' | 'table';
  target_id: string;
  status: 'active' | 'disabled';
  created_at: string;
  last_scanned_at: string | null;
  total_scans: number;
};

const getApiError = async (response: Response): Promise<string> => {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error || `La requête a échoué (${response.status}).`;
};

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const ScanTargetManager: React.FC<{
  restaurantOverride?: { id: string; slug: string; name: string; googleReviewUrl: string };
}> = ({ restaurantOverride }) => {
  const { restaurant: contextRestaurant, tables, waiters, selectedTableNumber, isDemoMode } = useApp();
  const restaurant = restaurantOverride || contextRestaurant;
  const [targets, setTargets] = useState<ScanTarget[]>([]);
  const [kind, setKind] = useState<'nfc' | 'qr'>('qr');
  const [targetType, setTargetType] = useState<'table' | 'server'>('table');
  const [targetId, setTargetId] = useState(String(selectedTableNumber || tables[0]?.number || 1));
  const [label, setLabel] = useState('');
  const [uid, setUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadTargets = useCallback(async () => {
    if (isDemoMode) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/scan-targets?restaurantId=${encodeURIComponent(restaurant.id)}`, {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const result = await response.json() as { targets: ScanTarget[] };
      setTargets(result.targets);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Les liens de scan n’ont pas pu être chargés.');
    }
  }, [isDemoMode, restaurant.id]);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const createTarget = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/scan-targets', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          googleReviewUrl: restaurant.googleReviewUrl,
          kind,
          uid: kind === 'nfc' ? uid : '',
          label,
          targetType,
          targetId
        })
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const result = await response.json() as { target: ScanTarget };
      setTargets(current => [result.target, ...current.filter(target => target.public_id !== result.target.public_id)]);
      void loadTargets();
      setLabel('');
      setUid('');
      setMessage('Lien unique créé et enregistré.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Le lien n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (target: ScanTarget) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/scan-targets/${encodeURIComponent(target.public_id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target.status === 'active' ? 'disabled' : 'active' })
      });
      if (!response.ok) throw new Error(await getApiError(response));
      setTargets(current => current.map(item => item.public_id === target.public_id
        ? { ...item, status: target.status === 'active' ? 'disabled' : 'active' }
        : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Le statut n’a pas pu être modifié.');
    } finally {
      setBusy(false);
    }
  };

  const getTargetUrl = (target: ScanTarget) => `${window.location.origin}/r/${target.public_id}`;

  const copyLink = async (target: ScanTarget) => {
    try {
      await navigator.clipboard.writeText(getTargetUrl(target));
      setMessage('Lien copié. Vous pouvez le coller dans NFC Tools.');
      setError('');
    } catch (copyError) {
      console.error('La copie du lien de scan a échoué.', copyError);
      setError('Copie impossible dans ce navigateur. Sélectionnez et copiez le lien affiché.');
    }
  };

  const downloadQr = async (target: ScanTarget, format: 'svg' | 'png') => {
    setError('');
    try {
      const url = getTargetUrl(target);
      const fileBase = `digifeel-${target.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (format === 'svg') {
        const svg = await QRCode.toString(url, { type: 'svg', width: 640, margin: 2 });
        downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${fileBase}.svg`);
      } else {
        const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'H' });
        const response = await fetch(dataUrl);
        downloadBlob(await response.blob(), `${fileBase}.png`);
      }
      setMessage(`QR ${format.toUpperCase()} téléchargé.`);
    } catch (downloadError) {
      console.error(`Le téléchargement du QR ${format.toUpperCase()} a échoué.`, downloadError);
      setError('Le QR code n’a pas pu être généré. Réessayez.');
    }
  };

  if (isDemoMode) {
    return (
      <section className="glass-card-dark rounded-3xl p-6 border border-white/10 space-y-3" aria-labelledby="scan-target-title">
        <h2 id="scan-target-title" className="text-xl font-bold text-white">Liens NFC et QR uniques</h2>
        <p className="text-sm text-slate-300">Cette fonction enregistre les liens dans la base de données. Quittez le mode démo et connectez-vous pour la gérer.</p>
      </section>
    );
  }

  const targetOptions = targetType === 'table'
    ? tables.map(table => ({ id: String(table.number), label: `Table ${table.number}` }))
    : waiters.map(waiter => ({ id: waiter.id, label: waiter.name }));

  return (
    <section className="glass-card-dark rounded-3xl p-5 sm:p-6 border border-white/10 space-y-6" aria-labelledby="scan-target-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-300 font-bold">Liens enregistrés en base</p>
          <h2 id="scan-target-title" className="text-xl sm:text-2xl font-bold text-white mt-1">Liens NFC et QR uniques</h2>
          <p className="text-sm text-slate-300 mt-2">Chaque lien suit un identifiant dédié. Scannez-le pour ouvrir la page d’avis de {restaurant.name}.</p>
        </div>
        <button type="button" onClick={() => void loadTargets()} className="min-h-11 px-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/10 flex items-center gap-2">
          <RefreshCw aria-hidden="true" size={16} /> Actualiser
        </button>
      </header>

      {!restaurant.googleReviewUrl && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100" role="status">
          Configurez d’abord le lien d’avis Google du restaurant. Les nouveaux liens resteront en erreur tant qu’il manque.
        </p>
      )}

      <form onSubmit={event => void createTarget(event)} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
        <label className="text-sm text-slate-200 flex flex-col gap-1.5">
          Type
          <select value={kind} onChange={event => setKind(event.target.value as 'nfc' | 'qr')} className="min-h-11 rounded-xl bg-slate-900 border border-white/15 px-3">
            <option value="qr">QR code</option>
            <option value="nfc">Puce NFC</option>
          </select>
        </label>
        <label className="text-sm text-slate-200 flex flex-col gap-1.5">
          Cible
          <select value={targetType} onChange={event => setTargetType(event.target.value as 'table' | 'server')} className="min-h-11 rounded-xl bg-slate-900 border border-white/15 px-3">
            <option value="table">Table</option>
            <option value="server">Serveur</option>
          </select>
        </label>
        <label className="text-sm text-slate-200 flex flex-col gap-1.5">
          {targetType === 'table' ? 'Table' : 'Serveur'}
          <select value={targetId} onChange={event => setTargetId(event.target.value)} required className="min-h-11 rounded-xl bg-slate-900 border border-white/15 px-3">
            {targetOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-200 flex flex-col gap-1.5">
          Nom du support
          <input value={label} onChange={event => setLabel(event.target.value)} required maxLength={120} placeholder="Ex. Table 4" className="min-h-11 rounded-xl bg-slate-900 border border-white/15 px-3" />
        </label>
        {kind === 'nfc' && (
          <label className="text-sm text-slate-200 flex flex-col gap-1.5">
            UID NFC
            <input value={uid} onChange={event => setUid(event.target.value)} required maxLength={128} placeholder="UID de la puce" className="min-h-11 rounded-xl bg-slate-900 border border-white/15 px-3" />
          </label>
        )}
        <button type="submit" disabled={busy || !label.trim() || !targetId || (kind === 'nfc' && !uid.trim())} className="min-h-11 rounded-xl bg-amber-400 px-4 font-bold text-slate-950 disabled:opacity-50 flex items-center justify-center gap-2">
          <Link2 aria-hidden="true" size={17} /> Créer le lien
        </button>
      </form>

      {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
      {message && <p className="text-sm text-emerald-300" role="status">{message}</p>}

      <div className="space-y-3">
        {targets.length === 0 && !error ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Aucun lien enregistré pour le moment.</p>
        ) : targets.map(target => (
          <article key={target.public_id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 text-cyan-300" aria-hidden="true">{target.kind === 'nfc' ? <Radio size={19} /> : <QrCode size={19} />}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{target.label}</h3>
                  <p className="text-sm text-slate-300">{target.target_type === 'table' ? `Table ${target.target_id}` : `Serveur ${target.target_id}`} · {target.kind === 'nfc' ? `UID ${target.uid}` : 'QR code'}</p>
                  <a href={getTargetUrl(target)} className="inline-block max-w-full break-all text-sm text-cyan-200 underline underline-offset-2" target="_blank" rel="noreferrer">{getTargetUrl(target)}</a>
                  <p className="mt-1 text-xs text-slate-400">{target.total_scans} scan(s) enregistré(s) · {target.status === 'active' ? 'Actif' : 'Désactivé'}</p>
                </div>
              </div>
              {target.status === 'active' && <ShieldCheck className="shrink-0 text-emerald-300" aria-label="Lien actif" size={19} />}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyLink(target)} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Copy aria-hidden="true" size={16} /> Copier le lien NFC</button>
              <button type="button" onClick={() => void downloadQr(target, 'svg')} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Download aria-hidden="true" size={16} /> QR SVG</button>
              <button type="button" onClick={() => void downloadQr(target, 'png')} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Download aria-hidden="true" size={16} /> QR PNG</button>
              <button type="button" disabled={busy} onClick={() => void toggleStatus(target)} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm text-white hover:bg-white/10 disabled:opacity-50 flex items-center gap-2">
                {target.status === 'active' ? 'Désactiver' : <><Check aria-hidden="true" size={16} /> Réactiver</>}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
