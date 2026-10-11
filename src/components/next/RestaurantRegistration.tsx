'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Utensils } from 'lucide-react';
import { createRestaurant, recordResellerPlatformPayment, updateRestaurant, updateRestaurantOwner } from '@/src/services/restaurant';
import { paymentProvider, type PaymentMethod } from '@/src/services/paymentProvider';
import { PRODUCT_PRICING } from '@/src/config/product';

export function RestaurantRegistration() {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [city, setCity] = useState('');
  const [resellerCode, setResellerCode] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [tableCount, setTableCount] = useState(1);
  const [includeNfc, setIncludeNfc] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('simulation');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const installationTotal = tableCount * PRODUCT_PRICING.installationPricePerTableEuros;

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
      const payment = await paymentProvider.charge({
        amount: installationTotal,
        currency: 'EUR',
        method,
        description: `Installation QR · ${tableCount} table(s)`
      });
      const created = await createRestaurant({ name, city, currency: 'EUR', installationAmountEUR: installationTotal, tableCount, resellerCode });
      await recordResellerPlatformPayment({
        restaurantId: created.restaurant.id,
        amountEUR: installationTotal,
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
        ? `Compte créé pour ${tableCount} table(s). Total installation : ${installationTotal} €${includeNfc ? ' · NFC sur devis séparé' : ''} · ${payment.reference}.`
        : `Compte créé pour ${tableCount} table(s). Installation : ${installationTotal} €${includeNfc ? ' · NFC sur devis séparé' : ''} · ${payment.reference}. Premier mois offert.`);
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
      <p>Installation QR à {PRODUCT_PRICING.installationPricePerTableEuros} € par table. Les puces NFC pour les serveurs sont facultatives et chiffrées séparément.</p>
      <label>Nom du restaurant<input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Nom du gérant<input required minLength={2} maxLength={100} value={owner} onChange={event => setOwner(event.target.value)} /></label>
      <label>Ville<input required minLength={2} value={city} onChange={event => setCity(event.target.value)} /></label>
      <label>Code revendeur (facultatif)<input maxLength={40} value={resellerCode} onChange={event => setResellerCode(event.target.value.toUpperCase())} /></label>
      <label>Lien Google Avis (facultatif)<input type="url" placeholder="https://g.page/r/…" value={googleUrl} onChange={event => setGoogleUrl(event.target.value)} /></label>
      <label>Nombre de tables<input type="number" min={1} max={500} required value={tableCount} onChange={event => setTableCount(Math.max(1, Number(event.target.value) || 1))} /></label>
      <p className="next-muted">Total installation : <strong>{installationTotal} €</strong> ({tableCount} × {PRODUCT_PRICING.installationPricePerTableEuros} €). Équivalent dinar indicatif, à confirmer au moment de l’accord.</p>
      <label><input type="checkbox" checked={includeNfc} onChange={event => setIncludeNfc(event.target.checked)} /> Je souhaite aussi des puces NFC pour mes serveurs (devis séparé à négocier)</label>
      <label>Règlement démo<select value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}><option value="simulation">Simulation de carte</option><option value="local_manual">Paiement local à valider</option></select></label>
      <button type="submit" className="guest-primary-button" disabled={busy}>{busy ? <LoaderCircle className="guest-spinner" /> : <Check />}Créer mon compte · {installationTotal} €</button>
      <p className="registration-disclaimer"><CircleAlert size={15} />Paiement simulé uniquement. Aucun encaissement réel. Pas de création de mot de passe ni d’authentification en production dans cette démo.</p>
      {error && <p className="guest-error-message" role="alert"><CircleAlert size={16} />{error}</p>}
      {notice && <div className="registration-success" role="status"><Check /><p>{notice}</p><Link href="/app">Accéder à mon espace</Link></div>}
    </form>
  </main>;
}
