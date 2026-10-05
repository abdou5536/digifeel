import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import { INSTALLATION_PACKS } from '../config/product';
import { ScanTargetManager } from './ScanTargetManager';

type AdminRestaurant = {
  id: string; slug: string; name: string; status: 'active' | 'disabled'; owner_name: string; email: string;
  city: string; address: string; google_review_url: string | null; installation_pack: string; installation_price_euros: number;
  installation_payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';
  target_count: number; scan_count: number; pending_proofs: number;
};
type Proof = {
  id: string; reference: string; transaction_id: string; amount_minor: number; currency: string; description: string;
  restaurant_id: string; restaurant_name: string; restaurant_email: string;
};
const getError = async (response: Response) => {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error || `La requête a échoué (${response.status}).`;
};

const LiveAdminWorkspace: React.FC = () => {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurant | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<AdminRestaurant | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGoogleUrl, setEditGoogleUrl] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [slug, setSlug] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [pack, setPack] = useState<string>(INSTALLATION_PACKS[0].id);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [restaurantResponse, proofResponse] = await Promise.all([
        fetch('/api/admin/restaurants', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/admin/payment-proofs', { credentials: 'same-origin', cache: 'no-store' })
      ]);
      if (!restaurantResponse.ok) throw new Error(await getError(restaurantResponse));
      if (!proofResponse.ok) throw new Error(await getError(proofResponse));
      const [restaurantData, proofData] = await Promise.all([
        restaurantResponse.json() as Promise<{ restaurants: AdminRestaurant[] }>,
        proofResponse.json() as Promise<{ proofs: Proof[] }>
      ]);
      setRestaurants(restaurantData.restaurants);
      setProofs(proofData.proofs);
      setSelectedRestaurant(current => current ? restaurantData.restaurants.find(item => item.id === current.id) || null : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Les données administrateur ne sont pas disponibles.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const updateRestaurant = async (restaurant: AdminRestaurant, updates: Record<string, string>) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/restaurants/${encodeURIComponent(restaurant.id)}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error(await getError(response));
      setMessage(`Statut de ${restaurant.name} mis à jour.`);
      await refresh();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'La mise à jour a échoué.'); }
    finally { setBusy(false); }
  };

  const createRestaurant = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); setInvitationUrl('');
    const normalizedSlug = slug.trim().toLowerCase() || name.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const response = await fetch('/api/admin/restaurants', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ownerName, email, city, address, slug: normalizedSlug, googleReviewUrl: googleUrl, installationPack: pack, tableCount: 12 })
      });
      if (!response.ok) throw new Error(await getError(response));
      const result = await response.json() as { invitationUrl?: string };
      setInvitationUrl(result.invitationUrl || '');
      setMessage('Restaurant créé. Son accès restaurateur est prêt.');
      setName(''); setOwnerName(''); setEmail(''); setCity(''); setAddress(''); setSlug(''); setGoogleUrl('');
      await refresh();
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Le restaurant n’a pas pu être créé.'); }
    finally { setBusy(false); }
  };

  const decideProof = async (proof: Proof, decision: 'approve' | 'reject') => {
    const reason = rejectionReasons[proof.id] || '';
    if (decision === 'reject' && !reason.trim()) {
      setError('Indiquez le motif du refus avant de traiter la preuve.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/payment-proofs/${encodeURIComponent(proof.id)}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, reason })
      });
      if (!response.ok) throw new Error(await getError(response));
      setMessage(decision === 'approve' ? 'Paiement validé.' : 'Preuve refusée.');
      await refresh();
    } catch (decisionError) { setError(decisionError instanceof Error ? decisionError.message : 'La preuve n’a pas pu être traitée.'); }
    finally { setBusy(false); }
  };

  const copyInvitation = async () => {
    try { await navigator.clipboard.writeText(invitationUrl); setMessage('Lien d’invitation copié.'); }
    catch (copyError) { console.error('La copie du lien d’invitation a échoué.', copyError); setError('Impossible de copier le lien. Sélectionnez-le manuellement.'); }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-slate-100 sm:px-6" aria-labelledby="live-admin-title">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
        <div><p className="flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck size={18} /> Administration connectée</p><h1 id="live-admin-title" className="mt-2 text-3xl font-bold">Restaurants et paiements</h1></div>
        <button className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-3" type="button" onClick={() => void refresh()}><RefreshCw size={16} /> Actualiser</button>
      </header>
      {(error || message) && <p className={`rounded-xl border p-4 ${error ? 'border-red-400/40 bg-red-950/40 text-red-100' : 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100'}`} role={error ? 'alert' : 'status'}>{error || message}</p>}

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="text-xl font-semibold">Ajouter un restaurant</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => void createRestaurant(event)}>
          <input className="min-h-11 rounded-lg bg-slate-800 p-3" placeholder="Nom du restaurant" required maxLength={120} value={name} onChange={event => setName(event.target.value)} />
          <input className="min-h-11 rounded-lg bg-slate-800 p-3" placeholder="Nom du restaurateur" required maxLength={120} value={ownerName} onChange={event => setOwnerName(event.target.value)} />
          <input className="min-h-11 rounded-lg bg-slate-800 p-3" type="email" placeholder="E-mail du restaurateur" required value={email} onChange={event => setEmail(event.target.value)} />
          <input className="min-h-11 rounded-lg bg-slate-800 p-3" placeholder="Ville" required maxLength={120} value={city} onChange={event => setCity(event.target.value)} />
          <input className="min-h-11 rounded-lg bg-slate-800 p-3" placeholder="Adresse (facultative)" maxLength={200} value={address} onChange={event => setAddress(event.target.value)} />
          <input className="min-h-11 rounded-lg bg-slate-800 p-3" placeholder="Identifiant du lien (facultatif)" maxLength={80} value={slug} onChange={event => setSlug(event.target.value)} />
          <input className="min-h-11 rounded-lg bg-slate-800 p-3 sm:col-span-2" type="url" placeholder="Lien d’avis Google (facultatif au départ)" value={googleUrl} onChange={event => setGoogleUrl(event.target.value)} />
          <select className="min-h-11 rounded-lg bg-slate-800 p-3" value={pack} onChange={event => setPack(event.target.value)}>{INSTALLATION_PACKS.map(item => <option key={item.id} value={item.id}>{item.name} — {item.priceEuros} €</option>)}</select>
          <button className="min-h-11 rounded-xl bg-amber-500 px-4 font-bold text-slate-950" type="submit" disabled={busy}>Créer et inviter le restaurateur</button>
        </form>
        {invitationUrl && <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-950/30 p-4"><p className="font-semibold">Lien d’invitation (e-mail non configuré)</p><div className="mt-2 flex flex-wrap gap-2"><input className="min-h-11 min-w-0 flex-1 rounded-lg bg-slate-950 p-3" readOnly value={invitationUrl} /><button className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-3" type="button" onClick={() => void copyInvitation()}><Copy size={16} /> Copier</button></div></div>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="text-xl font-semibold">Restaurants ({restaurants.length})</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {restaurants.map(item => (
            <li className="py-4" key={item.id}>
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div><h3 className="font-semibold">{item.name} · {item.city}</h3><p className="text-sm text-slate-300">{item.owner_name} · {item.email}</p><p className="mt-1 text-sm text-slate-400">{item.scan_count} scans · {item.target_count} liens · Pack {item.installation_price_euros} € · Paiement {item.installation_payment_status} · Abonnement {item.subscription_status}</p></div>
                <div className="flex flex-wrap gap-2">
                  <button className="min-h-11 rounded-lg border border-white/20 px-3" type="button" onClick={() => setSelectedRestaurant(current => current?.id === item.id ? null : item)}>{selectedRestaurant?.id === item.id ? 'Masquer les liens' : 'Gérer NFC / QR'}</button>
                  <button className="min-h-11 rounded-lg border border-white/20 px-3" type="button" onClick={() => {
                    setEditingRestaurant(current => current?.id === item.id ? null : item);
                    setEditName(item.name); setEditEmail(item.email); setEditCity(item.city);
                    setEditAddress(item.address); setEditGoogleUrl(item.google_review_url || '');
                  }}>{editingRestaurant?.id === item.id ? 'Fermer la modification' : 'Modifier'}</button>
                  <button className="min-h-11 rounded-lg border border-white/20 px-3" type="button" disabled={busy} onClick={() => void updateRestaurant(item, { status: item.status === 'active' ? 'disabled' : 'active' })}>{item.status === 'active' ? 'Désactiver' : 'Réactiver'}</button>
                  {item.installation_payment_status !== 'paid' && <button className="min-h-11 rounded-lg border border-white/20 px-3" type="button" disabled={busy} onClick={() => void updateRestaurant(item, { installationPaymentStatus: 'paid' })}>Marquer payé</button>}
                  {item.subscription_status !== 'active' && <button className="min-h-11 rounded-lg border border-white/20 px-3" type="button" disabled={busy} onClick={() => void updateRestaurant(item, { subscriptionStatus: 'active' })}>Activer abonnement</button>}
                </div>
              </div>
              {editingRestaurant?.id === item.id && (
                <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={event => {
                  event.preventDefault();
                  void updateRestaurant(item, { name: editName, email: editEmail, city: editCity, address: editAddress, googleReviewUrl: editGoogleUrl });
                }}>
                  <input aria-label="Nom du restaurant" className="min-h-11 rounded-lg bg-slate-800 p-3" value={editName} maxLength={120} required onChange={event => setEditName(event.target.value)} />
                  <input aria-label="E-mail" className="min-h-11 rounded-lg bg-slate-800 p-3" type="email" value={editEmail} required onChange={event => setEditEmail(event.target.value)} />
                  <input aria-label="Ville" className="min-h-11 rounded-lg bg-slate-800 p-3" value={editCity} maxLength={120} required onChange={event => setEditCity(event.target.value)} />
                  <input aria-label="Adresse" className="min-h-11 rounded-lg bg-slate-800 p-3" value={editAddress} maxLength={200} onChange={event => setEditAddress(event.target.value)} />
                  <input aria-label="Lien Google" className="min-h-11 rounded-lg bg-slate-800 p-3 sm:col-span-2" type="url" value={editGoogleUrl} onChange={event => setEditGoogleUrl(event.target.value)} />
                  <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold sm:col-span-2" disabled={busy}>Enregistrer les modifications</button>
                </form>
              )}
              {selectedRestaurant?.id === item.id && item.google_review_url && <div className="mt-4"><ScanTargetManager restaurantOverride={{ id: item.id, slug: item.slug, name: item.name, googleReviewUrl: item.google_review_url }} /></div>}
              {selectedRestaurant?.id === item.id && !item.google_review_url && <p className="mt-3 text-amber-200">Le restaurateur doit configurer son lien d’avis Google avant la création de puces actives.</p>}
            </li>
          ))}
          {!restaurants.length && <li className="py-4 text-slate-400">Aucun restaurant enregistré.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="text-xl font-semibold">Preuves CCP / Baridimob ({proofs.length})</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {proofs.map(proof => (
            <li className="grid gap-3 py-4 md:grid-cols-[200px_1fr]" key={proof.id}>
              <img className="max-h-64 w-full rounded-lg bg-slate-950 object-contain" src={`/api/admin/payment-proofs/${encodeURIComponent(proof.id)}/image`} alt={`Preuve de paiement de ${proof.restaurant_name}`} />
              <div><h3 className="font-semibold">{proof.restaurant_name} · {(proof.amount_minor / 100).toLocaleString('fr-FR')} {proof.currency.toUpperCase()}</h3><p className="mt-1 text-slate-300">{proof.description} · Référence {proof.reference}</p><p className="mt-1 text-sm text-slate-400">{proof.restaurant_email}</p>
                <label className="mt-3 grid gap-1">Motif de refus<input className="min-h-11 rounded-lg bg-slate-800 p-3" maxLength={500} value={rejectionReasons[proof.id] || ''} onChange={event => setRejectionReasons(current => ({ ...current, [proof.id]: event.target.value }))} /></label>
                <div className="mt-3 flex flex-wrap gap-2"><button className="flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4" disabled={busy} onClick={() => void decideProof(proof, 'approve')}><Check size={16} /> Valider le paiement</button><button className="min-h-11 rounded-lg border border-white/20 px-4" disabled={busy} onClick={() => void decideProof(proof, 'reject')}>Refuser</button></div>
              </div>
            </li>
          ))}
          {!proofs.length && <li className="py-4 text-slate-400">Aucune preuve en attente.</li>}
        </ul>
      </section>
    </main>
  );
};

export default LiveAdminWorkspace;
