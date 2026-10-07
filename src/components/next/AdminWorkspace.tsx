'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Radio } from 'lucide-react';
import { QRCodeDownloads } from './QRCodeDownloads';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';

interface AdminChip {
  id: string;
  table_number: number | null;
  status: 'active' | 'inactive' | 'disabled';
  created_at: string;
}

interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  chips: AdminChip[];
  subscriptions: Array<{ status: string; trial_ends_at: string }> | null;
}

interface GeneratedChip {
  chip_id: string;
  activation_code: string;
}

export function AdminWorkspace() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [batches, setBatches] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [generated, setGenerated] = useState<GeneratedChip[]>([]);
  const [name, setName] = useState('');
  const [count, setCount] = useState(10);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyChipId, setBusyChipId] = useState('');
  const [busyRestaurantId, setBusyRestaurantId] = useState('');
  const [impersonatingId, setImpersonatingId] = useState('');
  const [newResto, setNewResto] = useState({ name: '', slug: '', googleReviewUrl: '', logoUrl: '', ownerEmail: '', ownerPassword: '', tables: 10 });
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!isSupabaseConfigured) {
      setMessage('Configurez Supabase dans .env pour ouvrir l’administration.');
      setLoading(false);
      return () => { alive = false; };
    }
    const loadAdmin = async () => {
      try {
        const { data: sessionData, error: sessionError } = await createSupabaseBrowserClient().auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) throw new Error('Connectez-vous pour ouvrir l’administration.');
        const response = await fetch('/api/admin/overview');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'L’administration ne peut pas être chargée.');
        if (alive) {
          setRestaurants(result.restaurants);
          setBatches(result.batches);
        }
      } catch (loadError) {
        if (alive) setMessage(loadError instanceof Error ? loadError.message : 'Erreur de chargement.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    void loadAdmin();
    return () => { alive = false; };
  }, [reloadKey]);

  const createRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(newResto)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le restaurant n’a pas pu être créé.');
      setNewResto({ name: '', slug: '', googleReviewUrl: '', logoUrl: '', ownerEmail: '', ownerPassword: '', tables: 10 });
      setMessage('Restaurant créé. Transmettez-lui son e-mail et son mot de passe de connexion.');
      setReloadKey(key => key + 1);
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : 'Le restaurant n’a pas pu être créé.');
    } finally {
      setCreating(false);
    }
  };

  const patchRestaurant = async (restaurantId: string, payload: { active: boolean } | { addTables: number }) => {
    setBusyRestaurantId(restaurantId);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/restaurants/${encodeURIComponent(restaurantId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'La modification a échoué.');
      setReloadKey(key => key + 1);
    } catch (patchError) {
      setMessage(patchError instanceof Error ? patchError.message : 'La modification a échoué.');
    } finally {
      setBusyRestaurantId('');
    }
  };

  const impersonate = async (restaurant: AdminRestaurant) => {
    if (!window.confirm(`Entrer dans « ${restaurant.name} » va remplacer votre session actuelle par celle du restaurateur, dans ce navigateur. Continuer ?`)) return;
    setImpersonatingId(restaurant.id);
    setMessage('');
    try {
      const { data: sessionData } = await createSupabaseBrowserClient().auth.getSession();
      if (sessionData.session) {
        sessionStorage.setItem('digifeel_admin_return', JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          restaurantName: restaurant.name
        }));
      }
      const response = await fetch(`/api/admin/restaurants/${encodeURIComponent(restaurant.id)}/impersonate`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'La connexion au restaurant a échoué.');
      window.location.href = result.url;
    } catch (impersonateError) {
      sessionStorage.removeItem('digifeel_admin_return');
      setMessage(impersonateError instanceof Error ? impersonateError.message : 'La connexion au restaurant a échoué.');
      setImpersonatingId('');
    }
  };

  const createBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setGenerated([]);
    try {
      const response = await fetch('/api/admin/chip-batches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, count })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le lot n’a pas pu être créé.');
      setGenerated(result.chips);
      setBatches(current => [{ id: crypto.randomUUID(), name: result.name, created_at: new Date().toISOString() }, ...current]);
      setName('');
      setMessage('Lot créé. Copiez les codes d’activation maintenant : ils ne seront plus affichés.');
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'Le lot n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  };

  const copyBatch = async () => {
    try {
      await navigator.clipboard.writeText(generated.map(chip => `${chip.chip_id}\t${chip.activation_code}\t${window.location.origin}/r/${chip.chip_id}`).join('\n'));
      setMessage('Identifiants du lot copiés.');
    } catch {
      setMessage('La copie est indisponible. Sélectionnez les codes affichés.');
    }
  };

  const toggleChip = async (chip: AdminChip) => {
    setBusyChipId(chip.id);
    setMessage('');
    try {
      const status = chip.status === 'disabled' ? 'active' : 'disabled';
      const response = await fetch(`/api/admin/chips/${encodeURIComponent(chip.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le statut de la puce n’a pas changé.');
      setRestaurants(current => current.map(restaurant => ({
        ...restaurant,
        chips: restaurant.chips.map(item => item.id === chip.id ? { ...item, status: result.status } : item)
      })));
    } catch (toggleError) {
      setMessage(toggleError instanceof Error ? toggleError.message : 'Le statut de la puce n’a pas changé.');
    } finally {
      setBusyChipId('');
    }
  };

  return (
    <main className="next-page-wrap">
      <div className="next-dashboard-toolbar">
        <div><Link className="next-link" href="/"><ArrowLeft aria-hidden="true" /> Digifeel</Link><h1 className="next-page-heading next-dashboard-title">Administration</h1><p className="next-muted">Restaurants, puces, lots et abonnements.</p></div>
        <span className="next-kicker">SUPER-ADMIN</span>
      </div>
      {loading && <p className="next-muted" role="status">Chargement des restaurants…</p>}
      {message && <p className="next-banner" role="status">{message} {message.includes('Connectez-vous') && <Link className="next-link" href="/login?next=/admin">Se connecter</Link>}</p>}
      <div className="next-admin-layout">
        <section className="next-glass-card next-surface-card">
          <h2><Radio aria-hidden="true" /> Générer un lot de puces</h2>
          <p className="next-muted">Les codes ne sont affichés qu’une seule fois. Conservez-les avec les puces correspondantes.</p>
          <form className="next-form" onSubmit={createBatch}>
            <label>Nom du lot<input required minLength={1} maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Lot printemps 2026" /></label>
            <label>Nombre de puces<input type="number" min={1} max={100} value={count} onChange={event => setCount(Number(event.target.value))} /></label>
            <button className="product-button" type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer le lot'}</button>
          </form>
          {generated.length > 0 && <div className="next-code-list">
            <button className="product-button product-button--secondary" type="button" onClick={copyBatch}><Copy aria-hidden="true" /> Copier les codes et liens</button>
            {generated.map(chip => <div className="next-code-row" key={chip.chip_id}><code>{chip.chip_id}</code><code>{chip.activation_code}</code><Link className="next-link" href={`/activate/${chip.chip_id}`}>Activation</Link><Link className="next-link" href={`/r/${chip.chip_id}`}>Lien de scan</Link><QRCodeDownloads chipId={chip.chip_id} /></div>)}
          </div>}
        </section>
        <section className="next-glass-card next-surface-card">
          <h2>Lots récents</h2>
          {batches.length ? batches.map(batch => <p className="next-server-row" key={batch.id}>{batch.name}<span>{new Date(batch.created_at).toLocaleDateString('fr-FR')}</span></p>) : <p className="next-muted">Aucun lot de puces.</p>}
        </section>
      </div>
      <section className="next-glass-card next-surface-card">
        <h2>Créer un restaurant</h2>
        <p className="next-muted">Crée la fiche, le compte du restaurateur et une puce/QR par table. Lien de scan : /r/identifiant/t/numéro.</p>
        <form className="next-form next-form-grid" onSubmit={createRestaurant}>
          <label>Nom du restaurant<input required minLength={2} maxLength={120} value={newResto.name} onChange={event => setNewResto({ ...newResto, name: event.target.value })} placeholder="Chez Marcel" /></label>
          <label>Identifiant d’URL (facultatif)<input maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={newResto.slug} onChange={event => setNewResto({ ...newResto, slug: event.target.value.toLowerCase() })} placeholder="chez-marcel" /></label>
          <label>Lien d’avis Google<input type="url" value={newResto.googleReviewUrl} onChange={event => setNewResto({ ...newResto, googleReviewUrl: event.target.value })} placeholder="https://g.page/r/…/review" /></label>
          <label>Logo (adresse https://)<input type="url" value={newResto.logoUrl} onChange={event => setNewResto({ ...newResto, logoUrl: event.target.value })} /></label>
          <label>E-mail du restaurateur<input required type="email" autoComplete="off" value={newResto.ownerEmail} onChange={event => setNewResto({ ...newResto, ownerEmail: event.target.value })} /></label>
          <label>Mot de passe initial (10 caractères min.)<input required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={newResto.ownerPassword} onChange={event => setNewResto({ ...newResto, ownerPassword: event.target.value })} /></label>
          <label>Nombre de tables<input type="number" min={0} max={200} value={newResto.tables} onChange={event => setNewResto({ ...newResto, tables: Number(event.target.value) })} /></label>
          <button className="product-button" type="submit" disabled={creating}>{creating ? 'Création…' : 'Créer le restaurant'}</button>
        </form>
      </section>
      <section className="next-glass-card next-surface-card next-admin-restaurants">
        <h2>Restaurants et puces</h2>
        {restaurants.length === 0 ? <p className="next-muted">Aucun restaurant activé.</p> : <div className="next-restaurant-list">
          {restaurants.map(restaurant => {
            const subscription = restaurant.subscriptions?.[0];
            return <article className="next-restaurant-row" key={restaurant.id}>
              <div><h3>{restaurant.name}{!restaurant.active && <span className="next-chip-status next-chip-status--disabled">désactivé</span>}</h3><p className="next-muted">/{restaurant.slug} · créé le {new Date(restaurant.created_at).toLocaleDateString('fr-FR')}</p></div>
              <span>Abonnement : {subscription?.status ?? 'non défini'}</span>
              <span>{restaurant.chips?.length ?? 0} puce(s)</span>
              <button className="product-button product-button--secondary" type="button" disabled={impersonatingId === restaurant.id} onClick={() => void impersonate(restaurant)}>{impersonatingId === restaurant.id ? 'Connexion…' : 'Entrer dans ce restaurant'}</button>
              <div className="next-chip-list">{restaurant.chips?.map(chip => <span key={chip.id} className={`next-chip-status next-chip-status--${chip.status}`}>{chip.id.slice(0, 8)} · {chip.status}{chip.status === 'active' && <Link href={`/r/${chip.id}`}>Ouvrir</Link>}<button type="button" disabled={busyChipId === chip.id} onClick={() => void toggleChip(chip)}>{busyChipId === chip.id ? '…' : chip.status === 'disabled' ? 'Réactiver' : 'Désactiver'}</button></span>)}</div>
            </article>;
          })}
        </div>}
      </section>
    </main>
  );
}
