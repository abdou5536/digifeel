'use client';

import { useEffect, useState } from 'react';

type Bill = { table: string; total_dzd: number; paid_dzd: number; discount_dzd: number;
  items: { name: string; quantity: number; unit_price_dzd: number; line_total_dzd: number }[] };
type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; bill: Bill };

const dzd = (n: number) => `${new Intl.NumberFormat('fr-DZ').format(n)} DA`;

// Le jeton reste en mémoire (jamais dans localStorage) : recharger la page ouvre une nouvelle session.
export function TableBill({ code }: { code: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetch('/api/public/table-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
        if (!s.ok) throw new Error(s.status === 404 ? 'Aucune addition ouverte pour cette table.' : 'Service indisponible.');
        const { token } = await s.json() as { token: string };
        const b = await fetch('/api/public/table-bill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
        if (!b.ok) throw new Error('Session expirée. Demandez l’addition au serveur.');
        const { bill } = await b.json() as { bill: Bill };
        if (!cancelled) setState({ kind: 'ready', bill });
      } catch (error) {
        if (!cancelled) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur.' });
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      {state.kind === 'loading' && <p role="status">Chargement…</p>}
      {state.kind === 'error' && <p role="alert">{state.message}</p>}
      {state.kind === 'ready' && (
        <section aria-label="Addition">
          <h1>Table {state.bill.table}</h1>
          <ul>{state.bill.items.map((item, i) => (
            <li key={i}>{item.quantity} × {item.name} — {dzd(item.line_total_dzd)}</li>
          ))}</ul>
          {state.bill.discount_dzd > 0 && <p>Remise : −{dzd(state.bill.discount_dzd)}</p>}
          <p><strong>Total : {dzd(state.bill.total_dzd)}</strong></p>
          {state.bill.paid_dzd > 0 && <p>Déjà réglé : {dzd(state.bill.paid_dzd)}</p>}
          <p><small>Paiement : demandez au serveur. Ce document est un récapitulatif d’information ; Digifeel n’est pas une caisse certifiée NF525.</small></p>
        </section>
      )}
    </main>
  );
}