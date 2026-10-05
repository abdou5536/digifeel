import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, CircleAlert,
  FileSpreadsheet, FileText, LockKeyhole, MapPin, Plus, QrCode, Radio,
  RotateCcw, ShieldCheck, Star, Store, TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INSTALLATION_PACKS, PRODUCT_PRICING } from '../config/product';

const ProductNavigation: React.FC<{ current: string }> = ({ current }) => {
  const { setMode } = useApp();
  const links = [
    { label: 'Accueil', mode: 'landing' as const },
    { label: 'Tarifs', mode: 'pricing' as const },
    { label: 'Restaurateur', mode: 'workspace_demo' as const },
    { label: 'Admin démo', mode: 'admin_demo' as const }
  ];

  return (
    <nav className="product-subnav" aria-label="Navigation Digifeel">
      {links.map(link => (
        <button
          key={link.mode}
          type="button"
          className={current === link.mode ? 'is-current' : ''}
          aria-current={current === link.mode ? 'page' : undefined}
          onClick={() => setMode(link.mode)}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
};

const ProductPage: React.FC<{ current: string; children: React.ReactNode }> = ({ current, children }) => {
  const { setMode } = useApp();
  return (
    <div className="product-shell product-app-page">
      <header className="product-app-header">
        <button className="product-brand" type="button" onClick={() => setMode('landing')}>
          <span className="product-brand__mark"><Radio aria-hidden="true" /></span>
          DIGIFEEL
        </button>
        <ProductNavigation current={current} />
        <span className="product-demo-badge">Démonstration · Données fictives</span>
      </header>
      {children}
    </div>
  );
};

const formatEuro = (amount: number) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(amount);

export const PricingPage: React.FC = () => {
  const { setMode } = useApp();
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [subscriptionSelected, setSubscriptionSelected] = useState(false);
  const selectedPackDetails = INSTALLATION_PACKS.find(pack => pack.id === selectedPack);

  return (
    <ProductPage current="pricing">
      <main className="product-content pricing-page">
        <button className="product-back-link" type="button" onClick={() => setMode('landing')}><ArrowLeft aria-hidden="true" /> Retour au site</button>
        <section className="product-page-intro">
          <span className="product-eyebrow">Une installation, à votre rythme</span>
          <h1>Des tarifs faciles à comprendre.</h1>
          <p>Les puces et supports sont payés une seule fois. L’accès au tableau de bord est facultatif et peut être arrêté à tout moment.</p>
        </section>
        <div className="pricing-grid">
          {INSTALLATION_PACKS.map(pack => (
            <article className={`pricing-card${pack.id === 'complete' ? ' pricing-card--featured' : ''}`} key={pack.id}>
              {pack.id === 'complete' && <span className="pricing-card__badge">NFC + QR</span>}
              <h2>{pack.name}</h2>
              <p>{pack.summary}</p>
              <strong className="pricing-card__price">{formatEuro(pack.priceEuros)}</strong>
              <span className="pricing-card__once">Paiement unique</span>
              <ul>{pack.features.map(feature => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul>
              <button className="product-button product-button--full" type="button" onClick={() => setSelectedPack(pack.id)}>
                Choisir ce pack <ArrowRight aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
        <section className="subscription-card">
          <div className="subscription-card__copy">
            <span className="product-icon"><TrendingUp aria-hidden="true" /></span>
            <div>
              <h2>Tableau de bord et exports</h2>
              <p>Consultez les scans, suivez l’évolution de vos avis et exportez vos données.</p>
              <strong>{formatEuro(PRODUCT_PRICING.monthlySubscriptionEuros)} <small>/ mois</small></strong>
              <span className="pricing-card__once">Facultatif · résiliable à tout moment</span>
            </div>
          </div>
          <button className={`product-button${subscriptionSelected ? ' product-button--confirmed' : ''}`} type="button" onClick={() => setSubscriptionSelected(!subscriptionSelected)}>
            {subscriptionSelected ? <><Check aria-hidden="true" /> Option ajoutée</> : 'Ajouter en option'}
          </button>
        </section>
        <aside className="product-notice product-notice--success">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Vous arrêtez l’abonnement ?</strong> Les puces et QR codes restent actifs et continuent d’ouvrir votre avis Google. Seuls le tableau de bord et les exports sont suspendus.</p>
        </aside>
        {selectedPackDetails && (
          <div className="product-notice product-notice--success" role="status" aria-live="polite">
            <Check aria-hidden="true" />
            <p><strong>{selectedPackDetails.name} sélectionné · {formatEuro(selectedPackDetails.priceEuros)}.</strong> Simulation uniquement : aucun paiement n’a été effectué.</p>
            <button type="button" className="product-text-link" onClick={() => setSelectedPack(null)}>Annuler</button>
          </div>
        )}
        <button type="button" className="product-inline-link" onClick={() => setMode('workspace_demo')}>Voir le tableau de bord de démonstration <ArrowRight aria-hidden="true" /></button>
      </main>
    </ProductPage>
  );
};

const DEMO_ACTIVITY = [
  { day: 'Lun', scans: 22 }, { day: 'Mar', scans: 29 }, { day: 'Mer', scans: 25 },
  { day: 'Jeu', scans: 38 }, { day: 'Ven', scans: 46 }, { day: 'Sam', scans: 58 },
  { day: 'Dim', scans: 43 }
];

const DEMO_ACTIVITY_30_DAYS = [
  { day: 'J 1–6', scans: 184 }, { day: 'J 7–12', scans: 202 }, { day: 'J 13–18', scans: 226 },
  { day: 'J 19–24', scans: 237 }, { day: 'J 25–30', scans: 235 }
];

const DEMO_REVIEWS = [
  { date: 'Aujourd’hui · 13:42', stars: 5, source: 'QR · Table 4' },
  { date: 'Aujourd’hui · 12:18', stars: 5, source: 'NFC · Comptoir' },
  { date: 'Hier · 21:07', stars: 4, source: 'QR · Table 9' }
];

export const RestaurantDashboardPreview: React.FC = () => {
  const { setMode } = useApp();
  const [period, setPeriod] = useState<'7 jours' | '30 jours'>('7 jours');
  const [exportStatus, setExportStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const average = useMemo(() => (DEMO_REVIEWS.reduce((sum, review) => sum + review.stars, 0) / DEMO_REVIEWS.length).toFixed(1), []);
  const activity = period === '7 jours' ? DEMO_ACTIVITY : DEMO_ACTIVITY_30_DAYS;
  const maximumScans = Math.max(...activity.map(day => day.scans));

  const saveFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCsv = () => {
    setIsExporting(true);
    setExportStatus('');
    try {
      const lines = [
        ['Date', 'Note', 'Origine'],
        ...DEMO_REVIEWS.map(review => [review.date, `${review.stars}/5`, review.source])
      ];
      const csv = `\uFEFF${lines.map(line => line.map(value => `"${value.replace(/"/g, '""')}"`).join(';')).join('\r\n')}`;
      saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'digifeel-exemple-scans.csv');
      setExportStatus('Fichier compatible Excel téléchargé · données d’exemple.');
    } catch (error) {
      console.error('L’export Excel de démonstration a échoué.', error);
      setExportStatus('L’export a échoué. Réessayez.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportPdf = async () => {
    setIsExporting(true);
    setExportStatus('');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      pdf.setTextColor(18, 57, 54);
      pdf.setFontSize(20);
      pdf.text('Digifeel · Rapport de démonstration', 18, 24);
      pdf.setTextColor(45, 55, 53);
      pdf.setFontSize(12);
      pdf.text('Restaurant : Le Bistrot des Amis', 18, 38);
      pdf.text(`Période : ${period}`, 18, 48);
      pdf.text('Scans : 261', 18, 64);
      pdf.text(`Note moyenne : ${average}/5`, 18, 74);
      pdf.text('Derniers retours (exemple)', 18, 94);
      DEMO_REVIEWS.forEach((review, index) => {
        pdf.text(`${review.date} · ${review.stars}/5 · ${review.source}`, 18, 106 + index * 9);
      });
      pdf.setFontSize(9);
      pdf.text('Données fictives. Aucun paiement ni avis réel.', 18, 143);
      pdf.save('digifeel-rapport-exemple.pdf');
      setExportStatus('Rapport PDF téléchargé · données d’exemple.');
    } catch (error) {
      console.error('L’export PDF de démonstration a échoué.', error);
      setExportStatus('L’export a échoué. Réessayez.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ProductPage current="workspace_demo">
      <main className="product-content workspace-page">
        <div className="workspace-heading">
          <div>
            <span className="product-eyebrow">Espace restaurateur · Démo</span>
            <h1>Bonjour, Le Bistrot des Amis.</h1>
            <p>Voici les scans et les avis de votre établissement.</p>
          </div>
          <div className="workspace-heading__location"><MapPin aria-hidden="true" /> Lyon, France</div>
        </div>
        <div className="workspace-toolbar">
          <span className="workspace-demo-label"><span /> Données d’exemple</span>
          <label className="period-select">Période
            <select value={period} onChange={event => setPeriod(event.target.value as '7 jours' | '30 jours')}>
              <option>7 jours</option><option>30 jours</option>
            </select>
          </label>
        </div>
        <section className="metric-grid" aria-label="Indicateurs">
          <article className="metric-card"><span>Scans</span><strong>{period === '7 jours' ? '261' : '1 084'}</strong><small className="metric-card__trend"><ArrowUpRight aria-hidden="true" /> +18 % sur la période</small></article>
          <article className="metric-card"><span>Note moyenne</span><strong>{average}<small className="metric-card__out-of"> / 5</small></strong><small className="metric-card__stars" aria-label="5 étoiles">★★★★★</small></article>
          <article className="metric-card"><span>Scans vers Google</span><strong>{period === '7 jours' ? '184' : '762'}</strong><small>Après un scan NFC ou QR</small></article>
          <article className="metric-card"><span>Puces actives</span><strong>8</strong><small>NFC et QR · toutes en service</small></article>
        </section>
        <section className="dashboard-grid">
          <article className="product-panel scan-chart">
            <div className="product-panel__heading"><div><h2>Scans sur {period}</h2><p>Activité NFC et QR</p></div><span className="dashboard-total">{activity.reduce((total, day) => total + day.scans, 0).toLocaleString('fr-FR')}</span></div>
            <div className="scan-chart__bars" role="img" aria-label={`Nombre de scans par période sur ${period}`} style={{ gridTemplateColumns: `repeat(${activity.length}, minmax(0, 1fr))` }}>
              {activity.map(day => (
                <div className="scan-chart__column" key={day.day}>
                  <span className="scan-chart__value">{day.scans}</span>
                  <span className="scan-chart__bar" style={{ height: `${day.scans / maximumScans * 100}%` }} />
                  <span className="scan-chart__label">{day.day}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="product-panel">
            <div className="product-panel__heading"><div><h2>Derniers avis</h2><p>Exemples de retours récents</p></div><Star className="product-heading-icon" aria-hidden="true" /></div>
            <ul className="review-list">
              {DEMO_REVIEWS.map((review, index) => (
                <li key={`${review.date}-${review.source}`}>
                  <span className="review-list__avatar">{index + 1}</span>
                  <span className="review-list__copy"><strong>{review.source}</strong><small>{review.date}</small></span>
                  <span className="review-list__rating"><Star fill="currentColor" aria-hidden="true" /> {review.stars}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
        <section className="product-panel export-panel">
          <div><h2>Vos données, à portée de main.</h2><p>Exports simulés avec des exemples, sans connexion de paiement.</p></div>
          <div className="export-panel__actions">
            <button type="button" className="product-button product-button--secondary" disabled={isExporting} onClick={exportPdf}><FileText aria-hidden="true" /> Exporter en PDF</button>
            <button type="button" className="product-button product-button--secondary" disabled={isExporting} onClick={exportCsv}><FileSpreadsheet aria-hidden="true" /> Exporter en Excel</button>
          </div>
          {exportStatus && <p className="product-feedback" role="status">{exportStatus}</p>}
        </section>
        <aside className="product-notice product-notice--success workspace-rule">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Votre abonnement s’arrête ?</strong> Les puces continuent de rediriger vos clients vers Google. Le tableau de bord et les exports seront suspendus.</p>
        </aside>
      </main>
    </ProductPage>
  );
};

export const DashboardBlockedPage: React.FC = () => {
  const { setMode } = useApp();
  return (
    <ProductPage current="workspace_demo">
      <main className="product-content">
        <section className="dashboard-blocked">
          <span className="chip-error-card__icon"><LockKeyhole aria-hidden="true" /></span>
          <span className="product-eyebrow">Abonnement arrêté</span>
          <h1>Le tableau de bord est en pause.</h1>
          <p>Les statistiques et les exports sont réservés aux abonnements actifs. Les puces et les QR codes de ce restaurant continuent de rediriger vers son avis Google.</p>
          <button type="button" className="product-button" onClick={() => setMode('admin_demo')}><ArrowLeft aria-hidden="true" /> Retour à la liste</button>
        </section>
      </main>
    </ProductPage>
  );
};

type DemoRestaurant = {
  id: string;
  name: string;
  location: string;
  pack: string;
  payment: 'Payé' | 'En attente';
  subscription: 'Actif' | 'Arrêté';
  chips: { name: string; active: boolean }[];
};

const INITIAL_DEMO_RESTAURANTS: DemoRestaurant[] = [
  { id: 'r-1', name: 'Le Bistrot des Amis', location: 'Lyon', pack: 'Complet · 100 €', payment: 'Payé', subscription: 'Actif', chips: [{ name: 'Comptoir · NFC', active: true }, { name: 'Table 04 · QR', active: true }] },
  { id: 'r-2', name: 'Maison Junot', location: 'Paris', pack: 'NFC · 60 €', payment: 'En attente', subscription: 'Arrêté', chips: [{ name: 'Entrée · NFC', active: true }, { name: 'Table 02 · QR', active: true }] },
  { id: 'r-3', name: 'La Cantine Verte', location: 'Bordeaux', pack: 'QR · 90 €', payment: 'Payé', subscription: 'Actif', chips: [{ name: 'Comptoir · QR', active: true }] }
];

export const AdminDemoPage: React.FC = () => {
  const { setMode } = useApp();
  const [restaurants, setRestaurants] = useState(INITIAL_DEMO_RESTAURANTS);
  const [feedback, setFeedback] = useState('');

  const toggleSubscription = (id: string) => {
    setRestaurants(previous => previous.map(restaurant => restaurant.id === id
      ? { ...restaurant, subscription: restaurant.subscription === 'Actif' ? 'Arrêté' : 'Actif' }
      : restaurant));
    setFeedback('Statut modifié dans cette démo uniquement.');
  };

  const togglePayment = (id: string) => {
    setRestaurants(previous => previous.map(restaurant => restaurant.id === id
      ? { ...restaurant, payment: restaurant.payment === 'Payé' ? 'En attente' : 'Payé' }
      : restaurant));
    setFeedback('Statut modifié dans cette démo uniquement.');
  };

  const addRestaurant = () => {
    setRestaurants(previous => [...previous, {
      id: `r-${Date.now()}`,
      name: 'Nouveau restaurant',
      location: 'À renseigner',
      pack: 'Pack à choisir',
      payment: 'En attente',
      subscription: 'Arrêté',
      chips: []
    }]);
    setFeedback('Restaurant d’exemple ajouté. Aucun compte réel n’a été créé.');
  };

  return (
    <ProductPage current="admin_demo">
      <main className="product-content admin-page">
        <div className="workspace-heading">
          <div>
            <span className="product-eyebrow">Espace administrateur · Démo</span>
            <h1>Suivi des installations.</h1>
            <p>Restaurants, puces et statuts de paiement au même endroit.</p>
          </div>
          <button className="product-button" type="button" onClick={addRestaurant}><Plus aria-hidden="true" /> Ajouter un restaurant</button>
        </div>
        <aside className="product-notice product-notice--success">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Le service reste simple.</strong> Quand un abonnement est arrêté, les puces restent actives et continuent d’ouvrir l’avis Google. Seuls l’espace restaurateur et les exports sont bloqués.</p>
        </aside>
        <div className="admin-summary">
          <article className="metric-card"><span>Restaurants</span><strong>{restaurants.length}</strong><small>Dans cette démo</small></article>
          <article className="metric-card"><span>Paiements en attente</span><strong>{restaurants.filter(restaurant => restaurant.payment === 'En attente').length}</strong><small>Installation à confirmer</small></article>
          <article className="metric-card"><span>Abonnements actifs</span><strong>{restaurants.filter(restaurant => restaurant.subscription === 'Actif').length}</strong><small>Tableau de bord disponible</small></article>
        </div>
        {feedback && <p className="product-feedback" role="status">{feedback}</p>}
        {restaurants.length === 0 ? (
          <section className="product-empty-state">
            <Store aria-hidden="true" />
            <h2>Aucun restaurant pour le moment.</h2>
            <p>Ajoutez un restaurant pour commencer le suivi.</p>
            <button className="product-button" type="button" onClick={addRestaurant}><Plus aria-hidden="true" /> Ajouter un restaurant</button>
          </section>
        ) : (
          <section className="admin-restaurant-list" aria-label="Restaurants suivis">
            {restaurants.map(restaurant => (
              <article className="admin-restaurant" key={restaurant.id}>
                <header className="admin-restaurant__heading">
                  <span className="product-icon"><Store aria-hidden="true" /></span>
                  <div><h2>{restaurant.name}</h2><p><MapPin aria-hidden="true" /> {restaurant.location} · {restaurant.pack}</p></div>
                </header>
                <div className="admin-restaurant__statuses">
                  <div><span>Paiement installation</span><span className={`status-pill${restaurant.payment === 'Payé' ? ' status-pill--good' : ' status-pill--pending'}`}>{restaurant.payment}</span></div>
                  <div><span>Abonnement mensuel</span><span className={`status-pill${restaurant.subscription === 'Actif' ? ' status-pill--good' : ' status-pill--stopped'}`}>{restaurant.subscription}</span></div>
                </div>
                <div className="admin-chip-list">
                  <strong><Radio aria-hidden="true" /> Puces associées ({restaurant.chips.length})</strong>
                  {restaurant.chips.length ? restaurant.chips.map(chip => (
                    <span className="admin-chip" key={chip.name}><QrCode aria-hidden="true" /> {chip.name}<span className="status-pill status-pill--good">Active · Google</span></span>
                  )) : <span className="admin-chip-list__empty">Aucune puce associée.</span>}
                </div>
                <footer className="admin-restaurant__actions">
                  <button type="button" className="product-button product-button--secondary" onClick={() => togglePayment(restaurant.id)}>
                    <RotateCcw aria-hidden="true" /> Simuler le paiement
                  </button>
                  <button type="button" className="product-button product-button--secondary" onClick={() => toggleSubscription(restaurant.id)}>
                    {restaurant.subscription === 'Actif' ? <LockKeyhole aria-hidden="true" /> : <Check aria-hidden="true" />}
                    {restaurant.subscription === 'Actif' ? 'Arrêter abonnement' : 'Activer abonnement'}
                  </button>
                  <button
                    type="button"
                    className="product-button"
                    onClick={() => setMode(restaurant.subscription === 'Actif' ? 'workspace_demo' : 'workspace_locked')}
                  >
                    {restaurant.subscription === 'Actif' ? 'Voir le tableau de bord' : 'Tableau de bord suspendu'}
                    <ArrowRight aria-hidden="true" />
                  </button>
                </footer>
                {restaurant.subscription === 'Arrêté' && (
                  <p className="admin-restaurant__rule"><Check aria-hidden="true" /> Les puces restent actives et redirigent vers Google.</p>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </ProductPage>
  );
};

export const ChipErrorPage: React.FC = () => {
  const { setMode } = useApp();
  const uid = new URLSearchParams(window.location.search).get('nfc');
  return (
    <main className="product-shell chip-error-page">
      <section className="chip-error-card">
        <span className="chip-error-card__icon"><CircleAlert aria-hidden="true" /></span>
        <span className="product-eyebrow">Scan NFC ou QR</span>
        <h1>Cette puce n’est pas reconnue.</h1>
        <p>Le lien est inconnu ou la puce n’est pas encore activée. Demandez de l’aide à l’équipe du restaurant.</p>
        {uid && <p className="chip-error-card__reference">Référence : <code>{uid.slice(0, 36)}</code></p>}
        <button type="button" className="product-button" onClick={() => setMode('landing')}><ArrowLeft aria-hidden="true" /> Retour à l’accueil</button>
      </section>
    </main>
  );
};
