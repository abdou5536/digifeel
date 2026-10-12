'use client';

import { useEffect, useState } from 'react';
import { PAPER_OPTIONS, readPaperWidth, savePaperWidth, type PaperWidth } from '@/src/lib/pos/printer-settings';

export function PrinterSettings() {
  const [paper, setPaper] = useState<PaperWidth>('80');

  useEffect(() => { setPaper(readPaperWidth()); }, []);

  return (
    <section className="local-backup" aria-label="Imprimante">
      <h2>Imprimante</h2>
      <p>Choisissez le papier utilisé sur ce poste. L’imprimante elle-même se sélectionne dans la fenêtre d’impression de Windows.</p>
      <label>Format du ticket
        <select value={paper} onChange={event => { const next = event.target.value as PaperWidth; setPaper(next); savePaperWidth(next); }}>
          {PAPER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </section>
  );
}
