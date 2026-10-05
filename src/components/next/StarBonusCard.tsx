'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeEuro, ExternalLink, RefreshCw, Star } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { addGoogleRatingSnapshot, getStarBonusSummary, subscribeRestaurantData, type RestaurantAccount } from '@/src/services/restaurant';
import type { Locale } from '@/src/lib/i18n/messages';

const copy = {
  fr: {
    title: 'Ma note Google', baseline: 'Départ', current: 'Actuelle', change: 'Évolution', next: 'Prochain palier',
    reward: 'Prime estimée ce mois', update: 'Actualiser via Google', manualTitle: 'Saisie manuelle',
    rating: 'Note sur 5', count: 'Nombre d’avis', save: 'Enregistrer le relevé', loading: 'Chargement du suivi…',
    noBaseline: 'La note de départ doit être enregistrée par le super-admin.', noRating: 'Aucun relevé actuel. Saisissez-le manuellement ou actualisez Google.',
    noNext: 'Tous les paliers actifs sont atteints.', pending: 'Calcul à confirmer à la clôture du mois.',
    blocked: 'Prime suspendue : une anomalie doit être vérifiée par Digifeel.',
    changed: 'Le lien Google a changé. Contactez le super-admin pour contrôler la note de départ.',
    terms: 'Conditions de la prime', conditions: 'La note de départ est fixée par le super-admin à la date d’activation. La prime dépend uniquement d’une hausse de la note Google observée et maintenue en fin de mois, après la période minimale. Un palier n’est facturé qu’une fois, selon le mode et le plafond configurés. Exemple : avec une note de départ de 3,8, une note de clôture à 4,4 représente +0,6 ; le palier +0,5 peut être retenu si les contrôles sont satisfaits. Les avis doivent être authentiques et spontanés. Aucun avantage ne doit être offert en échange d’un avis Google. Tous les clients sont invités de la même manière, quelle que soit leur note.',
    inaccessible: 'Inaccessible avec une note maximale de 5,0',
    error: 'La mise à jour a échoué.', updated: 'Note Google mise à jour.', missingLink: 'Ajoutez d’abord le lien Google Avis dans Gestion.',
    source: 'Source', demo: 'Démo'
  },
  ar: {
    title: 'تقييمي على Google', baseline: 'عند البداية', current: 'حالياً', change: 'التطور', next: 'المستوى التالي',
    reward: 'المكافأة التقديرية هذا الشهر', update: 'تحديث من Google', manualTitle: 'إدخال يدوي',
    rating: 'التقييم من 5', count: 'عدد التقييمات', save: 'حفظ القراءة', loading: 'جارٍ تحميل المتابعة…',
    noBaseline: 'يجب على المشرف العام تسجيل تقييم البداية.', noRating: 'لا توجد قراءة حالية. أدخلها يدوياً أو حدّثها من Google.',
    noNext: 'تم بلوغ جميع المستويات المتاحة.', pending: 'يتم تأكيد الحساب عند إغلاق الشهر.',
    blocked: 'المكافأة معلّقة حتى يتحقق Digifeel من التنبيه.',
    changed: 'تم تغيير رابط Google. تواصل مع المشرف للتحقق من تقييم البداية.',
    terms: 'شروط المكافأة', conditions: 'يحدد المشرف العام تقييم البداية عند التفعيل. تعتمد المكافأة فقط على ارتفاع تقييم Google واستمراره عند نهاية الشهر بعد فترة الرصد الدنيا. تتم فوترة كل مستوى مرة واحدة وفق النمط والسقف المحددين. مثال: تقييم بداية 3.8 وإغلاق عند 4.4 يعني ارتفاعاً قدره 0.6؛ يمكن اعتماد مستوى +0.5 بعد استيفاء الشروط. يجب أن تكون الآراء حقيقية وعفوية. لا يجوز تقديم أي ميزة مقابل رأي على Google. تتم دعوة جميع الزبائن بالطريقة نفسها مهما كان تقييمهم.',
    inaccessible: 'غير ممكن بلوغه حتى مع تقييم 5.0',
    error: 'تعذر تحديث القراءة.', updated: 'تم تحديث تقييم Google.', missingLink: 'أضف رابط تقييم Google من صفحة الإدارة أولاً.',
    source: 'المصدر', demo: 'عرض'
  },
  en: {
    title: 'My Google rating', baseline: 'Baseline', current: 'Current', change: 'Change', next: 'Next tier',
    reward: 'Estimated bonus this month', update: 'Refresh from Google', manualTitle: 'Manual entry',
    rating: 'Rating out of 5', count: 'Review count', save: 'Save reading', loading: 'Loading rating history…',
    noBaseline: 'The baseline must be set by the super-admin.', noRating: 'No current reading. Enter it manually or refresh Google.',
    noNext: 'All active tiers have been reached.', pending: 'Final calculation is confirmed at month end.',
    blocked: 'Bonus paused: a Digifeel anomaly review is required.',
    changed: 'The Google link changed. Ask the super-admin to verify the baseline.',
    terms: 'Bonus terms', conditions: 'The super-admin sets the baseline at activation. A bonus depends only on a Google rating increase maintained at month end after the minimum observation period. Each tier is invoiced once, subject to the configured mode and cap. Example: a 3.8 baseline and a 4.4 closing rating is a +0.6 increase; the +0.5 tier may qualify if checks pass. Reviews must be genuine and spontaneous. Never offer an incentive in exchange for a Google review. Every guest is invited in the same way, whatever their rating.',
    inaccessible: 'Unreachable even with a 5.0 rating',
    error: 'The rating update failed.', updated: 'Google rating updated.', missingLink: 'Add the Google review link in Management first.',
    source: 'Source', demo: 'Demo'
  }
};

function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export function StarBonusCard({ restaurant, locale }: { restaurant: RestaurantAccount; locale: Locale }) {
  const t = copy[locale];
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getStarBonusSummary>> | null>(null);
  const [rating, setRating] = useState('');
  const [reviewCount, setReviewCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => setSummary(await getStarBonusSummary(restaurant.id)), [restaurant.id]);
  useEffect(() => {
    void refresh().catch(reason => setError(reason instanceof Error ? reason.message : t.error));
    return subscribeRestaurantData(() => { void refresh().catch(reason => setError(reason instanceof Error ? reason.message : t.error)); });
  }, [refresh, t.error]);

  const refreshGoogle = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!restaurant.googleReviewUrl) throw new Error(t.missingLink);
      const response = await fetch('/api/google-places/rating', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id, restaurantName: restaurant.name, city: restaurant.city, googleReviewUrl: restaurant.googleReviewUrl })
      });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== 'object') throw new Error(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : t.error);
      const result = payload as { rating: number; reviewCount: number };
      await addGoogleRatingSnapshot({ restaurantId: restaurant.id, rating: result.rating, reviewCount: result.reviewCount, source: 'google_places' }, 'admin_restaurant');
      await refresh();
      setNotice(t.updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  const saveManual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await addGoogleRatingSnapshot({ restaurantId: restaurant.id, rating: Number(rating), reviewCount: Number(reviewCount), source: 'manual' }, 'admin_restaurant');
      await refresh();
      setNotice(t.updated);
      setRating('');
      setReviewCount('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  if (!summary) return <article className="workspace-panel star-bonus-card" aria-busy="true"><p>{t.loading}</p></article>;

  const chartData = summary.snapshots.map(snapshot => ({
    label: new Date(snapshot.observedAt).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR', { month: 'short', year: '2-digit' }),
    rating: snapshot.rating
  }));
  const nextUp = summary.increase !== null && summary.nextTier ? Math.max(0, summary.nextTier.increase - summary.increase) : null;

  return <article className="workspace-panel star-bonus-card" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.source} · Google Places / saisie manuelle</span><h3><Star size={18} fill="currentColor" />{t.title}</h3></div><button type="button" className="star-refresh" onClick={() => void refreshGoogle()} disabled={busy}><RefreshCw size={15} />{t.update}</button></div>
    {summary.blocked && <p className="star-alert" role="alert"><AlertTriangle size={16} />{t.blocked}</p>}
    {summary.linkChanged && <p className="star-alert" role="status">{t.changed}</p>}
    <div className="star-metrics">
      <div><span>{t.baseline}</span><strong>{summary.baseline?.rating === null || summary.baseline?.rating === undefined ? '—' : `${summary.baseline.rating.toFixed(1)} / 5`}</strong><small>{summary.baseline?.reviewCount ?? '—'} avis</small></div>
      <div><span>{t.current}</span><strong>{summary.latest ? `${summary.latest.rating.toFixed(1)} / 5` : '—'}</strong><small>{summary.latest ? `${summary.latest.reviewCount} avis` : t.noRating}</small></div>
      <div><span>{t.change}</span><strong className={summary.increase !== null && summary.increase > 0 ? 'is-positive' : ''}>{summary.increase === null ? '—' : `${summary.increase > 0 ? '+' : ''}${summary.increase.toFixed(1)}`}</strong><small>{summary.latest?.source === 'demo' ? t.demo : summary.latest?.source === 'manual' ? t.manualTitle : 'Google Places'}</small></div>
      <div><span>{t.next}</span><strong>{summary.nextTier ? money(summary.nextTier.amountEUR, locale) : '—'}</strong><small>{summary.nextTier ? `+${summary.nextTier.increase.toFixed(1)} · ${nextUp?.toFixed(1)} ${locale === 'ar' ? 'نجمة متبقية' : locale === 'en' ? 'to go' : 'à gagner'}` : t.noNext}</small></div>
    </div>
    {summary.currentEstimate.eligible
      ? <p className="star-estimate"><BadgeEuro size={18} />{t.reward}: <strong>{money(summary.currentEstimate.bonusEUR, locale)}</strong><small>{t.pending}</small></p>
      : <p className="star-estimate"><BadgeEuro size={18} />{t.reward}: <strong>{money(0, locale)}</strong><small>{summary.currentEstimate.reason || t.pending}</small></p>}
    {summary.inaccessibleTiers.length > 0 && <p className="star-unreachable">{t.inaccessible}: {summary.inaccessibleTiers.map(tier => `+${tier.increase.toFixed(1)}`).join(', ')}</p>}
    {chartData.length > 1 && <div className="star-chart" role="img" aria-label={t.title}>
      <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 2 }}>
        <CartesianGrid stroke="var(--df-border)" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: 'var(--df-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: 'var(--df-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: 'var(--df-surface-raised)', border: '1px solid var(--df-border)', borderRadius: 10, color: 'var(--df-text)' }} />
        <Line type="monotone" dataKey="rating" name={t.current} stroke="var(--df-accent)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart></ResponsiveContainer>
    </div>}
    <form className="star-manual-form" onSubmit={saveManual}>
      <strong>{t.manualTitle}</strong>
      <label>{t.rating}<input type="number" min="0" max="5" step="0.1" required value={rating} onChange={event => setRating(event.target.value)} /></label>
      <label>{t.count}<input type="number" min="0" step="1" required value={reviewCount} onChange={event => setReviewCount(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{t.save}</button>
    </form>
    {(error || notice) && <p className={error ? 'star-alert' : 'star-notice'} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    {restaurant.googleReviewUrl && <a className="star-google-link" href={restaurant.googleReviewUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />Google Avis</a>}
    <details className="star-terms"><summary>{t.terms}</summary><p>{t.conditions}</p></details>
  </article>;
}
