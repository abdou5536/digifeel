'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowLeft, BadgeCheck, BarChart3, Gift, RefreshCw, ShieldCheck, Store, Wallet
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  getDashboardData, getRestaurantActivity, getRestaurantData, getSelectedRestaurantId,
  redeemLoyaltyReward, subscribeRestaurantData, updateLoyaltySettings, updateRestaurant, updateTipMode, validateManualTip,
  type RestaurantAccount, type RestaurantActivity, type RestaurantData
} from '@/src/services/restaurant';
import { ThemePicker } from './ThemePicker';

type ToolPage = 'analysis' | 'loyalty' | 'tips' | 'journal' | 'locations';
type Dashboard = NonNullable<Awaited<ReturnType<typeof getDashboardData>>>;
type Locale = 'fr' | 'ar' | 'en';

const criteriaNames: Record<Locale, Record<'dish' | 'service' | 'ambiance' | 'cleanliness', string>> = {
  fr: { dish: 'Cuisine', service: 'Service', ambiance: 'Ambiance', cleanliness: 'Propreté' },
  ar: { dish: 'الطعام', service: 'الخدمة', ambiance: 'الأجواء', cleanliness: 'النظافة' },
  en: { dish: 'Food', service: 'Service', ambiance: 'Atmosphere', cleanliness: 'Cleanliness' }
};

const titles: Record<ToolPage, Record<Locale, string>> = {
  analysis: { fr: 'Analyse des avis', ar: 'تحليل التقييمات', en: 'Review analysis' },
  loyalty: { fr: 'Fidélité', ar: 'الولاء', en: 'Loyalty' },
  tips: { fr: 'Répartition des pourboires', ar: 'توزيع الإكراميات', en: 'Tip distribution' },
  journal: { fr: 'Journal d’activité', ar: 'سجل النشاط', en: 'Activity log' },
  locations: { fr: 'Vos établissements', ar: 'فروعك', en: 'Your locations' }
};

const labels = {
  fr: {
    back: 'Retour à l’espace restaurant', period: 'Période', last7: '7 derniers jours', last30: '30 derniers jours', last90: '90 derniers jours',
    filterTable: 'Table', filterWaiter: 'Serveur', filterTag: 'Puce', all: 'Tous', noReviews: 'Aucun avis pour ces filtres.',
    ratings: 'Avis reçus', average: 'Note moyenne', trend: 'Évolution des avis', criteria: 'Détail par critère', enable: 'Programme actif',
    points: 'Points par visite', rewards: 'Récompenses', rewardName: 'Nom de la récompense', rewardPoints: 'Points nécessaires',
    addReward: 'Ajouter une récompense', customers: 'Clients fidélité', noCustomers: 'Aucun client fidélité pour le moment.',
    balance: 'Solde', visits: 'visites', redeem: 'Échanger', saved: 'Modifications enregistrées.', pool: 'Pot commun',
    individual: 'Pourboires individuels', pooled: 'Pourboires mutualisés', distribution: 'Répartition indicative par serveur',
    alertDelay: 'Seuil d’alerte (minutes)', save: 'Enregistrer', none: 'Aucune activité enregistrée.',
    revenue: 'Chiffre d’affaires', scans: 'Scans', reviews: 'Avis', tips: 'Pourboires', restaurants: 'établissements',
    allLocations: 'Vue consolidée du groupe', open: 'Ouvrir', demo: 'Données locales de démonstration',
    pendingTips: 'Pourboires à vérifier', confirmTip: 'Confirmer après vérification manuelle', delayedTipAlert: 'Un règlement local attend une vérification au-delà du délai défini.'
  },
  ar: {
    back: 'العودة إلى مساحة المطعم', period: 'الفترة', last7: 'آخر 7 أيام', last30: 'آخر 30 يوماً', last90: 'آخر 90 يوماً',
    filterTable: 'الطاولة', filterWaiter: 'النادل', filterTag: 'الشريحة', all: 'الكل', noReviews: 'لا توجد تقييمات بهذه الفلاتر.',
    ratings: 'التقييمات', average: 'متوسط التقييم', trend: 'تطور التقييمات', criteria: 'حسب المعيار', enable: 'البرنامج نشط',
    points: 'نقاط لكل زيارة', rewards: 'المكافآت', rewardName: 'اسم المكافأة', rewardPoints: 'النقاط المطلوبة',
    addReward: 'إضافة مكافأة', customers: 'عملاء الولاء', noCustomers: 'لا يوجد عملاء مسجلون بعد.',
    balance: 'الرصيد', visits: 'زيارات', redeem: 'استبدال', saved: 'تم حفظ التغييرات.', pool: 'الصندوق المشترك',
    individual: 'إكراميات فردية', pooled: 'إكراميات مشتركة', distribution: 'توزيع تقديري حسب النادل',
    alertDelay: 'مدة التنبيه (دقائق)', save: 'حفظ', none: 'لا يوجد نشاط مسجل.',
    revenue: 'رقم الأعمال', scans: 'المسح', reviews: 'التقييمات', tips: 'الإكراميات', restaurants: 'مطاعم',
    allLocations: 'عرض موحد للمجموعة', open: 'فتح', demo: 'بيانات محلية تجريبية',
    pendingTips: 'إكراميات بانتظار التحقق', confirmTip: 'تأكيد بعد التحقق اليدوي', delayedTipAlert: 'يوجد دفع محلي ينتظر التحقق بعد انتهاء المهلة المحددة.'
  },
  en: {
    back: 'Back to restaurant workspace', period: 'Period', last7: 'Last 7 days', last30: 'Last 30 days', last90: 'Last 90 days',
    filterTable: 'Table', filterWaiter: 'Server', filterTag: 'Tag', all: 'All', noReviews: 'No reviews match these filters.',
    ratings: 'Reviews received', average: 'Average rating', trend: 'Review trends', criteria: 'By criterion', enable: 'Program active',
    points: 'Points per visit', rewards: 'Rewards', rewardName: 'Reward name', rewardPoints: 'Points required',
    addReward: 'Add reward', customers: 'Loyalty customers', noCustomers: 'No loyalty customers yet.',
    balance: 'Balance', visits: 'visits', redeem: 'Redeem', saved: 'Changes saved.', pool: 'Shared pool',
    individual: 'Individual tips', pooled: 'Pooled tips', distribution: 'Indicative distribution per server',
    alertDelay: 'Alert threshold (minutes)', save: 'Save', none: 'No activity recorded.',
    revenue: 'Revenue', scans: 'Scans', reviews: 'Reviews', tips: 'Tips', restaurants: 'locations',
    allLocations: 'Consolidated group view', open: 'Open', demo: 'Local demo data',
    pendingTips: 'Tips awaiting review', confirmTip: 'Confirm after manual verification', delayedTipAlert: 'A local payment has been waiting longer than the configured threshold.'
  }
};

function amount(value: number, currency: 'EUR' | 'DZD', locale: Locale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR', { style: 'currency', currency, maximumFractionDigits: currency === 'DZD' ? 0 : 2 }).format(value);
}

function withinPeriod(date: string, days: number) {
  return Date.now() - new Date(date).getTime() <= days * 86400000;
}

export function RestaurantTools({ page }: { page: ToolPage }) {
  const [locale, setLocale] = useState<Locale>('fr');
  useEffect(() => {
    const stored = window.localStorage.getItem('digifeel-app-locale');
    if (stored === 'fr' || stored === 'ar' || stored === 'en') setLocale(stored);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem('digifeel-app-locale', locale);
  }, [locale]);
  const t = labels[locale];
  const rtl = locale === 'ar';
  const [data, setData] = useState<RestaurantData | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantAccount | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<RestaurantActivity[]>([]);
  const [days, setDays] = useState(30);
  const [waiterFilter, setWaiterFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [rewardName, setRewardName] = useState('');
  const [rewardPoints, setRewardPoints] = useState('100');
  const [pointsPerVisit, setPointsPerVisit] = useState('10');
  const [tipAlertMinutes, setTipAlertMinutes] = useState('15');

  const refresh = useCallback(async () => {
    const next = await getRestaurantData();
    const selectedId = await getSelectedRestaurantId();
    const selected = next.restaurants.find(item => item.id === selectedId) ?? next.restaurants[0] ?? null;
    setData(next);
    setRestaurant(selected);
    setDashboard(selected ? await getDashboardData(selected.id) : null);
    setActivity(selected ? await getRestaurantActivity(selected.id) : []);
    if (selected) {
      setPointsPerVisit(String(selected.loyalty?.pointsPerVisit ?? 10));
      setTipAlertMinutes(String(selected.tipAlertMinutes ?? 15));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeRestaurantData(() => { void refresh(); });
    return unsubscribe;
  }, [refresh]);

  const groupRestaurants = useMemo(() => data?.restaurants.filter(item => item.ownerGroupId === restaurant?.ownerGroupId) ?? [], [data, restaurant]);
  const groupIds = new Set(groupRestaurants.map(item => item.id));
  const selectedReviews = useMemo(() => {
    if (!data) return [];
    return data.reviews.filter(review => groupIds.has(review.restaurantId) && withinPeriod(review.createdAt, days) &&
      (waiterFilter === 'all' || review.waiterId === waiterFilter) &&
      (tableFilter === 'all' || review.tableId === tableFilter) &&
      (tagFilter === 'all' || data.tables.find(table => table.id === review.tableId)?.tagCode === tagFilter));
  }, [data, days, waiterFilter, tableFilter, tagFilter, groupIds]);

  const groupRollup = useMemo(() => {
    if (!data) return [];
    return groupRestaurants.map(location => {
      const locationDashboard = dashboard?.restaurant.id === location.id ? dashboard : null;
      const payments = data.payments.filter(payment => payment.restaurantId === location.id && payment.status === 'paid');
      const bills = data.bills.filter(bill => bill.restaurantId === location.id && !bill.reviewOnly);
      const reviews = data.reviews.filter(review => review.restaurantId === location.id);
      const scans = data.scans.filter(scan => scan.restaurantId === location.id);
      const tips = data.tips.filter(tip => tip.restaurantId === location.id && tip.status === 'paid');
      return {
        restaurant: location, revenue: locationDashboard?.totalRevenue ?? payments.reduce((sum, payment) => sum + payment.amount, 0),
        scans: scans.length, reviews: reviews.length, rating: reviews.length ? reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length : 0,
        tips: tips.reduce((sum, tip) => sum + tip.amount, 0),
        bills: bills.length
      };
    });
  }, [data, groupRestaurants, dashboard]);

  const filteredAverage = selectedReviews.length ? selectedReviews.reduce((sum, review) => sum + review.stars, 0) / selectedReviews.length : 0;
  const bucketDays = days === 90 ? 7 : 1;
  const bucketCount = days === 90 ? 13 : days;
  const trend = Array.from({ length: bucketCount }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (bucketCount - 1 - offset) * bucketDays);
    date.setHours(0, 0, 0, 0);
    const bucketEnd = new Date(date);
    bucketEnd.setDate(bucketEnd.getDate() + bucketDays);
    const entries = selectedReviews.filter(review => {
      const createdAt = new Date(review.createdAt);
      return createdAt >= date && createdAt < bucketEnd;
    });
    return { label: date.toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit' }), avis: entries.length, note: entries.length ? entries.reduce((sum, review) => sum + review.stars, 0) / entries.length : 0 };
  });
  const criteriaAverages = (['dish', 'service', 'ambiance', 'cleanliness'] as const).map(key => {
    const values = selectedReviews.map(review => review.criteria?.[key]).filter((value): value is number => typeof value === 'number');
    return { key, value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 };
  });
  const groupTips = data?.tips.filter(tip => tip.restaurantId === restaurant?.id && tip.status === 'paid') ?? [];
  const tipsAwaiting = data?.tips.filter(tip => tip.restaurantId === restaurant?.id && tip.status !== 'paid') ?? [];
  const delayedTips = tipsAwaiting.filter(tip => Date.now() - new Date(tip.createdAt).getTime() >= Number(tipAlertMinutes) * 60000);
  const poolTotal = groupTips.filter(tip => tip.pooled).reduce((sum, tip) => sum + tip.amount, 0);
  const activeWaiters = data?.users.filter(user => user.restaurantId === restaurant?.id && user.role === 'serveur' && user.active) ?? [];
  const accounts = data?.loyaltyAccounts.filter(account => account.restaurantId === restaurant?.id) ?? [];

  const run = async (action: () => Promise<unknown>, success = t.saved) => {
    setBusy(true);
    setNotice('');
    setError('');
    try { await action(); setNotice(success); await refresh(); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Une erreur est survenue.'); }
    finally { setBusy(false); }
  };

  const addReward = async (event: FormEvent) => {
    event.preventDefault();
    if (!restaurant || !rewardName.trim() || Number(rewardPoints) < 1) return;
    const rewards = [...(restaurant.loyalty?.rewards ?? []), { id: crypto.randomUUID(), label: rewardName.trim(), points: Number(rewardPoints) }];
    await run(() => updateLoyaltySettings(restaurant.id, { enabled: true, pointsPerVisit: Number(pointsPerVisit), rewards }));
    setRewardName('');
  };

  const pageTitle = titles[page][locale];
  if (!data || !restaurant || !dashboard) return <main className="workspace-loading"><RefreshCw /><p>Chargement…</p></main>;

  return <main className={`restaurant-tools ${rtl ? 'is-rtl' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
    <header className="tools-header"><Link href="/app" className="tools-back"><ArrowLeft size={16} />{t.back}</Link><div><span>DIGIFEEL · {restaurant.name}</span><h1>{pageTitle}</h1></div><ThemePicker locale={locale} compact /><button type="button" className="tools-language" onClick={() => setLocale(current => current === 'fr' ? 'ar' : current === 'ar' ? 'en' : 'fr')}>{locale === 'fr' ? 'العربية' : locale === 'ar' ? 'EN' : 'FR'}</button><span className="tools-demo-mark"><Activity size={14} />{t.demo}</span></header>
    {(notice || error) && <p className={`tools-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</p>}

    {page === 'analysis' && <section className="tools-content">
      <div className="tools-filter-row"><label>{t.period}<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>{t.last7}</option><option value={30}>{t.last30}</option><option value={90}>{t.last90}</option></select></label><label>{t.filterWaiter}<select value={waiterFilter} onChange={event => setWaiterFilter(event.target.value)}><option value="all">{t.all}</option>{data.users.filter(user => user.role === 'serveur' && groupIds.has(user.restaurantId)).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label>{t.filterTable}<select value={tableFilter} onChange={event => setTableFilter(event.target.value)}><option value="all">{t.all}</option>{data.tables.filter(table => groupIds.has(table.restaurantId)).map(table => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label><label>{t.filterTag}<select value={tagFilter} onChange={event => setTagFilter(event.target.value)}><option value="all">{t.all}</option>{data.tags.filter(tag => tag.active && groupIds.has(tag.restaurantId ?? '')).map(tag => <option key={tag.code} value={tag.code}>{tag.code}</option>)}</select></label></div>
      <div className="tools-stat-row"><article><span>{t.ratings}</span><strong>{selectedReviews.length}</strong></article><article><span>{t.average}</span><strong>{filteredAverage.toFixed(1)}<small> / 5</small></strong></article><article><span>{t.reviews}</span><strong>{selectedReviews.filter(review => review.stars <= 2).length}<small> ≤ 2 ★</small></strong></article></div>
      <div className="tools-grid"><article className="workspace-panel tools-chart"><h2>{t.trend}</h2><ResponsiveContainer width="100%" height={280}><BarChart data={trend}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#929a94', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#929a94', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#141a17', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#f4f1e9' }} /><Bar dataKey="avis" fill="#c99445" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></article><article className="workspace-panel tools-criteria"><h2>{t.criteria}</h2>{criteriaAverages.map(item => <div key={item.key}><span>{criteriaNames[locale][item.key]}</span><strong>{item.value ? item.value.toFixed(1) : '—'} / 5</strong><i><b style={{ width: `${item.value * 20}%` }} /></i></div>)}</article></div>
      <div className="workspace-panel tools-reviews"><h2>{t.reviews} · {selectedReviews.length}</h2>{selectedReviews.slice(0, 30).map(review => <article key={review.id}><strong>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</strong><span>{review.comment || '—'}</span><small>{data.restaurants.find(item => item.id === review.restaurantId)?.name} · {data.users.find(user => user.id === review.waiterId)?.name ?? '—'} · {data.tables.find(table => table.id === review.tableId)?.name}</small></article>)}{selectedReviews.length === 0 && <p>{t.noReviews}</p>}</div>
    </section>}

    {page === 'loyalty' && <section className="tools-content">
      <div className="workspace-panel tools-loyalty-settings"><div><span className="workspace-eyebrow">{restaurant.name}</span><h2>{t.rewards}</h2></div><label className="tools-toggle"><input type="checkbox" checked={restaurant.loyalty?.enabled ?? false} onChange={event => void run(() => updateLoyaltySettings(restaurant.id, { enabled: event.target.checked, pointsPerVisit: Number(pointsPerVisit), rewards: restaurant.loyalty?.rewards ?? [] }))} />{t.enable}</label><label>{t.points}<input type="number" min="1" max="10000" value={pointsPerVisit} onChange={event => setPointsPerVisit(event.target.value)} /></label><button type="button" className="workspace-primary-button" disabled={busy || Number(pointsPerVisit) < 1} onClick={() => void run(() => updateLoyaltySettings(restaurant.id, { enabled: restaurant.loyalty?.enabled ?? false, pointsPerVisit: Number(pointsPerVisit), rewards: restaurant.loyalty?.rewards ?? [] }))}>{t.save}</button>
        <form className="tools-reward-form" onSubmit={event => void addReward(event)}><input aria-label={t.rewardName} placeholder={t.rewardName} value={rewardName} maxLength={80} onChange={event => setRewardName(event.target.value)} required /><input aria-label={t.rewardPoints} type="number" min="1" max="100000" value={rewardPoints} onChange={event => setRewardPoints(event.target.value)} required /><button type="submit" disabled={busy}><Gift size={15} />{t.addReward}</button></form>
        <div className="tools-reward-list">{(restaurant.loyalty?.rewards ?? []).map(reward => <span key={reward.id}>{reward.label}<b>{reward.points} pts</b></span>)}</div>
      </div>
      <div className="workspace-panel tools-reviews"><h2>{t.customers} · {accounts.length}</h2>{accounts.length ? accounts.map(account => <article key={account.id}><strong>{account.name}</strong><span>{t.balance} · {account.points} pts · {account.visits} {t.visits}</span><small>{account.contact} · {new Date(account.updatedAt).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR')}</small><div className="tools-redeem-actions">{(restaurant.loyalty?.rewards ?? []).filter(reward => account.points >= reward.points).map(reward => <button type="button" key={reward.id} disabled={busy} onClick={() => void run(() => redeemLoyaltyReward(account.id, reward.id), t.saved)}>{t.redeem} · {reward.label}</button>)}</div></article>) : <p>{t.noCustomers}</p>}</div>
    </section>}

    {page === 'tips' && <section className="tools-content"><div className="tools-stat-row"><article><span>{t.tips}</span><strong>{amount(dashboard.tipsTotal, restaurant.currency, locale)}</strong></article><article><span>{t.pooled}</span><strong>{amount(poolTotal, restaurant.currency, locale)}</strong></article><article><span>{t.individual}</span><strong>{amount(Math.max(0, dashboard.tipsTotal - poolTotal), restaurant.currency, locale)}</strong></article></div>{delayedTips.length > 0 && <p className="tools-tip-warning" role="alert">{delayedTips.length} · {t.delayedTipAlert}</p>}<div className="workspace-panel tools-tip-settings"><div><span className="workspace-eyebrow">{restaurant.name}</span><h2>{t.distribution}</h2></div><label className="tools-toggle"><input type="radio" name="tip-mode" checked={restaurant.tipMode !== 'pool'} onChange={() => void run(() => updateTipMode(restaurant.id, 'individual'))} />{t.individual}</label><label className="tools-toggle"><input type="radio" name="tip-mode" checked={restaurant.tipMode === 'pool'} onChange={() => void run(() => updateTipMode(restaurant.id, 'pool'))} />{t.pool}</label><label>{t.alertDelay}<input type="number" min="1" max="240" value={tipAlertMinutes} onChange={event => setTipAlertMinutes(event.target.value)} /></label><button type="button" className="workspace-primary-button" disabled={busy || Number(tipAlertMinutes) < 1} onClick={() => void run(() => updateRestaurant(restaurant.id, { tipAlertMinutes: Number(tipAlertMinutes) }))}>{t.save}</button></div><div className="tools-tip-list">{dashboard.byWaiter.map(waiter => <article key={waiter.id}><span className="tools-waiter-avatar">{waiter.name.slice(0, 1)}</span><div><strong>{waiter.name}</strong><small>{waiter.reviews} {t.reviews}</small></div><b>{amount(waiter.tips, restaurant.currency, locale)}</b></article>)}</div>{tipsAwaiting.length > 0 && <article className="workspace-panel tools-reviews"><h2>{t.pendingTips} · {tipsAwaiting.length}</h2>{tipsAwaiting.map(tip => <article key={tip.id}><strong>{amount(tip.amount, tip.currency, locale)}</strong><span>{data.users.find(user => user.id === tip.waiterId)?.name ?? '—'} · {tip.status}</span><small>{new Date(tip.createdAt).toLocaleString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR')}</small><button type="button" className="workspace-review-action" disabled={busy} onClick={() => void run(() => validateManualTip(tip.id), t.saved)}>{t.confirmTip}</button></article>)}</article>}</section>}

    {page === 'journal' && <section className="tools-content"><div className="tools-journal-list">{activity.length ? activity.map(entry => <article key={entry.id}><span className="tools-journal-icon"><Activity size={15} /></span><div><strong>{entry.actorName || 'Équipe'} {entry.action}</strong><small>{entry.entity} · {entry.entityId}</small></div><time>{new Date(entry.createdAt).toLocaleString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR')}</time></article>) : <div className="workspace-panel"><p>{t.none}</p></div>}</div></section>}

    {page === 'locations' && <section className="tools-content"><div className="workspace-panel tools-group-heading"><div><span className="workspace-eyebrow">{restaurant.ownerGroupId ?? restaurant.name}</span><h2>{t.allLocations}</h2></div><span>{groupRestaurants.length} {t.restaurants}</span></div><div className="tools-location-grid">{groupRollup.map(item => <article className="workspace-panel" key={item.restaurant.id}><span className="tools-location-icon"><Store /></span><h3>{item.restaurant.name}</h3><small>{item.restaurant.city}</small><div className="tools-location-stats"><span>{t.revenue}<b>{amount(item.revenue, item.restaurant.currency, locale)}</b></span><span>{t.scans}<b>{item.scans}</b></span><span>{t.reviews}<b>{item.reviews} · {item.rating.toFixed(1)} ★</b></span><span>{t.tips}<b>{amount(item.tips, item.restaurant.currency, locale)}</b></span></div><Link href={`/app?restaurant=${encodeURIComponent(item.restaurant.id)}`}><BarChart3 size={15} />{t.open}</Link></article>)}</div></section>}
    <footer className="tools-footer"><ShieldCheck size={15} />Prototype local : les données restent dans ce navigateur.</footer>
  </main>;
}
