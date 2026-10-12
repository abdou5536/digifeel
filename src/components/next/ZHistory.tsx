'use client';

import { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { formatMoney, type PosCurrency } from '@/src/lib/pos/currency';

type ZReport = {
  id: string;
  number: number;
  sales_count: number;
  reversals_count: number;
  totals_by_method: Record<string, number>;
  net_total_dzd: number;
  closed_at: string;
};

const METHOD_LABELS: Record<string, string> = { cash: 'Espèces', card: 'Carte', baridimob: 'BaridiMob' };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

export function ZHistory({ currency, restaurantName, refreshKey }: { currency: PosCurrency; restaurantName: string; refreshKey: number }) {
  const [reports, setReports] = useState<ZReport[] | null>(null);
  const [error, setError] = useState('');
  const money = useCallback((value: number) => formatMoney(Number(value), currency, 'fr-FR'), [currency]);

  useEffect(() => {
    let active = true;
    fetch('/api/pos/z', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Les clôtures n’ont pas pu être chargées.');
        if (active) { setReports(result.reports); setError(''); }
      })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Les clôtures n’ont pas pu être chargées.'); });
    return () => { active = false; };
  }, [refreshKey]);

  const print = (report: ZReport) => {
    const popup = window.open('', '_blank', 'width=420,height=640');
    if (!popup) { setError('Autorisez l’ouverture de fenêtres pour imprimer.'); return; }
    const rows = Object.entries(report.totals_by_method)
      .map(([method, total]) => `<tr><td>${escapeHtml(METHOD_LABELS[method] ?? method)}</td><td style="text-align:right">${escapeHtml(money(total))}</td></tr>`)
      .join('');
    popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Z n° ${report.number}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:16px;color:#000}h1{font-size:16px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:4px 0;border-bottom:1px dashed #999}.total td{font-weight:bold;border-bottom:2px solid #000}</style></head><body>
<h1>${escapeHtml(restaurantName)}</h1><div>Clôture de caisse (Z) n° ${String(report.number).padStart(4, '0')}</div>
<div>${escapeHtml(new Date(report.closed_at).toLocaleString('fr-FR'))}</div>
<table><tr><td>Ventes</td><td style="text-align:right">${report.sales_count}</td></tr><tr><td>Annulations</td><td style="text-align:right">${report.reversals_count}</td></tr>${rows}<tr class="total"><td>Total net</td><td style="text-align:right">${escapeHtml(money(report.net_total_dzd))}</td></tr></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
    popup.document.close();
  };

  return (
    <section className="pos-z-history" aria-labelledby="z-history-title">
      <h2 id="z-history-title">Historique des clôtures (Z)</h2>
      {error && <p className="pos-error" role="alert">{error}</p>}
      {reports && reports.length === 0 && <p className="pos-empty-hint">Aucune clôture pour le moment.</p>}
      <ul>
        {reports?.map(report => (
          <li key={report.id} className="pos-sale-card">
            <div className="pos-sale-card__main">
              <b className="pos-ticket-number">Z n° {String(report.number).padStart(4, '0')}</b>
              <strong>{money(report.net_total_dzd)}</strong>
              <small>{new Date(report.closed_at).toLocaleString('fr-FR')} · {report.sales_count} vente(s), {report.reversals_count} annulation(s)</small>
            </div>
            <div className="pos-sale-card__footer">
              <span>{Object.entries(report.totals_by_method).map(([method, total]) => `${METHOD_LABELS[method] ?? method} ${money(total)}`).join(' · ')}</span>
              <button type="button" onClick={() => print(report)}><Printer size={15} />Imprimer</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
