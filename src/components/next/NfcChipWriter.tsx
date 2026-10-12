'use client';

import { useState } from 'react';
import { Radio } from 'lucide-react';

interface NdefMessageInit { records: Array<{ recordType: string; data: string }> }
interface NdefReaderLike {
  write(message: NdefMessageInit): Promise<void>;
  scan(): Promise<void>;
  onreading: ((event: { message: { records: Array<{ recordType: string; data: DataView }> } }) => void) | null;
  onreadingerror: (() => void) | null;
}
type NdefReaderConstructor = new () => NdefReaderLike;

interface Props { slug: string; tables: number[] }

export function NfcChipWriter({ slug, tables }: Props) {
  const [table, setTable] = useState(tables[0] ?? 1);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const Reader = typeof window !== 'undefined' ? (window as unknown as { NDEFReader?: NdefReaderConstructor }).NDEFReader : undefined;
  const url = typeof window !== 'undefined' ? `${window.location.origin}/r/${encodeURIComponent(slug)}/t/${table}` : '';

  if (!Reader) {
    return <section className="next-glass-card next-surface-card">
      <h2><Radio aria-hidden="true" /> Écrire une puce NFC</h2>
      <p className="next-muted">L’écriture de puces fonctionne uniquement avec Chrome sur un téléphone Android compatible NFC. Ouvrez cette page depuis ce téléphone.</p>
    </section>;
  }

  const write = async () => {
    if (busy) return;
    setBusy(true);
    setStatus('Approchez la puce du téléphone…');
    try {
      await new Reader().write({ records: [{ recordType: 'url', data: url }] });
      setStatus(`Puce écrite pour la table ${table}. Testez-la avec « Tester une puce ».`);
    } catch (error) {
      console.error('Écriture NFC impossible.', error);
      setStatus('L’écriture a échoué. Vérifiez que le NFC est activé et que la puce est inscriptible.');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (busy) return;
    setBusy(true);
    setStatus('Approchez la puce à tester…');
    try {
      const reader = new Reader();
      await reader.scan();
      reader.onreadingerror = () => { setStatus('Puce illisible.'); setBusy(false); };
      reader.onreading = event => {
        const record = event.message.records[0];
        const text = record ? new TextDecoder().decode(record.data) : '';
        setStatus(text ? `Puce lue : ${text}` : 'Puce vide.');
        setBusy(false);
      };
    } catch (error) {
      console.error('Lecture NFC impossible.', error);
      setStatus('La lecture a échoué. Vérifiez que le NFC est activé.');
      setBusy(false);
    }
  };

  return <section className="next-glass-card next-surface-card">
    <h2><Radio aria-hidden="true" /> Écrire une puce NFC</h2>
    <label>Table
      <select value={table} onChange={event => setTable(Number(event.target.value))}>
        {tables.map(number => <option key={number} value={number}>Table {number}</option>)}
      </select>
    </label>
    <p className="next-muted"><code>{url}</code></p>
    <div className="next-qr-actions">
      <button className="product-button" type="button" disabled={busy} onClick={() => void write()}>Écrire la puce</button>
      <button className="product-button product-button--secondary" type="button" disabled={busy} onClick={() => void test()}>Tester une puce</button>
    </div>
    {status && <p className="next-muted" role="status">{status}</p>}
  </section>;
}
