'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, LogOut, Star, Users } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';

interface DashboardReview {
  id: string;
  stars: number;
  comment: string;
  created_at: string;
  server_id: string | null;
  server_name: string | null;
}

interface DashboardServer {
  id: string;
  name: string;
  active: boolean;
  review_count: number;
  average_rating: number;
}

interface DashboardData {
  restaurant: { id: string; name: string; address: string | null; google_review_url: string | null; tip_enabled: boolean };
  scansCount: number;
  scansByDay: Array<{ date: string; count: number }>;
  reviewCount: number;
  averageRating: number;
  reviews: DashboardReview[];
  servers: DashboardServer[];
  subscription: { status: string; trial_ends_at: string | null } | null;
  hasAccess: boolean;
  role: string;
  displayName: string;
  periodDays: number;
}

interface ExportData {
  restaurantName: string;
  periodDays: number;
  generatedAt: string;
  scansCount: number;
  scansByDay: Array<{ date: string; count: number }>;
  reviewCount: number;
  averageRating: number;
  reviews: DashboardReview[];
}

const PERIODS = [7, 30, 90, 365] as const;

export function RestaurantDashboard({ demo = false }: { demo?: boolean }) {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [reviewStarsFilter, setReviewStarsFilter] = useState('all');
  const [reviewServerFilter, setReviewServerFilter] = useState('all');
  const [data, setData] = useState<DashboardData | null>(() => demo ? createDemoData(30) : null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [tipEnabled, setTipEnabled] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setRestaurantName(data.restaurant.name);
    setAddress(data.restaurant.address ?? '');
    setGoogleReviewUrl(data.restaurant.google_review_url ?? '');
    setTipEnabled(data.restaurant.tip_enabled);
  }, [data?.restaurant]);

  useEffect(() => {
    let alive = true;
    if (demo) {
      setData(createDemoData(periodDays));
      return () => { alive = false; };
    }
    if (!isSupabaseConfigured) {
      setError('Configurez Supabase dans .env pour charger les données de votre restaurant.');
      return () => { alive = false; };
    }
    const loadDashboard = async () => {
      try {
        const { data: sessionData, error: sessionError } = await createSupabaseBrowserClient().auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) throw new Error('Connectez-vous pour ouvrir votre espace.');
        const response = await fetch(`/api/dashboard/overview?days=${periodDays}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Le tableau de bord est indisponible.');
        if (result.unconfigured) throw new Error('Aucun restaurant n’est encore associé à ce compte. Activez une puce pour commencer.');
        if (alive) {
          setData(result);
          setError('');
        }
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Le tableau de bord est indisponible.');
      }
    };
    void loadDashboard();
    return () => { alive = false; };
  }, [demo, periodDays]);

  const average = data ? data.averageRating ? data.averageRating.toFixed(1) : '—' : '—';
  const visibleReviews = useMemo(() => data?.reviews.filter(review =>
    (reviewStarsFilter === 'all' || review.stars === Number(reviewStarsFilter)) &&
    (reviewServerFilter === 'all' ||
      (reviewServerFilter === 'unassigned' ? review.server_id === null : review.server_id === reviewServerFilter))
  ) ?? [], [data?.reviews, reviewServerFilter, reviewStarsFilter]);
  const scansToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data?.scansByDay.find(day => day.date.slice(0, 10) === today)?.count ?? 0;
  }, [data]);

  const inviteServer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/dashboard/servers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Invitation impossible.');
      setNotice(`Invitation envoyée à ${result.email}.`);
      setName('');
      setEmail('');
    } catch (inviteError) {
      setNotice(inviteError instanceof Error ? inviteError.message : 'Invitation impossible.');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsBusy(true);
    setSettingsNotice('');
    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: restaurantName, address, googleReviewUrl, tipEnabled })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Les réglages n’ont pas pu être enregistrés.');
      setData(current => current ? {
        ...current,
        restaurant: { ...current.restaurant, name: restaurantName.trim(), address: address.trim() || null, google_review_url: googleReviewUrl.trim(), tip_enabled: tipEnabled }
      } : current);
      setSettingsNotice('Réglages enregistrés.');
    } catch (saveError) {
      setSettingsNotice(saveError instanceof Error ? saveError.message : 'Les réglages n’ont pas pu être enregistrés.');
    } finally {
      setSettingsBusy(false);
    }
  };

  const loadExportData = async (): Promise<ExportData> => {
    if (!data) throw new Error('Le tableau de bord n’est pas prêt.');
    if (demo) return {
      restaurantName: data.restaurant.name,
      periodDays,
      generatedAt: new Date().toISOString(),
      scansCount: data.scansCount,
      scansByDay: data.scansByDay,
      reviewCount: data.reviewCount,
      averageRating: data.averageRating,
      reviews: data.reviews
    };
    const response = await fetch(`/api/dashboard/export?days=${periodDays}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Les données n’ont pas pu être exportées.');
    return result as ExportData;
  };

  const exportExcel = async () => {
    setExportError('');
    setExporting(true);
    try {
      const report = await loadExportData();
      const rows = [
        ['Type', 'Date', 'Nombre de scans', 'Étoiles', 'Commentaire', 'Serveur'],
        ...report.scansByDay.map(day => ['Scans', day.date, String(day.count), '', '', '']),
        ...report.reviews.map(review => [
          'Avis',
          new Date(review.created_at).toLocaleString('fr-FR'),
          '',
          String(review.stars),
          review.comment,
          review.server_name ?? ''
        ])
      ];
      const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}`;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      downloadFile(url, `${slug(report.restaurantName)}-${report.periodDays}j.csv`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'L’export Excel n’a pas pu être généré.');
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    setExportError('');
    setExporting(true);
    try {
      const report = await loadExportData();
      const { default: JsPDF } = await import('jspdf');
      const pdf = new JsPDF();
      pdf.setFontSize(18);
      pdf.text(`Rapport Digifeel — ${report.restaurantName}`, 14, 18);
      pdf.setFontSize(10);
      pdf.text(`Période : ${report.periodDays} jours`, 14, 26);
      pdf.text(`Scans : ${report.scansCount}   |   Avis : ${report.reviewCount}   |   Note moyenne : ${report.averageRating.toFixed(1)}/5`, 14, 33);
      let y = 44;
      report.reviews.forEach(review => {
        const line = `${new Date(review.created_at).toLocaleDateString('fr-FR')} · ${review.stars}/5 · ${review.server_name ? `${review.server_name} · ` : ''}${review.comment || 'Sans commentaire'}`;
        const wrapped = pdf.splitTextToSize(line, 180) as string[];
        if (y + wrapped.length * 5 > 280) {
          pdf.addPage();
          y = 18;
        }
        pdf.text(wrapped, 14, y);
        y += wrapped.length * 5 + 3;
      });
      pdf.save(`${slug(report.restaurantName)}-${report.periodDays}j.pdf`);
    } catch (error) {
      console.error('PDF export failed.', error);
      setExportError(error instanceof Error ? error.message : 'Le rapport PDF n’a pas pu être généré.');
    } finally {
      setExporting(false);
    }
  };

  if (error) return <div className="next-page-wrap"><Link className="next-link" href="/">Retour au site</Link><p className="next-banner" role="alert">{error} {error.includes('Connectez-vous') && <Link className="next-link" href="/login?next=/dashboard">Se connecter</Link>}</p></div>;
  if (!data) return <div className="next-page-wrap"><p className="next-muted" role="status">Chargement de votre espace…</p></div>;

  const logout = async () => {
    if (isSupabaseConfigured) await createSupabaseBrowserClient().auth.signOut();
    window.location.assign('/');
  };

  const highestScanCount = Math.max(1, ...data.scansByDay.map(day => day.count));

  return (
    <main className="next-page-wrap">
      <div className="next-dashboard-toolbar">
        <div>
          <Link className="next-link" href="/"><ArrowLeft aria-hidden="true" /> Digifeel</Link>
          <h1 className="next-page-heading next-dashboard-title">{data.restaurant.name}</h1>
          <p className="next-muted">{demo ? 'Mode démo : chiffres fictifs.' : `Bonjour${data.displayName ? ` ${data.displayName}` : ''}. Voici l’activité de votre restaurant.`}</p>
        </div>
        <button className="product-button product-button--secondary" type="button" onClick={logout}><LogOut aria-hidden="true" /> Déconnexion</button>
      </div>
      {!data.hasAccess ? (
        <section className="next-glass-card next-surface-card">
          <h2>Les puces restent actives.</h2>
          <p className="next-muted">L’accès au tableau de bord et aux exports est suspendu. Les scans continuent de rediriger les clients vers votre page Google.</p>
          <p className="next-muted">Statut de l’abonnement : {data.subscription?.status ?? 'non actif'}.</p>
        </section>
      ) : <>
        <div className="next-dashboard-toolbar">
          <label className="next-period-picker">Période
            <select value={periodDays} onChange={event => setPeriodDays(Number(event.target.value))}>
              {PERIODS.map(days => <option key={days} value={days}>{days} derniers jours</option>)}
            </select>
          </label>
          {data.role === 'server' && <span className="next-muted">Vous ne voyez que vos propres avis.</span>}
        </div>
        <section className={`next-dashboard-grid ${data.role === 'server' ? 'next-dashboard-grid--server' : ''}`}>
          {data.role === 'restaurant_admin' && <article className="next-glass-card next-metric"><span>Scans sur la période</span><strong>{data.scansCount}</strong></article>}
          {data.role === 'restaurant_admin' && <article className="next-glass-card next-metric"><span>Scans aujourd’hui</span><strong>{scansToday}</strong></article>}
          <article className="next-glass-card next-metric"><span>Avis sur la période</span><strong>{data.reviewCount}</strong></article>
          <article className="next-glass-card next-metric"><span>Note moyenne</span><strong>{average} <Star className="next-accent" aria-hidden="true" /></strong></article>
        </section>
        {data.role === 'restaurant_admin' && <section className="next-glass-card next-surface-card next-activity">
          <h2>Scans par jour</h2>
          <div className="next-activity-chart" role="img" aria-label={`${data.periodDays} derniers jours : ${data.scansCount} scans`}>
            {data.scansByDay.map(day => <div className="next-activity-bar" key={day.date} title={`${new Date(`${day.date}T00:00:00`).toLocaleDateString('fr-FR')}: ${day.count} scans`}>
              <i style={{ height: `${Math.max(2, day.count / highestScanCount * 100)}%` }} />
              {(data.periodDays <= 30 || new Date(`${day.date}T00:00:00`).getDate() === 1) && <small>{new Date(`${day.date}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</small>}
            </div>)}
          </div>
        </section>}
        <div className="next-dashboard-toolbar">
          <span className="next-muted">Export complet de la période, scans quotidiens et avis détaillés.</span>
          <div className="next-nav__actions">
            <button className="product-button product-button--secondary" type="button" disabled={exporting} onClick={() => void exportPdf()}><Download aria-hidden="true" /> {exporting ? 'Préparation…' : 'Exporter en PDF'}</button>
            <button className="product-button product-button--secondary" type="button" disabled={exporting} onClick={() => void exportExcel()}><Download aria-hidden="true" /> Exporter pour Excel (.csv)</button>
          </div>
          {exportError && <p className="next-error" role="alert">{exportError}</p>}
        </div>
        <div className="next-dashboard-columns">
          <section className="next-glass-card next-surface-card">
            <h2>Avis récents</h2>
            <div className="next-dashboard-toolbar" aria-label="Filtres des avis">
              <label className="next-period-picker">Note
                <select value={reviewStarsFilter} onChange={event => setReviewStarsFilter(event.target.value)}>
                  <option value="all">Toutes les notes</option>
                  {[5, 4, 3, 2, 1].map(stars => <option key={stars} value={stars}>{stars} {stars === 1 ? 'étoile' : 'étoiles'}</option>)}
                </select>
              </label>
              <label className="next-period-picker">Serveur
                <select value={reviewServerFilter} onChange={event => setReviewServerFilter(event.target.value)}>
                  <option value="all">Toute l’équipe</option>
                  <option value="unassigned">Sans serveur associé</option>
                  {data.servers.map(server => <option key={server.id} value={server.id}>{server.name}</option>)}
                </select>
              </label>
            </div>
            {visibleReviews.length === 0
              ? <p className="next-muted">{data.reviews.length === 0 ? 'Aucun avis enregistré sur cette période.' : 'Aucun avis ne correspond à ces filtres.'}</p>
              : <ul className="next-review-list">
              {visibleReviews.slice(0, 30).map(review => <li key={review.id}>
                <strong>{'★'.repeat(review.stars)}<span className="next-muted">{'★'.repeat(5 - review.stars)}</span></strong>
                <small>{new Date(review.created_at).toLocaleDateString('fr-FR')}</small>
                <span>{review.comment || 'Sans commentaire'}</span>
                <small>{review.server_name ?? 'Sans serveur associé'}</small>
              </li>)}
            </ul>}
            {data.reviewCount > data.reviews.length && <p className="next-muted">Les {data.reviews.length} avis les plus récents sont affichés. Les exports contiennent tous les avis de la période.</p>}
          </section>
          <div className="next-dashboard-stack">
            {data.role === 'restaurant_admin' && <section className="next-glass-card next-surface-card">
              <h2><Users aria-hidden="true" /> Équipe</h2>
              {data.servers.length === 0 ? <p className="next-muted">Aucun serveur ajouté.</p> : data.servers.map(server => <p className="next-server-row" key={server.id}>{server.name}<span>{server.review_count} avis · {server.average_rating ? server.average_rating.toFixed(1) : '—'}/5</span></p>)}
            </section>}
            {data.role === 'restaurant_admin' && <section className="next-glass-card next-surface-card">
              <h2>Inviter un serveur</h2>
              <form className="next-form" onSubmit={inviteServer}>
                <label>Nom<input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
                <label>E-mail<input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
                <button className="product-button" type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer une invitation'}</button>
                {notice && <p className="next-muted" role="status">{notice}</p>}
              </form>
            </section>}
            {data.role === 'restaurant_admin' && <section className="next-glass-card next-surface-card">
              <h2>Réglages du restaurant</h2>
              {!demo ? <form className="next-form" onSubmit={saveSettings}>
                <label>Nom du restaurant<input required minLength={2} maxLength={120} value={restaurantName} onChange={event => setRestaurantName(event.target.value)} /></label>
                <label>Adresse<input maxLength={200} value={address} onChange={event => setAddress(event.target.value)} /></label>
                <label>Lien Google<input required type="url" value={googleReviewUrl} onChange={event => setGoogleReviewUrl(event.target.value)} /></label>
                <label className="next-checkbox-label"><input type="checkbox" checked={tipEnabled} onChange={event => setTipEnabled(event.target.checked)} /> Proposer un choix de pourboire (sans encaissement)</label>
                <button className="product-button product-button--secondary" type="submit" disabled={settingsBusy}>{settingsBusy ? 'Enregistrement…' : 'Enregistrer les réglages'}</button>
                {settingsNotice && <p className="next-muted" role="status">{settingsNotice}</p>}
                <p className="next-muted" data-testid="legal-reminder">
                  Digifeel n’est PAS une caisse certifiée (NF525) : les tickets sont des justificatifs d’information. Les primes et récompenses ne doivent jamais dépendre d’un avis Google, et seuls des avis authentiques sont acceptés.
                </p>
              </form> : <>
                <p className="next-muted">Lien Google configuré. Les clients le voient après leur avis, quelle que soit leur note.</p>
                {data.restaurant.google_review_url
                  ? <a className="next-link" href={data.restaurant.google_review_url} target="_blank" rel="noreferrer">Vérifier le lien Google</a>
                  : <p className="next-muted">Aucun lien Google configuré.</p>}
              </>}
              <p className="next-muted">Abonnement : {data.subscription?.status ?? 'non configuré'}.</p>
            </section>}
          </div>
        </div>
      </>}
    </main>
  );
}

function slug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant';
}

function csvCell(value: string) {
  const safeValue = /^[\u0000-\u0020]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function createDemoData(periodDays: number): DashboardData {
  const now = Date.now();
  const scanCountPerDay = Array.from({ length: periodDays }, (_, index) =>
    Math.round(18 + 13 * Math.sin(index * 0.6) + 9 * Math.cos(index * 0.27))
  );
  const scansByDay = scanCountPerDay.map((count, index) => ({
    date: new Date(now - (periodDays - index - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    count: Math.max(2, count)
  }));
  const reviews: DashboardReview[] = [
    { id: 'demo-review-1', stars: 5, comment: 'Un accueil chaleureux et un excellent déjeuner.', created_at: new Date(now - 3600000).toISOString(), server_id: 'demo-server-1', server_name: 'Camille' },
    { id: 'demo-review-2', stars: 4, comment: 'Très bons produits, service rapide.', created_at: new Date(now - 86400000).toISOString(), server_id: 'demo-server-2', server_name: 'Yanis' },
    { id: 'demo-review-3', stars: 5, comment: 'Nous reviendrons avec plaisir.', created_at: new Date(now - 2 * 86400000).toISOString(), server_id: null, server_name: null }
  ];
  return {
    restaurant: { id: 'demo-restaurant', name: 'La Cuisine', address: 'Lyon', google_review_url: 'https://www.google.com/search?q=La+Cuisine+restaurant+avis', tip_enabled: false },
    scansCount: scansByDay.reduce((sum, day) => sum + day.count, 0),
    scansByDay,
    reviewCount: reviews.length,
    averageRating: reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length,
    reviews,
    servers: [
      { id: 'demo-server-1', name: 'Camille', active: true, review_count: 1, average_rating: 5 },
      { id: 'demo-server-2', name: 'Yanis', active: true, review_count: 1, average_rating: 4 }
    ],
    subscription: { status: 'trialing', trial_ends_at: new Date(now + 14 * 86400000).toISOString() },
    hasAccess: true,
    role: 'restaurant_admin',
    displayName: 'Alex',
    periodDays
  };
}

function downloadFile(url: string, name: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
