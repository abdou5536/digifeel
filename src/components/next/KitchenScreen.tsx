'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BellRing, Check, Expand, Flame, LoaderCircle, Utensils, Wifi } from 'lucide-react';
import {
  advanceOrder, getOrders, getRestaurantData, getSelectedRestaurantId, subscribeRestaurantData,
  updateKitchenSettings, type RestaurantAccount, type RestaurantData, type RestaurantOrder
} from '@/src/services/restaurant';
import { ThemePicker } from './ThemePicker';
import { useLanguage } from './LanguageProvider';

function playKitchenAlert() {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 680;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.38);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.4);
    oscillator.onended = () => { void audio.close(); };
  } catch (error) {
    console.warn('Le son de notification cuisine est indisponible.', error);
  }
}

function elapsed(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  return minutes ? `${minutes} min` : 'À l’instant';
}

export function KitchenScreen() {
  const { locale } = useLanguage();
  const [restaurant, setRestaurant] = useState<RestaurantAccount | null>(null);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [data, setData] = useState<RestaurantData | null>(null);
  const [threshold, setThreshold] = useState(12);
  const [loading, setLoading] = useState(true);
  const [busyOrder, setBusyOrder] = useState('');
  const [error, setError] = useState('');
  const knownOrderStatuses = useRef<Map<string, RestaurantOrder['status']> | null>(null);
  const refresh = useCallback(async () => {
    const [nextData, selectedId] = await Promise.all([getRestaurantData(), getSelectedRestaurantId()]);
    const currentRestaurant = nextData.restaurants.find(item => item.id === selectedId) ?? nextData.restaurants[0] ?? null;
    setData(nextData);
    setRestaurant(currentRestaurant);
    if (currentRestaurant) {
      setThreshold(currentRestaurant.kitchenAlertMinutes ?? 12);
      const nextOrders = await getOrders(currentRestaurant.id);
      setOrders(nextOrders);
      if (knownOrderStatuses.current === null) knownOrderStatuses.current = new Map(nextOrders.map(order => [order.id, order.status]));
      else {
        const newlyStarted = nextOrders.some(order => order.status === 'new' && knownOrderStatuses.current?.get(order.id) !== 'new');
        if (newlyStarted) playKitchenAlert();
        knownOrderStatuses.current = new Map(nextOrders.map(order => [order.id, order.status]));
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void refresh().then(() => { if (mounted) setLoading(false); }).catch(refreshError => {
      if (mounted) { setError(refreshError instanceof Error ? refreshError.message : 'Les commandes cuisine ne sont pas disponibles.'); setLoading(false); }
    });
    const unsubscribe = subscribeRestaurantData(() => { void refresh(); });
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { mounted = false; unsubscribe(); window.clearInterval(timer); };
  }, [refresh]);

  const [now, setNow] = useState(Date.now());
  const activeOrders = useMemo(() => orders.filter(order => ['new', 'preparing', 'ready'].includes(order.status)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [orders]);
  const changeStatus = async (order: RestaurantOrder) => {
    setBusyOrder(order.id);
    setError('');
    try {
      await advanceOrder(order.id);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Le statut de la commande n’a pas été modifié.');
    } finally {
      setBusyOrder('');
    }
  };
  const saveThreshold = async (value: number) => {
    setThreshold(value);
    if (!restaurant) return;
    try {
      await updateKitchenSettings(restaurant.id, value);
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : 'Le délai n’a pas été enregistré.');
    }
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (fullscreenError) {
      setError(fullscreenError instanceof Error ? fullscreenError.message : 'Le plein écran n’est pas disponible sur cet appareil.');
    }
  };

  if (loading) return <main className="workspace-loading"><LoaderCircle className="guest-spinner" /><p>Écran cuisine…</p></main>;
  if (!restaurant || !data) return <main className="workspace-loading" role="alert"><p>{error || 'Aucun restaurant sélectionné.'}</p><Link href="/app">Retour à l’espace restaurant</Link></main>;

  return <main className="restaurant-workspace kitchen-workspace">
    <header className="kitchen-topbar"><Link href="/app" className="workspace-back-link"><ArrowLeft size={17} />Espace restaurant</Link><div><span className="workspace-eyebrow">CUISINE · {restaurant.name}</span><h1>Commandes en cours</h1></div><div className="kitchen-top-actions"><ThemePicker locale={locale} compact /><label>Délai d’alerte<select value={threshold} onChange={event => void saveThreshold(Number(event.target.value))}>{[8, 10, 12, 15, 20, 25].map(minutes => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label><span><Wifi />En direct</span><button type="button" onClick={() => void toggleFullscreen()} aria-label="Plein écran"><Expand /></button></div></header>
    {error && <p className="workspace-message is-error" role="alert">{error}</p>}
    <section className="kitchen-content">
      <div className="kitchen-column">
        <header><h2><BellRing />À lancer <span>{activeOrders.filter(order => order.status === 'new').length}</span></h2></header>
        {activeOrders.filter(order => order.status === 'new').length === 0 && <p className="kitchen-empty">Aucune nouvelle commande.</p>}
        {activeOrders.filter(order => order.status === 'new').map(order => <KitchenOrderCard key={order.id} order={order} data={data} now={now} threshold={threshold} busy={busyOrder === order.id} onAdvance={() => void changeStatus(order)} actionLabel="Démarrer la préparation" />)}
      </div>
      <div className="kitchen-column">
        <header><h2><Utensils />En préparation <span>{activeOrders.filter(order => order.status === 'preparing').length}</span></h2></header>
        {activeOrders.filter(order => order.status === 'preparing').length === 0 && <p className="kitchen-empty">Rien en cours de préparation.</p>}
        {activeOrders.filter(order => order.status === 'preparing').map(order => <KitchenOrderCard key={order.id} order={order} data={data} now={now} threshold={threshold} busy={busyOrder === order.id} onAdvance={() => void changeStatus(order)} actionLabel="Marquer prête" />)}
      </div>
      <div className="kitchen-column kitchen-ready-column">
        <header><h2><Check />Prêtes à servir <span>{activeOrders.filter(order => order.status === 'ready').length}</span></h2></header>
        {activeOrders.filter(order => order.status === 'ready').length === 0 && <p className="kitchen-empty">Aucune commande prête.</p>}
        {activeOrders.filter(order => order.status === 'ready').map(order => <KitchenOrderCard key={order.id} order={order} data={data} now={now} threshold={threshold} busy={busyOrder === order.id} onAdvance={() => void changeStatus(order)} actionLabel="Marquer servie" />)}
      </div>
    </section>
    <footer className="kitchen-footer"><span><Flame />Les commandes en retard sont signalées après {threshold} minutes.</span><span>{activeOrders.length} commande(s) active(s)</span></footer>
  </main>;
}

function KitchenOrderCard({ order, data, now, threshold, busy, onAdvance, actionLabel }: {
  order: RestaurantOrder; data: RestaurantData; now: number; threshold: number; busy: boolean; onAdvance: () => void; actionLabel: string;
}) {
  const age = Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000));
  const late = order.status !== 'ready' && age >= threshold;
  const table = data.tables.find(item => item.id === order.tableId);
  const waiter = data.users.find(item => item.id === order.waiterId);
  return <article className={`kitchen-order-card ${late ? 'is-late' : ''} ${order.status === 'ready' ? 'is-ready' : ''}`}>
    <header><span><strong>{table?.name ?? 'Table'}</strong><small>{table?.zone ?? ''}</small></span><time>{elapsed(order.createdAt)}</time></header>
    {waiter && <span className="kitchen-order-waiter">Serveur · {waiter.name}</span>}
    <ul>{order.lines.map((line, index) => <li key={`${line.itemId}-${index}`}><span><strong>{line.quantity}×</strong> {line.name}</span>{line.note && <em>{line.note}</em>}</li>)}</ul>
    {order.customerNote && <p className="kitchen-customer-note">{order.customerNote}</p>}
    {late && <p className="kitchen-late-warning"><Flame size={15} />Délai dépassé · priorité</p>}
    <button type="button" onClick={onAdvance} disabled={busy}>{busy ? <LoaderCircle className="guest-spinner" /> : order.status === 'ready' ? <Check /> : <Utensils />}{actionLabel}</button>
  </article>;
}
