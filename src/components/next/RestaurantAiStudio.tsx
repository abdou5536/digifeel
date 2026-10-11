'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowRight, Check, CreditCard, ExternalLink, LoaderCircle, QrCode, Sparkles } from 'lucide-react';
import { PRODUCT_PRICING } from '@/src/config/product';

type MenuSection = {
  name: string;
  items: Array<{ name: string; description: string; price: string | null }>;
};

type OfferStatus = {
  publishedMenus: number;
  freeMenusRemaining: number;
  subscriptionStatus: string;
  canUseAccountingAi: boolean;
  canManageBilling: boolean;
};

type GeneratedMenu = { title: string; sections: MenuSection[]; url: string; freeMenusRemaining: number };

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || fallback;
}

export function RestaurantAiStudio() {
  const [offer, setOffer] = useState<OfferStatus | null>(null);
  const [title, setTitle] = useState('');
  const [menuText, setMenuText] = useState('');
  const [generatedMenu, setGeneratedMenu] = useState<GeneratedMenu | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [period, setPeriod] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshOffer = async () => {
    const response = await fetch('/api/ai/menu', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(await readError(response, 'Les informations de l’offre sont indisponibles.'));
    setOffer(await response.json() as OfferStatus);
  };

  useEffect(() => {
    void refreshOffer().catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.'));
    const result = new URLSearchParams(window.location.search).get('billing');
    if (result === 'success') setNotice('Retour de Stripe reçu. La mise à jour de l’abonnement sera confirmée par webhook.');
    if (result === 'cancelled') setNotice('Le paiement a été annulé. Aucun prélèvement n’a été effectué.');
  }, []);

  useEffect(() => {
    if (!generatedMenu) {
      setQrDataUrl('');
      return;
    }
    void QRCode.toDataURL(generatedMenu.url, { width: 300, margin: 2, errorCorrectionLevel: 'H' })
      .then(setQrDataUrl)
      .catch(qrError => {
        console.error('Menu QR code could not be generated.', qrError);
        setError('Le menu est publié, mais le QR code n’a pas pu être créé.');
      });
  }, [generatedMenu]);

  const submitMenu = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setGeneratedMenu(null);
    try {
      const response = await fetch('/api/ai/menu', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, menuText })
      });
      if (!response.ok) throw new Error(await readError(response, 'La génération du menu a échoué.'));
      setGeneratedMenu(await response.json() as GeneratedMenu);
      setMenuText('');
      await refreshOffer();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'La génération du menu a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const requestAccountingSummary = async () => {
    setBusy(true);
    setError('');
    setSummary('');
    try {
      const response = await fetch('/api/ai/accounting', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: period })
      });
      if (!response.ok) throw new Error(await readError(response, 'La synthèse comptable est indisponible.'));
      const result = await response.json() as { summary: string };
      setSummary(result.summary);
    } catch (summaryError) {
      setError(summaryError instanceof Error ? summaryError.message : 'La synthèse comptable est indisponible.');
    } finally {
      setBusy(false);
    }
  };

  const openCheckout = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error(await readError(response, 'Le paiement n’a pas pu être ouvert.'));
      const result = await response.json() as { checkoutUrl: string };
      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Le paiement n’a pas pu être ouvert.');
      setBusy(false);
    }
  };

  const openBillingPortal = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error(await readError(response, 'Le portail de facturation est indisponible.'));
      const result = await response.json() as { url: string };
      window.location.assign(result.url);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Le portail de facturation est indisponible.');
      setBusy(false);
    }
  };

  return (
    <main className="ai-studio-page next-app">
      <header className="ai-studio-header">
        <Link href="/app" className="next-link"><ArrowLeft aria-hidden="true" /> Espace restaurant</Link>
        <span className="ai-studio-brand"><Sparkles aria-hidden="true" /> DIGIFEEL IA</span>
      </header>
      <div className="ai-studio-content">
        <div className="ai-studio-heading">
          <span className="next-kicker">Menus web · gestion</span>
          <h1>Votre restaurant, prêt pour l’IA.</h1>
          <p>Créez un menu partageable avec lien et QR code, puis résumez vos ventes avec l’assistant de gestion.</p>
        </div>

        <section className="ai-studio-offer next-glass-card" aria-label="Votre offre Digifeel">
          <div>
            <span className="next-kicker">OFFRE DIGIFEEL</span>
            <p>{offer ? offer.canUseAccountingAi
              ? 'Assistant IA accessible avec votre abonnement actif.'
              : `${offer.freeMenusRemaining} menu(x) gratuit(s) restant(s)`
              : 'Chargement des utilisations…'}</p>
            <small>{PRODUCT_PRICING.monthlySubscriptionEuros} €/mois · sans période d’essai</small>
          </div>
          <div className="ai-studio-billing-actions">
            {!offer?.canUseAccountingAi && <button type="button" className="product-button" onClick={() => void openCheckout()} disabled={busy}><CreditCard />S’abonner · {PRODUCT_PRICING.monthlySubscriptionEuros} €/mois</button>}
            {offer?.canManageBilling && <button type="button" className="product-button product-button--secondary" onClick={() => void openBillingPortal()} disabled={busy}><CreditCard />Gérer la facturation</button>}
          </div>
        </section>

        <section className="ai-studio-grid">
          <article className="next-glass-card ai-studio-card">
            <span className="ai-studio-card__icon"><QrCode aria-hidden="true" /></span>
            <h2>Créer un menu avec l’IA</h2>
            <p>Deux créations gratuites. Vérifiez les noms et prix avant de partager le lien avec vos clients.</p>
            <form onSubmit={event => void submitMenu(event)}>
              <label>Titre du menu<input required minLength={2} maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="Menu du restaurant" /></label>
              <label>Vos plats, catégories, descriptions et prix<textarea required minLength={10} maxLength={10000} rows={8} value={menuText} onChange={event => setMenuText(event.target.value)} placeholder={'Entrées\nSoupe du jour — 500 DZD\n\nPlats\nCouscous maison — 1 800 DZD'} /></label>
              <button className="product-button" type="submit" disabled={busy}><Sparkles aria-hidden="true" />{busy ? 'Génération…' : 'Générer le menu web'}</button>
            </form>
            {generatedMenu && <div className="ai-menu-result">
              <h3><Check aria-hidden="true" />Votre menu est en ligne</h3>
              <a href={generatedMenu.url} target="_blank" rel="noreferrer">{generatedMenu.url} <ExternalLink size={15} /></a>
              {qrDataUrl && <div className="ai-menu-qr">
                <img src={qrDataUrl} alt={`QR code du menu ${generatedMenu.title}`} />
                <a className="product-button product-button--secondary" href={qrDataUrl} download={`${generatedMenu.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`}>Télécharger le QR</a>
              </div>}
              <p>{generatedMenu.freeMenusRemaining} menu(x) gratuit(s) restant(s).</p>
            </div>}
          </article>

          <article className="next-glass-card ai-studio-card">
            <span className="ai-studio-card__icon"><Sparkles aria-hidden="true" /></span>
            <h2>Assistant de gestion IA</h2>
            <p>Obtenez une synthèse de votre chiffre d’affaires, du nombre de ventes et des annulations enregistrées dans Digifeel.</p>
            <label>Période
              <select value={period} onChange={event => setPeriod(Number(event.target.value))}>
                <option value={7}>7 jours</option><option value={30}>30 jours</option>
                <option value={90}>90 jours</option><option value={365}>365 jours</option>
              </select>
            </label>
            <button className="product-button" type="button" onClick={() => void requestAccountingSummary()} disabled={busy || !offer?.canUseAccountingAi}>
              <Sparkles aria-hidden="true" />Générer la synthèse
            </button>
            {!offer?.canUseAccountingAi && <p className="ai-studio-locked">Un abonnement payant actif est nécessaire pour cette fonction.</p>}
            {summary && <div className="ai-accounting-summary"><h3>Synthèse de gestion</h3><p>{summary}</p><small>Analyse indicative des ventes Digifeel. Ce document n’est pas une comptabilité certifiée.</small></div>}
          </article>
        </section>
        <p className="ai-studio-payment-note">Carte bancaire via Stripe (moyens affichés selon le pays et l’appareil). BaridiMob reste un virement manuel, sans renouvellement automatique de l’abonnement.</p>
        {notice && <p className="ai-studio-notice" role="status">{notice}</p>}
        {error && <p className="ai-studio-error" role="alert">{error}</p>}
        {busy && <span className="ai-studio-busy"><LoaderCircle aria-hidden="true" /> Traitement en cours</span>}
        <Link className="ai-studio-pricing-link" href="/#tarifs">Voir les tarifs <ArrowRight aria-hidden="true" /></Link>
      </div>
    </main>
  );
}
