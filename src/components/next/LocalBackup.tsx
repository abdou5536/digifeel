'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { loadAllLocalSales, saveLocalSale } from '@/src/lib/pos/offline-store';
import { buildLocalBackup, parseLocalBackup } from '@/src/lib/pos/local-backup';

declare global {
  interface Window {
    digifeelDesktop?: {
      logError?: (payload: { message: string; source?: string; stack?: string }) => void;
      saveBackup?: (content: string) => Promise<string | null>;
    };
  }
}

const LAST_BACKUP_KEY = 'digifeel-last-auto-backup';

export function DesktopSafety() {
  useEffect(() => {
    const report = (message: string, source?: string, stack?: string) =>
      window.digifeelDesktop?.logError?.({ message, source, stack });
    const onError = (event: ErrorEvent) => report(event.message, event.filename, event.error?.stack);
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report(reason instanceof Error ? reason.message : String(reason), 'promise', reason instanceof Error ? reason.stack : undefined);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    const today = new Date().toISOString().slice(0, 10);
    if (window.digifeelDesktop?.saveBackup && window.localStorage.getItem(LAST_BACKUP_KEY) !== today) {
      void loadAllLocalSales()
        .then(sales => window.digifeelDesktop?.saveBackup?.(JSON.stringify(buildLocalBackup(sales))))
        .then(name => { if (name) window.localStorage.setItem(LAST_BACKUP_KEY, today); })
        .catch(error => report(error instanceof Error ? error.message : 'Sauvegarde automatique impossible', 'backup'));
    }
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}

export function LocalBackupPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  const done = (text: string, isError = false) => { setMessage(text); setFailed(isError); };

  const exportBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const sales = await loadAllLocalSales();
      const blob = new Blob([JSON.stringify(buildLocalBackup(sales), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `digifeel-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      done(`${sales.length} vente(s) exportée(s).`);
    } catch (error) {
      done(error instanceof Error ? error.message : 'L’export a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      if (file.size > 20_000_000) throw new Error('Fichier trop volumineux.');
      const sales = parseLocalBackup(await file.text());
      const existing = new Set((await loadAllLocalSales()).map(sale => sale.id));
      let restored = 0;
      for (const sale of sales) {
        if (existing.has(sale.id) || sale.status === 'synced') continue;
        await saveLocalSale({ ...sale, status: 'pending', error: undefined });
        restored += 1;
      }
      done(restored > 0
        ? `${restored} vente(s) restaurée(s) : elles seront envoyées à la prochaine synchronisation.`
        : 'Rien à restaurer : ces ventes sont déjà présentes ou déjà synchronisées.');
    } catch (error) {
      done(error instanceof Error ? error.message : 'La restauration a échoué.', true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <section className="local-backup" aria-label="Sauvegarde locale">
      <div>
        <strong>Sauvegarde des ventes hors connexion</strong>
        <p>Les ventes enregistrées sans Internet sont copiées sur ce poste. Exportez-les ou restaurez-les depuis un fichier.</p>
      </div>
      <div className="local-backup__actions">
        <button type="button" disabled={busy} onClick={() => void exportBackup()}><Download size={16} />Exporter</button>
        <button type="button" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} />Restaurer</button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={event => void importBackup(event.target.files?.[0])} />
      </div>
      {message && <p role={failed ? 'alert' : 'status'} className={failed ? 'local-backup__error' : undefined}>{message}</p>}
    </section>
  );
}
