'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3 } from 'lucide-react';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';
import {
  confirmPendingPayment, getRestaurantData, getSelectedRestaurantId, subscribeRestaurantData,
  type Payment, type RestaurantData
} from '@/src/services/restaurant';

type LivePayment = {
  id: string;
  amount_dzd: number;
  tip_dzd: number;
  method: 'cash' | 'baridimob';
  created_at: string;
  bills: { table_label: string } | null;
};

/** Paiements déclarés par les clients depuis la page de table, en attente de validation en caisse. */
export function PendingGuestPayments() {
  const [data, setData] = useState<RestaurantData | null>(null);
  const [restaurantId, setRestaurantId] = useState('');
  const [livePayments, setLivePayments] = useState<LivePayment[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        const response = await fetch('/api/pos/guest-payments', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Impossible de charger les paiements en attente.');
        setLivePayments(result.payments as LivePayment[]);
      } else {
        const [next, selected] = await Promise.all([getRestaurantData(), getSelectedRestaurantId()]);
        setData(next);
        setRestaurantId(selected);
      }
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les paiements en attente.');
    }
  }, []);

  useEffect(() => {
    void load();
    if (isSupabaseConfigured) return;
    return subscribeRestaurantData(() => { void load(); });
  }, [load]);

  const pending: Payment[] = data?.payments.filter(p => p.status === 'pending' && p.restaurantId === restaurantId) ?? [];
  const entries = isSupabaseConfigured
    ? (livePayments ?? []).map(payment => ({
        id: payment.id,
        description: `Table ${payment.bills?.table_label ?? '—'} · ${payment.method === 'baridimob' ? 'BaridiMob' : 'Espèces'}`,
        amount: payment.amount_dzd,
        createdAt: payment.created_at
      }))
    : pending.map(payment => ({
        id: payment.id,
        description: payment.mode + (payment.reference ? ` · réf. ${payment.reference}` : ''),
        amount: payment.amount,
        createdAt: payment.createdAt
      }));

  async function confirm(paymentId: string) {
    setBusyId(paymentId);
    try {
      if (isSupabaseConfigured) {
        const response = await fetch(`/api/pos/guest-payments/${encodeURIComponent(paymentId)}/confirm`, { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Validation impossible.');
      } else {
        await confirmPendingPayment(paymentId);
      }
      await load();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Validation impossible.');
    } finally {
      setBusyId('');
    }
  }

  const loading = isSupabaseConfigured ? livePayments === null && !error : data === null && !error;
  if (loading) return <p role="status" style={{ padding: '1rem' }}>Chargement des paiements…</p>;

  return (
    <section className="workspace-panel" aria-labelledby="pending-payments-title" style={{ margin: '1.5rem auto', maxWidth: 720, padding: '1.25rem' }}>
      <h2 id="pending-payments-title"><Clock3 size={18} aria-hidden="true" /> Paiements clients à valider ({entries.length})</h2>
      {error && <p role="alert">{error}</p>}
      {entries.length === 0 && !error && <p>Aucun paiement en attente de validation.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '.5rem' }}>
        {entries.map(payment => (
          <li key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span>{payment.description} · {payment.amount.toLocaleString('fr-FR')} DZD{payment.createdAt ? ` · ${new Date(payment.createdAt).toLocaleString('fr-FR')}` : ''}</span>
            <button type="button" className="product-button product-button--small" disabled={busyId === payment.id} onClick={() => void confirm(payment.id)}>
              <Check size={16} aria-hidden="true" /> Valider après vérification
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
