'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3 } from 'lucide-react';
import {
  confirmPendingPayment, getRestaurantData, getSelectedRestaurantId, subscribeRestaurantData,
  type Payment, type RestaurantData
} from '@/src/services/restaurant';

/** Paiements déclarés par les clients depuis la page de table, en attente de validation en caisse. */
export function PendingGuestPayments() {
  const [data, setData] = useState<RestaurantData | null>(null);
  const [restaurantId, setRestaurantId] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const [next, selected] = await Promise.all([getRestaurantData(), getSelectedRestaurantId()]);
      setData(next);
      setRestaurantId(selected);
      setError('');
    } catch {
      setError('Impossible de charger les paiements en attente.');
    }
  }, []);

  useEffect(() => {
    void load();
    return subscribeRestaurantData(() => { void load(); });
  }, [load]);

  const pending: Payment[] = data?.payments.filter(p => p.status === 'pending' && p.restaurantId === restaurantId) ?? [];

  async function confirm(paymentId: string) {
    setBusyId(paymentId);
    try {
      await confirmPendingPayment(paymentId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation impossible.');
    } finally {
      setBusyId('');
    }
  }

  if (!data && !error) return <p role="status" style={{ padding: '1rem' }}>Chargement des paiements…</p>;
  return (
    <section className="workspace-panel" aria-labelledby="pending-payments-title" style={{ margin: '1.5rem auto', maxWidth: 720, padding: '1.25rem' }}>
      <h2 id="pending-payments-title"><Clock3 size={18} aria-hidden="true" /> Paiements clients à valider ({pending.length})</h2>
      {error && <p role="alert">{error}</p>}
      {pending.length === 0 && !error && <p>Aucun paiement en attente de validation.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '.5rem' }}>
        {pending.map(payment => (
          <li key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span>{payment.amount.toLocaleString('fr-FR')} · {payment.mode}{payment.reference ? ` · réf. ${payment.reference}` : ''}</span>
            <button type="button" className="product-button product-button--small" disabled={busyId === payment.id} onClick={() => void confirm(payment.id)}>
              <Check size={16} aria-hidden="true" /> Valider
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}