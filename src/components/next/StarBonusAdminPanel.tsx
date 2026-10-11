'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BadgeEuro, Star } from 'lucide-react';

type Restaurant = { id: string; name: string };
type Rating = { restaurant_id: string; kind: 'baseline' | 'snapshot'; rating: number; observed_at: string };
type Billed = { restaurant_id: string; tier_id: string; period: string; amount_cents: number; billed_at: string };
type Data = { restaurants: Restaurant[]; ratings: Rating[]; billed: Billed[] };

const euro = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

function lastClosedMonth() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function StarBonusAdminPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [restaurantId, setRestaurantId] = useState('');
  const [kind, setKind] = useState<'baseline' | 'snapshot'>('snapshot');
  const [rating, setRating] = useState('');
  const [period, setPeriod] = useState(lastClosedMonth());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/star-bonus', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
      setRestaurantId(current => current || payload.restaurants[0]?.id || '');
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Chargement impossible.' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const send = async (body: Record<string, unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/star-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, ...body })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Opération refusée.');
      setMessage({ ok: true, text: success });
      await load();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Opération refusée.' });
    } finally {
      setBusy(false);
    }
  };

  const saveRating = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(rating.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0 || value > 5) {
      setMessage({ ok: false, text: 'La note doit être comprise entre 0 et 5.' });
      return;
    }
    void send({ action: kind, rating: value }, kind === 'baseline' ? 'Note de départ enregistrée.' : 'Relevé enregistré.').then(() => setRating(''));
  };

  const invoice = (event: FormEvent) => {
    event.preventDefault();
    void send({ action: 'invoice', period }, 'Palier facturé.');
  };

  const name = (id: string) => data?.restaurants.find(item => item.id === id)?.name ?? '—';
  const ratings = (data?.ratings ?? []).filter(item => item.restaurant_id === restaurantId).slice(0, 8);

  return (
    <section className="workspace-grid-two">
      <article className="workspace-panel workspace-admin-form">
        <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Notes Google</span><h3>Note de départ et relevés</h3></div><Star /></div>
        <label>Restaurant
          <select value={restaurantId} onChange={event => setRestaurantId(event.target.value)}>
            {data?.restaurants.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <form onSubmit={saveRating} className="workspace-admin-form">
          <label>Type
            <select value={kind} onChange={event => setKind(event.target.value as 'baseline' | 'snapshot')}>
              <option value="baseline">Note de départ</option>
              <option value="snapshot">Relevé du mois</option>
            </select>
          </label>
          <label>Note Google (0 à 5)<input inputMode="decimal" required value={rating} onChange={event => setRating(event.target.value)} placeholder="4,3" /></label>
          <button type="submit" className="workspace-primary-button" disabled={busy || !restaurantId}>Enregistrer</button>
        </form>
        <ul className="workspace-muted">
          {ratings.map(item => <li key={`${item.kind}-${item.observed_at}`}>{day(item.observed_at)} · {item.kind === 'baseline' ? 'départ' : 'relevé'} · {Number(item.rating).toFixed(1)} ★</li>)}
        </ul>
      </article>

      <article className="workspace-panel workspace-admin-form">
        <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Facturation</span><h3>Palier du mois</h3></div><BadgeEuro /></div>
        <form onSubmit={invoice} className="workspace-admin-form">
          <label>Mois clôturé<input type="month" required value={period} max={lastClosedMonth()} onChange={event => setPeriod(event.target.value)} /></label>
          <button type="submit" className="workspace-primary-button" disabled={busy || !restaurantId}>Calculer et facturer</button>
        </form>
        {message && <p role="status" className={message.ok ? 'workspace-muted' : 'workspace-error'}>{message.text}</p>}
        <h4>Historique</h4>
        <ul className="workspace-muted">
          {(data?.billed ?? []).map(item => <li key={`${item.restaurant_id}-${item.tier_id}`}>{item.period} · {name(item.restaurant_id)} · {euro(item.amount_cents)}</li>)}
          {data && data.billed.length === 0 && <li>Aucune facturation.</li>}
        </ul>
      </article>
    </section>
  );
}
