'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Circle } from 'lucide-react';

interface Props {
  googleLinkSet: boolean;
  tableCount: number;
}

export function SetupChecklist({ googleLinkSet, tableCount }: Props) {
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/pos/catalog', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!cancelled && result) setProductCount(Array.isArray(result.products) ? result.products.length : 0); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const steps = [
    { done: googleLinkSet, label: 'Coller le lien Google de votre restaurant', hint: 'Dans « Réglages du restaurant » ci-dessous.', href: '#reglages' },
    { done: productCount === null ? null : productCount > 0, label: 'Ajouter vos produits à la carte', hint: 'Onglet Menu de la caisse.', href: '/caisse' },
    { done: tableCount > 0, label: 'Recevoir vos tables, puces NFC et QR codes', hint: 'Fournis par Digifeel : contactez-nous si rien n’apparaît.', href: null }
  ];
  const known = steps.filter(step => step.done !== null);
  if (known.length === steps.length && known.every(step => step.done)) return null;

  return (
    <section className="next-glass-card next-surface-card setup-checklist" aria-label="Démarrage">
      <h2>Pour bien démarrer</h2>
      <p className="next-muted">{known.filter(step => step.done).length} étape(s) sur {steps.length} terminée(s).</p>
      <ol>
        {steps.map(step => <li key={step.label} className={step.done ? 'is-done' : undefined}>
          {step.done ? <Check size={18} aria-label="Terminé" /> : <Circle size={18} aria-label="À faire" />}
          <div>
            <strong>{step.label}</strong>
            <small>{step.hint}</small>
          </div>
          {!step.done && step.href && <Link className="next-link" href={step.href}>Ouvrir</Link>}
        </li>)}
      </ol>
    </section>
  );
}
