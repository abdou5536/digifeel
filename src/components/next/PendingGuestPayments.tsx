'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3 } from 'lucide-react';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';
import { formatMoney, normalizeCurrency, type PosCurrency } from '@/src/lib/pos/currency';
import {
  confirmPendingPayment, getRestaurantData, getSelectedRestaurantId, subscribeRestaurantData,
  type Payment, type RestaurantData
} from '@/src/services/restaurant';

type LivePayment = {
  id: string;
  bill_id: string;
  amount_dzd: number;
  tip_dzd: number;
  method: 'cash' | 'baridimob' | 'card';
  created_at: string;
  bills: { id: string; table_label: string; status: string } | null;
};

/** Paiements déclarés par les clients depuis la page de table, en attente de validation en caisse. */
export function PendingGuestPayments() {
  const [data, setData] = useState<RestaurantData | null>(null);
  const [restaurantId, setRestaurantId] = useState('');
  const [livePayments, setLivePayments] = useState<LivePayment[] | null>(null);
  const [currency, setCurrency] = useState<PosCurrency>('DZD');
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        const { data: sessionData } = await createSupabaseBrowserClient().auth.getSession();
        if (!sessionData.session) { setSignedOut(true); return; }
        const response = await fetch('/api/pos/guest-payments', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Impossible de charger les paiements en attente.');
        setLivePayments(result.payments as LivePayment[]);
        setCurrency(normalizeCurrency(result.currency));
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

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void load();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const pending: Payment[] = data?.payments.filter(p => p.status === 'pending' && p.restaurantId === restaurantId) ?? [];
  const entries = isSupabaseConfigured
    ? (livePayments ?? []).map(payment => ({
        id: payment.id,
        billId: payment.bill_id,
        method: payment.method,
        description: `Table ${payment.bills?.table_label ?? '—'} · ${payment.method === 'card' ? 'Carte' : payment.method === 'baridimob' ? 'BaridiMob' : 'Espèces'}${payment.bills?.status === 'paid' ? ' · addition réglée' : ''}`,
        amount: payment.amount_dzd + payment.tip_dzd,
        createdAt: payment.created_at
      }))
    : pending.map(payment => ({
        id: payment.id,
        billId: '',
        method: 'manual' as const,
        description: payment.mode + (payment.reference ? ` · réf. ${payment.reference}` : ''),
        amount: payment.amount,
        createdAt: payment.createdAt
      }));

  async function handlePayment(payment: (typeof entries)[number], action: 'confirm' | 'cancel' = 'confirm') {
    if (action === 'cancel' && !window.confirm('Annuler ce paiement carte uniquement si le terminal confirme son refus ?')) return;
    setBusyId(payment.id);
    try {
      if (isSupabaseConfigured) {
        const endpoint = payment.method === 'card'
          ? `/api/pos/bills/${encodeURIComponent(payment.billId)}/payments/${encodeURIComponent(payment.id)}/${action}`
          : `/api/pos/guest-payments/${encodeURIComponent(payment.id)}/confirm`;
        const response = await fetch(endpoint, { method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Validation impossible.');
      } else {
        await confirmPendingPayment(payment.id);
      }
      await load();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Validation impossible.');
    } finally {
      setBusyId('');
    }
  }

  const loading = isSupabaseConfigured ? livePayments === null && !error : data === null && !error;
  const formatAmount = (amount: number) => isSupabaseConfigured ? formatMoney(amount, currency, 'fr-FR') : `${amount.toLocaleString('fr-FR')} DZD`;
  if (signedOut) return null;
  if (loading) return <p role="status" style={{ padding: '1rem' }}>Chargement des paiements…</p>;

  return (
    <section className="workspace-panel" aria-labelledby="pending-payments-title" style={{ margin: '1.5rem auto', maxWidth: 720, padding: '1.25rem' }}>
      <h2 id="pending-payments-title"><Clock3 size={18} aria-hidden="true" /> Paiements en attente de validation ({entries.length})</h2>
      {error && <p role="alert">{error}</p>}
      {entries.length === 0 && !error && <p>Aucun paiement en attente de validation.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '.5rem' }}>
        {entries.map(payment => (
          <li key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span>{payment.description} · {formatAmount(payment.amount)}{payment.createdAt ? ` · ${new Date(payment.createdAt).toLocaleString('fr-FR')}` : ''}</span>
            <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '.4rem' }}>
              <button type="button" className="product-button product-button--small" disabled={busyId === payment.id} onClick={() => void handlePayment(payment)}>
                <Check size={16} aria-hidden="true" />{payment.method === 'card' ? 'Confirmer après vérification du terminal' : 'Valider après vérification'}
              </button>
              {payment.method === 'card' && <button type="button" className="product-button product-button--small" disabled={busyId === payment.id} onClick={() => void handlePayment(payment, 'cancel')}>
                Annuler si refusé par le terminal
              </button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
