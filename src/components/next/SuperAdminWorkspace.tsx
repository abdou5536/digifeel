'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Check, CircleAlert, CreditCard, Download, FileDown, KeyRound, Plus, QrCode, ShieldAlert, Star, Tags, TrendingUp, Users, UserRound } from 'lucide-react';
import QRCode from 'qrcode';
import { PwaInstallButton } from './PwaInstallButton';
import {
  assignTagToTable, createRestaurant, createTagBatch, getPackPrices, getRestaurantData, recordResellerPlatformPayment,
  getSuperAdminOverview, setPackPrices, setSubscriptionStatus, subscribeRestaurantData,
  type RestaurantData, type Tag as RestaurantTag
} from '@/src/services/restaurant';
import { paymentProvider, type PaymentMethod } from '@/src/services/paymentProvider';
import { ThemePicker } from './ThemePicker';
import { StarBonusAdminPanel } from './StarBonusAdminPanel';
import { ResellerAdminPanel } from './ResellerAdminPanel';

type AdminTab = 'overview' | 'restaurants' | 'chips' | 'subscriptions' | 'packs' | 'referrals' | 'starBonus' | 'resellers';

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatAdminMoney(amount: number, currency: 'EUR' | 'DZD' = 'DZD') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: currency === 'DZD' ? 0 : 2 }).format(amount);
}

export function SuperAdminWorkspace() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<RestaurantData | null>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getSuperAdminOverview>> | null>(null);
  const [prices, setPrices] = useState<number[]>([100, 90, 60]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [resellerCode, setResellerCode] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'DZD'>('DZD');
  const [pack, setPack] = useState(100);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('simulation');
  const [chipCount, setChipCount] = useState('12');
  const [generatedTags, setGeneratedTags] = useState<RestaurantTag[]>([]);
  const [domain, setDomain] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [nextData, nextOverview, nextPrices] = await Promise.all([getRestaurantData(), getSuperAdminOverview(), getPackPrices()]);
    setData(nextData);
    setOverview(nextOverview);
    setPrices(nextPrices);
  }, []);

  useEffect(() => {
    let alive = true;
    void refresh().then(() => { if (alive) setLoading(false); }).catch(loadError => {
      if (alive) {
        setError(loadError instanceof Error ? loadError.message : 'Les données d’administration sont indisponibles.');
        setLoading(false);
      }
    });
    const unsubscribe = subscribeRestaurantData(() => { void refresh(); });
    return () => { alive = false; unsubscribe(); };
  }, [refresh]);

  const action = async (work: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      await refresh();
      setNotice(message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  const submitRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedCurrency = currency;
    await action(async () => {
      const result = await paymentProvider.charge({ amount: pack, currency: 'EUR', method: paymentMethod, description: 'Pack installation Digifeel' });
      const created = await createRestaurant({ name, city, currency: selectedCurrency, packPrice: pack, resellerCode });
      await recordResellerPlatformPayment({
        restaurantId: created.restaurant.id, amountEUR: pack, kind: 'installation',
        reference: result.reference, status: result.status === 'paid' ? 'validated' : 'pending'
      });
      setNotice(result.status === 'pending_manual' ? `Restaurant créé. Paiement en attente de validation · ${result.reference}` : `Restaurant créé. Pack simulé payé · ${result.reference}`);
      setName('');
      setCity('');
      setResellerCode('');
    }, 'Restaurant créé et mois offert activé.');
  };

  const generateBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const count = Number(chipCount);
    await action(async () => {
      setGeneratedTags(await createTagBatch(null, count));
    }, `${count} puces générées.`);
  };

  const savePrices = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await action(() => setPackPrices(prices), 'Les prix des packs ont été enregistrés.');
  };

  const selectDomain = () => {
    const configured = domain.trim().replace(/\/+$/, '');
    if (configured) return /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
    return typeof window !== 'undefined' ? window.location.origin : 'https://digifeel.app';
  };

  const buildTagUrl = (code: string) => `${selectDomain()}/t/${encodeURIComponent(code)}`;

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Code', 'Restaurant', 'Table', 'URL', 'Statut'], ...data.tags.map(tag => [
      tag.code,
      data.restaurants.find(restaurant => restaurant.id === tag.restaurantId)?.name ?? '',
      data.tables.find(table => table.id === tag.tableId)?.name ?? '',
      buildTagUrl(tag.code),
      tag.active ? 'active' : 'inactive'
    ])];
    const csv = `\uFEFF${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n')}`;
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'digifeel-puces.csv');
  };

  const exportQr = async (tag: RestaurantTag, format: 'svg' | 'png') => {
    const url = buildTagUrl(tag.code);
    try {
      if (format === 'svg') {
        const qrSvg = await QRCode.toString(url, { type: 'svg', width: 600, margin: 2, errorCorrectionLevel: 'H' });
        const viewBox = qrSvg.match(/viewBox="([^"]+)"/)?.[1];
        const matrix = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
        if (!viewBox || matrix === qrSvg) throw new Error('Format du QR SVG non reconnu.');
        const brandedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="660" viewBox="0 0 600 660"><rect width="600" height="660" fill="#fff"/><svg x="20" y="0" width="560" height="560" viewBox="${viewBox}">${matrix}</svg><text x="300" y="610" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#101512">DIGIFEEL</text><text x="300" y="640" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#303630">${tag.code}</text></svg>`;
        saveBlob(new Blob([brandedSvg], { type: 'image/svg+xml;charset=utf-8' }), `${tag.code}.svg`);
        return;
      }
      const qrData = await QRCode.toDataURL(url, { width: 560, margin: 2, errorCorrectionLevel: 'H' });
      const image = new Image();
      image.src = qrData;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Le QR n’a pas pu être chargé.')); });
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 650;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas indisponible pour générer le QR.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 20, 0, 560, 560);
      context.fillStyle = '#111713';
      context.textAlign = 'center';
      context.font = 'bold 22px Arial';
      context.fillText('DIGIFEEL', 300, 592);
      context.font = '16px Arial';
      context.fillText(tag.code, 300, 620);
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image QR non exportable.')), 'image/png'));
      saveBlob(png, `${tag.code}.png`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Le QR code n’a pas pu être créé.');
    }
  };

  const exportPrintablePdf = async () => {
    if (!data) return;
    setBusy(true);
    setError('');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const assigned = data.tags.filter(tag => tag.active);
      const columns = 3;
      const cellWidth = 63;
      const cellHeight = 67;
      for (let index = 0; index < assigned.length; index += 1) {
        const pageIndex = Math.floor(index / 12);
        const indexOnPage = index % 12;
        if (index > 0 && indexOnPage === 0) pdf.addPage();
        if (indexOnPage === 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(17);
          pdf.text('DIGIFEEL · Puces NFC & QR', 14, 14);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text(`Planches ${pageIndex + 1} · ${assigned.length} codes · ${selectDomain()}`, 14, 20);
        }
        const column = indexOnPage % columns;
        const row = Math.floor(indexOnPage / columns);
        const x = 10 + column * cellWidth;
        const y = 25 + row * cellHeight;
        const tag = assigned[index];
        const qr = await QRCode.toDataURL(buildTagUrl(tag.code), { width: 360, margin: 1, errorCorrectionLevel: 'H' });
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, 59, 63, 2, 2);
        pdf.addImage(qr, 'PNG', x + 9, y + 3, 41, 41);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('DIGIFEEL', x + 29.5, y + 48, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(tag.code, x + 29.5, y + 54, { align: 'center' });
        pdf.text(tag.restaurantId ? data.restaurants.find(item => item.id === tag.restaurantId)?.name ?? '' : 'À attribuer', x + 29.5, y + 59, { align: 'center', maxWidth: 55 });
      }
      pdf.save('digifeel-planches-puces.pdf');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Le PDF imprimable n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <main className="workspace-loading"><span className="pos-brand-mark"><KeyRound /></span><p>Digifeel Super-admin…</p></main>;
  if (error && !overview) return <main className="workspace-loading" role="alert"><CircleAlert /><p>{error}</p><Link href="/">{'Retour'}</Link></main>;

  const nav: Array<{ id: AdminTab; label: string; icon: typeof TrendingUp }> = [
    { id: 'overview', label: 'Vue générale', icon: TrendingUp },
    { id: 'restaurants', label: 'Restaurants', icon: Building2 },
    { id: 'chips', label: 'Puces & lots', icon: QrCode },
    { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
    { id: 'packs', label: 'Prix des packs', icon: Tags },
    { id: 'referrals', label: 'Parrainages', icon: Users },
    { id: 'starBonus', label: 'Étoiles & primes', icon: Star },
    { id: 'resellers', label: 'Revendeurs', icon: UserRound }
  ];

  return (
    <main className="restaurant-workspace super-admin-workspace">
      <aside className="workspace-sidebar">
        <Link href="/" className="workspace-logo"><span className="pos-brand-mark"><KeyRound /></span><span>DIGIFEEL<small>SUPER ADMIN</small></span></Link>
        <div className="workspace-admin-badge"><ShieldAlert size={16} />Prototype local · accès démo</div>
        <nav aria-label="Administration">{nav.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon size={18} />{label}</button>)}</nav>
        <div className="workspace-sidebar-bottom">
          <Link href="/app"><Users size={16} />Espace restaurant</Link>
          <Link href="/admin"><ShieldAlert size={16} />Administration sécurisée</Link>
          <Link href="/inscription"><Plus size={16} />Parcours inscription</Link>
          <Link href="/"><ArrowLeft size={16} />Retour au POS</Link>
          <p className="workspace-cert-note"><ShieldAlert size={14} />Les données sont locales à ce navigateur. Ne pas utiliser pour la gestion réelle de comptes.</p>
        </div>
      </aside>
      <section className="workspace-main">
        <header className="workspace-topbar"><div><span className="workspace-breadcrumb">Digifeel /</span><h1>Console super-admin</h1></div><div className="workspace-top-actions"><PwaInstallButton /><ThemePicker compact /><span className="workspace-demo-pill">SIMULATION</span><Link href="/" className="workspace-back-link"><ArrowLeft size={16} />Retour</Link></div></header>
        {(notice || error) && <div className={`workspace-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error ? <CircleAlert size={16} /> : <Check size={16} />}{error || notice}<button type="button" onClick={() => { setNotice(''); setError(''); }}>×</button></div>}
        <section className="workspace-content workspace-admin-content">
          <div className="workspace-section-title"><div><span className="workspace-eyebrow">Vue d’ensemble</span><h2>{nav.find(item => item.id === tab)?.label}</h2></div>{tab === 'chips' && <button type="button" className="workspace-primary-button" onClick={exportCsv}><Download size={16} />CSV des puces</button>}</div>

          {tab === 'overview' && overview && <><div className="workspace-stat-grid workspace-admin-stat-grid">
            <article className="workspace-stat workspace-stat--revenue"><span>Restaurants</span><strong>{overview.restaurants.length}</strong><small><Building2 size={14} />Tous les comptes</small></article>
            <article className="workspace-stat"><span>Puces actives</span><strong>{overview.tags.filter(tag => tag.active).length}</strong><small><QrCode size={14} />{overview.tags.length} au total</small></article>
            <article className="workspace-stat"><span>Scans enregistrés</span><strong>{overview.totalScans}</strong><small><TrendingUp size={14} />Tous les restaurants</small></article>
            <article className="workspace-stat workspace-stat--mint"><span>Paiements traités</span><strong>{formatAdminMoney(overview.totalPayments)}</strong><small><CreditCard size={14} />Simulation locale</small></article>
            <article className="workspace-stat workspace-stat--rating"><span>Pourboires traités</span><strong>{formatAdminMoney(overview.totalTips)}</strong><small>Enregistrés dans la démo</small></article>
          </div>
          <article className="workspace-panel workspace-admin-list"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Comptes</span><h3>Restaurants récents</h3></div><button type="button" className="workspace-primary-button" onClick={() => setTab('restaurants')}><Plus size={16} />Créer un compte</button></div>
            <div className="workspace-admin-table"><div><span>Restaurant</span><span>Ville</span><span>État</span><span>Puces</span><span>Abonnement</span></div>{overview.restaurants.map(restaurant => <div key={restaurant.id}><strong>{restaurant.name}</strong><span>{restaurant.city || '—'}</span><span>{restaurant.subscriptionStatus === 'trialing' ? 'Mois offert' : restaurant.subscriptionStatus === 'active' ? 'Actif' : 'Suspendu'}</span><span>{data?.tags.filter(tag => tag.restaurantId === restaurant.id).length ?? 0}</span><button type="button" onClick={() => { setTab('subscriptions'); }}>{restaurant.subscriptionStatus}</button></div>)}</div>
          </article></>}

          {tab === 'starBonus' && <StarBonusAdminPanel />}
          {tab === 'resellers' && <ResellerAdminPanel />}

          {tab === 'restaurants' && <div className="workspace-admin-columns">
            <form className="workspace-panel workspace-admin-form" onSubmit={submitRestaurant}><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Nouveau compte</span><h3>Créer un restaurant</h3></div><Building2 /></div>
              <label>Nom du restaurant<input required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Le Patio d’Alger" /></label>
              <label>Ville<input value={city} onChange={event => setCity(event.target.value)} placeholder="Alger" /></label>
              <label>Code revendeur (facultatif)<input value={resellerCode} maxLength={40} onChange={event => setResellerCode(event.target.value.toUpperCase())} placeholder="DGF-AGENT-…" /></label>
              <div className="workspace-form-row"><label>Devise<select value={currency} onChange={event => setCurrency(event.target.value as 'EUR' | 'DZD')}><option value="DZD">DZD · Algérie</option><option value="EUR">EUR · France</option></select></label><label>Pack d’installation<select value={pack} onChange={event => setPack(Number(event.target.value))}>{prices.map(price => <option key={price} value={price}>{formatAdminMoney(price, 'EUR')}</option>)}</select></label></div>
              <label>Mode de paiement (simulation)<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}><option value="simulation">Paiement de démonstration</option><option value="local_manual">Paiement local à valider</option></select></label>
              <button className="workspace-primary-button" type="submit" disabled={busy}><Plus size={17} />Créer · 1er mois offert</button><p className="workspace-muted">Le compte démo est créé localement. Aucun règlement réel n’est effectué.</p>
            </form>
            <article className="workspace-panel workspace-admin-list"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{data?.restaurants.length ?? 0} comptes</span><h3>Liste des restaurants</h3></div></div><div className="workspace-admin-restaurant-list">{data?.restaurants.map(restaurant => <div key={restaurant.id}><span className="workspace-restaurant-avatar">{restaurant.name.slice(0, 1)}</span><span><strong>{restaurant.name}</strong><small>{restaurant.city} · {restaurant.currency}</small></span><span className={`workspace-subscription-pill is-${restaurant.subscriptionStatus}`}>{restaurant.subscriptionStatus}</span></div>)}</div></article>
          </div>}

          {tab === 'chips' && <><div className="workspace-admin-columns">
            <form className="workspace-panel workspace-admin-form" onSubmit={generateBatch}><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Générateur</span><h3>Créer un lot de puces</h3></div><QrCode /></div><label>Nombre de codes (1–250)<input type="number" required min="1" max="250" value={chipCount} onChange={event => setChipCount(event.target.value)} /></label><p className="workspace-muted">Codes aléatoires non séquentiels. Génération locale de démonstration.</p><button type="submit" className="workspace-primary-button" disabled={busy}><Plus size={16} />Générer le lot</button></form>
            <article className="workspace-panel workspace-domain-panel"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">URL publique</span><h3>Domaine des QR codes</h3></div><QrCode /></div><label>Domaine à encoder<input value={domain} onChange={event => setDomain(event.target.value)} placeholder={typeof window === 'undefined' ? 'https://digifeel.app' : window.location.origin} /></label><p className="workspace-muted">Format exporté : {selectDomain()}/t/[code]</p><button type="button" onClick={() => void exportPrintablePdf()} disabled={busy || !data?.tags.length}><FileDown size={16} />Planches PDF imprimables</button></article>
          </div>
          <article className="workspace-panel workspace-admin-list"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{data?.tags.length ?? 0} puces</span><h3>Attribution aux tables</h3></div><button type="button" onClick={exportCsv}><Download size={16} />CSV</button></div><div className="workspace-admin-table workspace-tags-table"><div><span>Code</span><span>Restaurant / table</span><span>URL</span><span>QR</span><span>Attribution</span></div>{data?.tags.slice().reverse().map(tag => {
            const attachedTable = data.tables.find(table => table.id === tag.tableId);
            const attachmentOptions = data.tables.map(table => ({ table, restaurant: data.restaurants.find(restaurant => restaurant.id === table.restaurantId) })).filter(item => !tag.restaurantId || item.table.restaurantId === tag.restaurantId);
            return <div key={tag.code}><strong>{tag.code}</strong><span>{tag.restaurantId ? `${data.restaurants.find(restaurant => restaurant.id === tag.restaurantId)?.name ?? ''} · ${attachedTable?.name ?? 'Non attribuée'}` : 'Stock non attribué'}</span><a href={buildTagUrl(tag.code)} target="_blank" rel="noreferrer">{buildTagUrl(tag.code)}</a><span className="workspace-qr-actions"><button type="button" title="Télécharger PNG" onClick={() => void exportQr(tag, 'png')}>PNG</button><button type="button" title="Télécharger SVG" onClick={() => void exportQr(tag, 'svg')}>SVG</button></span><select aria-label={`Attribuer ${tag.code}`} value={tag.tableId ?? ''} onChange={event => event.target.value && void action(() => assignTagToTable(tag.code, event.target.value), 'Puce attribuée à la table.')}><option value="">Attribuer à une table</option>{attachmentOptions.map(({ table, restaurant }) => <option key={table.id} value={table.id}>{restaurant?.name} · {table.name}</option>)}</select></div>;
          })}</div></article></>}

          {tab === 'subscriptions' && data && <article className="workspace-panel workspace-admin-list"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Cycle mensuel</span><h3>État des abonnements</h3></div><CreditCard /></div><div className="workspace-admin-table workspace-subscriptions-table"><div><span>Restaurant</span><span>État</span><span>Fin du mois offert</span><span>Action</span></div>{data.restaurants.map(restaurant => <div key={restaurant.id}><strong>{restaurant.name}</strong><span className={`workspace-subscription-pill is-${restaurant.subscriptionStatus}`}>{restaurant.subscriptionStatus === 'trialing' ? 'Mois offert' : restaurant.subscriptionStatus === 'active' ? 'Actif' : 'Suspendu'}</span><span>{new Date(restaurant.trialEndsAt).toLocaleDateString('fr-FR')}</span><select aria-label={`Abonnement ${restaurant.name}`} value={restaurant.subscriptionStatus} onChange={event => void action(() => setSubscriptionStatus(restaurant.id, event.target.value as typeof restaurant.subscriptionStatus), 'Statut d’abonnement modifié.')}><option value="trialing">Premier mois offert</option><option value="active">Activer</option><option value="suspended">Suspendre</option></select></div>)}</div></article>}

          {tab === 'packs' && <form className="workspace-panel workspace-pack-prices" onSubmit={savePrices}><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Offres d’installation</span><h3>Tarifs modifiables</h3></div><Tags /></div><p className="workspace-muted">Tarifs indicatifs du pack d’installation. Le premier mois d’abonnement est offert.</p><div className="workspace-pack-grid">{prices.map((price, index) => <label key={index}><span>Pack {index + 1}</span><div><input type="number" min="0" value={price} onChange={event => setPrices(current => current.map((item, itemIndex) => itemIndex === index ? Number(event.target.value) : item))} /><b>EUR</b></div></label>)}</div><button type="submit" className="workspace-primary-button" disabled={busy}>Enregistrer les tarifs</button></form>}
          {tab === 'referrals' && data && <article className="workspace-panel workspace-admin-list"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">Réseau Digifeel</span><h3>Parrainages récompensés · {data.referrals.length}</h3></div><Users /></div>{data.referrals.length === 0 ? <p className="workspace-muted">Aucun parrainage confirmé. Les parrainages validés apparaîtront ici.</p> : <div className="workspace-admin-table"><div><span>Restaurant parrain</span><span>Code</span><span>Nouveau restaurant</span><span>État</span><span>Date</span></div>{data.referrals.map(referral => <div key={referral.id}><strong>{data.restaurants.find(item => item.id === referral.referrerRestaurantId)?.name ?? 'Compte supprimé'}</strong><span>{referral.code}</span><span>{data.restaurants.find(item => item.id === referral.referredRestaurantId)?.name ?? 'Compte supprimé'}</span><span>{referral.status === 'rewarded' ? 'Récompensé' : referral.status}</span><span>{new Date(referral.rewardedAt).toLocaleDateString('fr-FR')}</span></div>)}</div>}</article>}
        </section>
      </section>
      <nav className="workspace-mobile-nav" aria-label="Administration">{nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      {busy && <div className="workspace-busy-indicator" role="status">Enregistrement…</div>}
    </main>
  );
}
