'use client';

import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { formatMoney, type PosCurrency } from '@/src/lib/pos/currency';
import { parseMenuCsv, parseMenuTable, type MenuParseResult } from '@/src/lib/pos/menu-import';

async function readFile(file: File, currency: PosCurrency): Promise<MenuParseResult> {
  if (/\.xlsx$/i.test(file.name)) {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return { rows: [], errors: ['Le classeur est vide.'] };
    const table: string[][] = [];
    sheet.eachRow(row => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      table.push(values.map(value => value === null || value === undefined ? '' : String(typeof value === 'object' && 'result' in value ? value.result : value)));
    });
    return parseMenuTable(table, currency);
  }
  return parseMenuCsv(await file.text(), currency);
}

/** Importe la carte du restaurant depuis un fichier Excel (.xlsx) ou CSV : nom, catégorie, prix. */
export function MenuImport({ currency, onImported }: { currency: PosCurrency; onImported: () => void }) {
  const [result, setResult] = useState<MenuParseResult | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setStatus('');
    setResult(null);
    if (file.size > 2_000_000) { setStatus('Fichier trop volumineux (2 Mo maximum).'); return; }
    try {
      setResult(await readFile(file, currency));
    } catch {
      setStatus('Ce fichier ne peut pas être lu. Utilisez un fichier .xlsx ou .csv.');
    }
  };

  const confirm = async () => {
    if (!result || result.rows.length === 0 || busy) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/pos/catalog/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: result.rows })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Import impossible.');
      setStatus(`${body.imported} produits ajoutés au menu.`);
      setResult(null);
      if (input.current) input.current.value = '';
      onImported();
    } catch (importError) {
      setStatus(importError instanceof Error ? importError.message : 'Import impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pos-product-form" aria-labelledby="menu-import-title">
      <h3 id="menu-import-title"><FileUp size={16} aria-hidden="true" /> Importer le menu d’un fichier</h3>
      <p className="pos-payment-note">Fichier Excel (.xlsx) ou CSV avec les colonnes : nom, catégorie, prix. Les produits sont ajoutés à ceux qui existent déjà.</p>
      <input ref={input} type="file" accept=".xlsx,.csv,text/csv" onChange={event => void choose(event.target.files?.[0])} />
      {result && <>
        <p role="status">{result.rows.length} produits prêts à importer{result.rows[0] ? ` (ex. ${result.rows[0].name} · ${formatMoney(result.rows[0].priceMinor, currency, 'fr-FR')})` : ''}.</p>
        {result.errors.length > 0 && <ul className="pos-payment-note">{result.errors.slice(0, 5).map(message => <li key={message}>{message}</li>)}{result.errors.length > 5 && <li>… et {result.errors.length - 5} autres.</li>}</ul>}
        <button type="button" className="pos-checkout-button" disabled={busy || result.rows.length === 0} onClick={() => void confirm()}>{busy ? 'Import…' : `Importer ${result.rows.length} produits`}</button>
      </>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
