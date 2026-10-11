'use client';

import { useEffect, useRef, useState } from 'react';
import { Banknote, Check, CircleAlert, CreditCard, LoaderCircle, ReceiptText, ShieldCheck } from 'lucide-react';

type Bill = {
  table: string;
  restaurant_name: string;
  baridimob_rip: string | null;
  baridimob_phone: string | null;
  total_dzd: number;
  paid_dzd: number;
  pending_dzd: number;
  discount_dzd: number;
  items: { name: string; quantity: number; unit_price_dzd: number; line_total_dzd: number }[];
};

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; bill: Bill };
type StripeOptions = { available: boolean; mode: 'test' | 'live' | null; eurToDzd: number | null };
type PaymentMethod = 'baridimob' | 'stripe';

const dzd = (value: number) => `${new Intl.NumberFormat('fr-DZ').format(value)} DA`;
const euro = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

async function wait(ms: number) {
  await new Promise(resolve => window.setTimeout(resolve, ms));
}

export function TableBill({ code }: { code: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [stripe, setStripe] = useState<StripeOptions>({ available: false, mode: null, eurToDzd: null });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('baridimob');
  const [token, setToken] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const bill = state.kind === 'ready' ? state.bill : null;
  const balance = bill ? Math.max(0, bill.total_dzd - bill.paid_dzd - bill.pending_dzd) : 0;
  const hasBaridiMob = Boolean(bill?.baridimob_rip || bill?.baridimob_phone);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('payment');
    if (checkoutState === 'success') setNotice('Paiement transmis à Stripe. Vérification de la confirmation…');
    if (checkoutState === 'cancelled') setNotice('Paiement par carte annulé. Vous pouvez choisir un autre mode de règlement.');
    if (checkoutState) window.history.replaceState({}, '', window.location.pathname);

    const loadBill = async () => {
      const sessionResponse = await fetch('/api/public/table-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (!sessionResponse.ok) {
        throw new Error(sessionResponse.status === 404 ? 'Aucune addition ouverte pour cette table.' : 'Service indisponible.');
      }
      const session = await sessionResponse.json() as { token: string };
      if (cancelled) return null;
      setToken(session.token);
      const response = await fetch('/api/public/table-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token }),
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Session expirée. Demandez l’addition au serveur.');
      const result = await response.json() as { bill: Bill };
      if (!cancelled) setState({ kind: 'ready', bill: result.bill });
      return { token: session.token, bill: result.bill };
    };

    void Promise.all([
      loadBill(),
      fetch('/api/public/guest-payments', { cache: 'no-store' })
        .then(async response => {
          if (!response.ok) throw new Error('Configuration Stripe indisponible.');
          const options = await response.json() as { stripeAvailable: boolean; stripeMode: 'test' | 'live' | null; eurToDzd: number | null };
          if (!cancelled) setStripe({ available: options.stripeAvailable, mode: options.stripeMode, eurToDzd: options.eurToDzd });
        })
        .catch(loadError => {
          console.error('Card payment availability could not be loaded.', loadError);
          if (!cancelled) setStripe({ available: false, mode: null, eurToDzd: null });
        })
    ]).then(async ([loadedBill]) => {
      if (cancelled || !loadedBill) return;
      if (checkoutState === 'success') {
        let latest = loadedBill.bill;
        for (let attempt = 0; attempt < 8 && latest.paid_dzd < latest.total_dzd; attempt += 1) {
          await wait(1500);
          if (cancelled) return;
          const response = await fetch('/api/public/table-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: loadedBill.token }),
            cache: 'no-store'
          });
          if (!response.ok) break;
          const result = await response.json() as { bill: Bill };
          latest = result.bill;
          setState({ kind: 'ready', bill: latest });
          if (latest.pending_dzd === 0) break;
        }
        if (!cancelled) {
          setNotice(latest.paid_dzd >= latest.total_dzd
            ? 'Paiement confirmé. Merci et à bientôt !'
            : 'Le paiement est en cours de vérification. Demandez confirmation à l’équipe si le solde ne se met pas à jour.');
        }
      }
    }).catch(loadError => {
      if (!cancelled) setState({ kind: 'error', message: loadError instanceof Error ? loadError.message : 'Erreur.' });
    });

    return () => { cancelled = true; };
  }, [code]);

  const submitPayment = async () => {
    if (!bill || !token || balance <= 0) return;
    if (paymentMethod === 'baridimob' && !hasBaridiMob) {
      setError('Le restaurant n’a pas encore configuré ses coordonnées BaridiMob. Contactez le serveur.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      idempotencyKey.current ??= crypto.randomUUID();
      const response = await fetch('/api/public/guest-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          tableCode: code,
          amountDzd: balance,
          tipDzd: 0,
          method: paymentMethod,
          idempotencyKey: idempotencyKey.current
        })
      });
      const result = await response.json() as { error?: string; checkoutUrl?: string };
      if (!response.ok) {
        if (response.status === 422) idempotencyKey.current = null;
        throw new Error(result.error || 'Le paiement n’a pas pu être lancé.');
      }
      if (paymentMethod === 'stripe') {
        if (!result.checkoutUrl || !result.checkoutUrl.startsWith('https://checkout.stripe.com/')) {
          throw new Error('Lien de paiement Stripe invalide.');
        }
        window.location.assign(result.checkoutUrl);
        return;
      }
      idempotencyKey.current = null;
      setNotice('Demande BaridiMob envoyée. Le paiement sera confirmé par l’équipe après vérification du transfert.');
      const billResponse = await fetch('/api/public/table-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        cache: 'no-store'
      });
      if (!billResponse.ok) throw new Error('Paiement envoyé, mais l’addition n’a pas pu être actualisée.');
      const updated = await billResponse.json() as { bill: Bill };
      setState({ kind: 'ready', bill: updated.bill });
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Le paiement n’a pas pu être lancé.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="table-bill-page">
      <div className="table-bill-shell">
        <header className="table-bill-brand">
          <span className="table-bill-mark"><ReceiptText aria-hidden="true" /></span>
          <span><strong>DigiFeel</strong><small>PAIEMENT SÉCURISÉ</small></span>
          <ShieldCheck className="table-bill-shield" aria-label="Paiement protégé" />
        </header>

        {state.kind === 'loading' && <section className="table-bill-card" role="status"><LoaderCircle className="table-bill-spinner" /> Chargement de votre addition…</section>}
        {state.kind === 'error' && <section className="table-bill-card table-bill-error" role="alert"><CircleAlert aria-hidden="true" />{state.message}</section>}

        {bill && (
          <>
            <section className="table-bill-intro">
              <span className="table-bill-eyebrow">{bill.restaurant_name}</span>
              <h1>Votre addition</h1>
              <p>Table {bill.table} <span aria-hidden="true">·</span> Consultez le détail et choisissez votre mode de paiement.</p>
            </section>

            <section className="table-bill-card table-bill-items" aria-label="Détail de l’addition">
              <div className="table-bill-section-heading"><div><span className="table-bill-eyebrow">RÉCAPITULATIF</span><h2>Votre commande</h2></div><span className="table-bill-count">{bill.items.length} article{bill.items.length === 1 ? '' : 's'}</span></div>
              {bill.items.map((item, index) => (
                <article className="table-bill-item" key={`${item.name}-${index}`}>
                  <span className="table-bill-quantity">{item.quantity}×</span>
                  <span className="table-bill-item-name">{item.name}<small>{dzd(item.unit_price_dzd)} / unité</small></span>
                  <strong>{dzd(item.line_total_dzd)}</strong>
                </article>
              ))}
              {bill.discount_dzd > 0 && <div className="table-bill-total-line"><span>Remise</span><strong>−{dzd(bill.discount_dzd)}</strong></div>}
              <div className="table-bill-total-line"><span>Total</span><strong>{dzd(bill.total_dzd)}</strong></div>
              {bill.paid_dzd > 0 && <div className="table-bill-total-line"><span>Déjà réglé</span><strong>{dzd(bill.paid_dzd)}</strong></div>}
              {bill.pending_dzd > 0 && <div className="table-bill-total-line table-bill-pending"><span>En attente de confirmation</span><strong>{dzd(bill.pending_dzd)}</strong></div>}
              <div className="table-bill-balance"><span>{balance > 0 ? 'Reste à payer' : 'Solde'}</span><strong>{dzd(balance)}</strong></div>
            </section>

            {balance > 0 && (
              <>
                <section className="table-bill-card table-bill-payment" aria-labelledby="payment-heading">
                  <div className="table-bill-section-heading"><div><span className="table-bill-eyebrow">PAIEMENT</span><h2 id="payment-heading">Choisissez votre mode</h2></div></div>
                  <div className="table-bill-methods">
                    <button type="button" className={paymentMethod === 'baridimob' ? 'is-selected' : ''} disabled={!hasBaridiMob} aria-pressed={paymentMethod === 'baridimob'} onClick={() => setPaymentMethod('baridimob')}>
                      <Banknote aria-hidden="true" /><span><strong>BaridiMob</strong><small>{hasBaridiMob ? 'Transfert avec validation du restaurant' : 'Coordonnées non configurées'}</small></span>
                    </button>
                    {stripe.available && <button type="button" className={paymentMethod === 'stripe' ? 'is-selected' : ''} aria-pressed={paymentMethod === 'stripe'} onClick={() => setPaymentMethod('stripe')}>
                      <CreditCard aria-hidden="true" /><span><strong>Carte bancaire · Stripe</strong><small>{stripe.mode === 'test' ? 'Mode test · aucun débit réel' : 'Paiement sécurisé par carte'}</small></span>
                    </button>}
                  </div>

                  {paymentMethod === 'baridimob' && hasBaridiMob && (
                    <div className="table-bill-transfer">
                      <p>Effectuez le transfert dans BaridiMob vers les coordonnées du restaurant, puis envoyez la demande de validation.</p>
                      {bill.baridimob_rip && <div><span>RIP BaridiMob</span><strong>{bill.baridimob_rip}</strong></div>}
                      {bill.baridimob_phone && <div><span>Téléphone</span><strong>{bill.baridimob_phone}</strong></div>}
                      <div><span>Montant exact</span><strong>{dzd(balance)}</strong></div>
                      <small>Ne confirmez qu’après avoir effectué le transfert. L’équipe vérifiera la réception avant de valider l’addition.</small>
                    </div>
                  )}
                  {paymentMethod === 'stripe' && stripe.eurToDzd && (
                    <p className="table-bill-conversion">
                      Débit en euros : environ {euro(Math.round(balance * 100 / stripe.eurToDzd) / 100)} · taux affiché : 1 EUR = {dzd(stripe.eurToDzd)}.
                    </p>
                  )}

                  <button className="table-bill-pay-button" type="button" disabled={busy || (paymentMethod === 'baridimob' && !hasBaridiMob)} onClick={() => void submitPayment()}>
                    {busy ? <LoaderCircle className="table-bill-spinner" aria-hidden="true" /> : paymentMethod === 'stripe' ? <CreditCard aria-hidden="true" /> : <Check aria-hidden="true" />}
                    {busy ? 'Préparation…' : paymentMethod === 'stripe' ? `Payer ${dzd(balance)} par carte` : `J’ai effectué le transfert · ${dzd(balance)}`}
                  </button>
                  {!stripe.available && <p className="table-bill-muted">Paiement par carte indisponible pour le moment. Vous pouvez régler par BaridiMob auprès du restaurant.</p>}
                </section>
              </>
            )}

            {(notice || error) && <p className={`table-bill-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</p>}
            <p className="table-bill-legal">Le paiement BaridiMob reste en attente jusqu’à sa vérification par l’équipe. Les paiements par carte sont confirmés par le prestataire.</p>
          </>
        )}
      </div>
    </main>
  );
}
