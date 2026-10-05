'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Utensils } from 'lucide-react';
import { createRestaurant, recordResellerPlatformPayment, updateRestaurant, updateRestaurantOwner } from '@/src/services/restaurant';
import { paymentProvider, type PaymentMethod } from '@/src/services/paymentProvider';

export function RestaurantRegistration() {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [city, setCity] = useState('');
  const [resellerCode, setResellerCode] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [currency, setCurrency] = useState<'DZD' | 'EUR'>('DZD');
  const [pack, setPack] = useState(100);
  const [method, setMethod] = useState<PaymentMethod>('simulation');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setResellerCode(new URLSearchParams(window.location.search).get('reseller') ?? '');
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const google = googleUrl.trim();
      if (google) {
        const parsed = new URL(google);
        if (parsed.protocol !== 'https:' || !/google\./i.test(parsed.hostname)) throw new Error('Le lien Avis doit être une adresse Google sécurisée.');
      }
      const payment = await paymentProvider.charge({ amount: pack, currency: 'EUR', method, description: 'Pack installation restaurant' });
      const created = await createRestaurant({ name, city, currency, packPrice: pack, resellerCode });
      await recordResellerPlatformPayment({
        restaurantId: created.restaurant.id,
        amountEUR: pack,
        kind: 'installation',
        reference: payment.reference,
        status: payment.status === 'paid' ? 'validated' : 'pending'
      });
      if (google) {
        const parsed = new URL(google);
        await updateRestaurant(created.restaurant.id, { googleReviewUrl: parsed.toString() });
      }
      await updateRestaurantOwner(created.restaurant.id, owner);
      setNotice(payment.status === 'pending_manual'
        ? `Compte créé. Validation de paiement requise · ${payment.reference}.`
        : `Compte créé. Paiement de démonstration accepté · ${payment.reference}. Premier mois offert.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="guest-shell registration-shell">
    <header className="guest-header"><Link href="/" className="guest-brand"><span className="pos-brand-mark"><Utensils size={18} /></span>DIGIFEEL</Link><Link href="/admin"><ArrowLeft size={16} />Super-admin</Link></header>
    <form className="guest-card registration-card" onSubmit={submit}>
      <span className="guest-kicker"><span className="guest-status-dot" />OUVERTURE DE COMPTE</span>
      <h1>Un compte pour votre restaurant.</h1>
      <p>Un pack d’installation, puis votre premier mois de gestion offert.</p>
      <label>Nom du restaurant<input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Nom du gérant<input required minLength={2} maxLength={100} value={owner} onChange={event => setOwner(event.target.value)} /></label>
      <label>Ville<input required minLength={2} value={city} onChange={event => setCity(event.target.value)} /></label>
      <label>Code revendeur (facultatif)<input maxLength={40} value={resellerCode} onChange={event => setResellerCode(event.target.value.toUpperCase())} /></label>
      <label>Lien Google Avis (facultatif)<input type="url" placeholder="https://g.page/r/…" value={googleUrl} onChange={event => setGoogleUrl(event.target.value)} /></label>
      <div className="guest-registration-row"><label>Devise<select value={currency} onChange={event => setCurrency(event.target.value as 'DZD' | 'EUR')}><option value="DZD">DZD · Algérie</option><option value="EUR">EUR · France</option></select></label><label>Pack<select value={pack} onChange={event => setPack(Number(event.target.value))}><option value={100}>Essentiel · 100 €</option><option value={90}>Équipe · 90 €</option><option value={60}>Complet · 60 €</option></select></label></div>
      <label>Règlement démo<select value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}><option value="simulation">Simulation de carte</option><option value="local_manual">Paiement local à valider</option></select></label>
      <button type="submit" className="guest-primary-button" disabled={busy}>{busy ? <LoaderCircle className="guest-spinner" /> : <Check />}Créer mon compte · {pack} €</button>
      <p className="registration-disclaimer"><CircleAlert size={15} />Paiement simulé uniquement. Aucun encaissement réel. Pas de création de mot de passe ni d’authentification en production dans cette démo.</p>
      {error && <p className="guest-error-message" role="alert"><CircleAlert size={16} />{error}</p>}
      {notice && <div className="registration-success" role="status"><Check /><p>{notice}</p><Link href="/app">Accéder à mon espace</Link></div>}
    </form>
  </main>;
}
