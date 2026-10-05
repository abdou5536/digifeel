'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, BadgeEuro, Download, FileSpreadsheet, Pencil, Plus, ShieldCheck, Star } from 'lucide-react';
import {
  getStarBonusAdminData, setStarBonusBaseline, updateStarBonusConfig, validateStarBonusPeriod, verifyStarBonusAnomaly,
  type StarBonusConfig, type StarBonusInvoice
} from '@/src/services/restaurant';
import { paymentProvider, type PaymentMethod } from '@/src/services/paymentProvider';
import { useLanguage } from './LanguageProvider';

type AdminStarBonusData = Awaited<ReturnType<typeof getStarBonusAdminData>>;

const copy = {
  fr: {
  title: 'Suivi des étoiles et primes', period: 'Période à contrôler', config: 'Règles configurables',
  mode: 'Mode de calcul', highest: 'Palier le plus élevé seulement', cumulative: 'Cumulatif',
  cap: 'Plafond mensuel (€)', observation: 'Observation minimale (jours)', monthEnd: 'Relevé près de la clôture (jours)',
  subscription: 'Abonnement mensuel (€)', window: 'Fenêtre antifraude (heures)', spike: 'Seuil avis / fenêtre',
  sameDevice: 'Seuil avis par appareil', tier: 'Paliers de progression', increase: 'Hausse (étoile)', amount: 'Prime (€)',
  save: 'Enregistrer les règles', addTier: 'Ajouter un palier', baseline: 'Note de départ', rating: 'Note / 5',
  count: 'Nombre d’avis', date: 'Date de départ', setBaseline: 'Enregistrer la note de départ',
  restaurant: 'Restaurant', current: 'Note actuelle', change: 'Évolution', due: 'Prime', status: 'Statut',
  eligible: 'À valider', blocked: 'Bloquée · vérification requise', noBaseline: 'Note de départ manquante',
  noGrowth: 'Aucun palier dû', linkChanged: 'Lien Google modifié', minPeriod: 'Observation insuffisante',
  validate: 'Valider et facturer', paymentMode: 'Mode de règlement simulé', invoiceHistory: 'Historique des factures',
  anomalies: 'Alertes antifraude', verify: 'Vérifier et débloquer', spikeLabel: 'Pic de nouveaux avis',
  deviceLabel: 'Avis concentrés sur un appareil', export: 'Exporter Excel', example: 'Exemple démo',
  paid: 'Payée · simulation', pending: 'En attente de validation locale', issued: 'Validée · simulation',
  noInvoices: 'Aucune facture sur cette période.', noAnomalies: 'Aucune alerte antifraude.',
  reason: 'Éligibilité', saving: 'Traitement…', error: 'Action impossible.', noEnd: 'Un relevé proche de la fin du mois est requis.',
  capReached: 'Plafond mensuel atteint', provider: 'Fournisseur PaymentProvider', calculations: 'Détail du calcul',
  viewInvoice: 'Télécharger PDF', terms: 'Conditions : avis authentiques uniquement. Aucun avantage ne peut être proposé en échange d’un avis Google.',
  baselineEditor: 'Édition réservée au super-admin ; une modification met à jour la date de départ du calcul.',
  active: 'Actif', demoInvoice: 'Facture exemple', configSaved: 'Les règles de prime sont enregistrées.',
  baselineSaved: 'La note de départ est enregistrée.', invoiceSaved: 'Facture créée via PaymentProvider.',
  anomalyVerified: 'Alerte examinée ; les primes sont débloquées.', baselineMissing: 'Note de départ manquante',
  noTier: 'Aucun palier dû', googleChanged: 'Lien Google modifié', observationShort: 'Observation insuffisante',
  monthlyClosed: 'La période doit être clôturée avant validation.', invalidExport: 'L’export Excel a échoué.',
  invoicePdfError: 'Le PDF n’a pas pu être généré.', loadError: 'Chargement des primes…',
  maxUnreachable: 'Inaccessible à la note Google maximale (5,0)'
  },
  ar: {
    title: 'متابعة التقييمات والمكافآت', period: 'الفترة للمراجعة', config: 'القواعد القابلة للضبط',
    mode: 'طريقة الحساب', highest: 'أعلى مستوى فقط', cumulative: 'تراكمي',
    cap: 'الحد الشهري (€)', observation: 'مدة الرصد الدنيا (يوماً)', monthEnd: 'تحديث قرب إغلاق الشهر (أيام)',
    subscription: 'الاشتراك الشهري (€)', window: 'نافذة مكافحة الاحتيال (ساعات)', spike: 'حد التقييمات / النافذة',
    sameDevice: 'حد التقييمات من الجهاز نفسه', tier: 'مستويات التقدم', increase: 'الزيادة (نجمة)', amount: 'المكافأة (€)',
    save: 'حفظ القواعد', addTier: 'إضافة مستوى', baseline: 'تقييم البداية', rating: 'التقييم من 5',
    count: 'عدد الآراء', date: 'تاريخ البداية', setBaseline: 'حفظ تقييم البداية',
    restaurant: 'المطعم', current: 'التقييم الحالي', change: 'التطور', due: 'المكافأة', status: 'الحالة',
    eligible: 'جاهز للاعتماد', blocked: 'موقوف · يتطلب التحقق', noBaseline: 'تقييم البداية غير متوفر',
    noGrowth: 'لا توجد مكافأة مستحقة', linkChanged: 'تم تغيير رابط Google', minPeriod: 'فترة الرصد غير كافية',
    validate: 'اعتماد وإصدار الفاتورة', paymentMode: 'طريقة الدفع التجريبية', invoiceHistory: 'سجل الفواتير',
    anomalies: 'تنبيهات مكافحة الاحتيال', verify: 'تحقق ورفع الإيقاف', spikeLabel: 'ارتفاع مفاجئ في الآراء',
    deviceLabel: 'آراء متعددة من جهاز واحد', export: 'تصدير Excel', example: 'مثال تجريبي',
    paid: 'مدفوعة · محاكاة', pending: 'بانتظار التحقق اليدوي', issued: 'معتمدة · محاكاة',
    noInvoices: 'لا توجد فواتير لهذه الفترة.', noAnomalies: 'لا توجد تنبيهات احتيال.',
    reason: 'الأهلية', saving: 'جارٍ التنفيذ…', error: 'تعذر تنفيذ العملية.', noEnd: 'يلزم تسجيل قراءة قرب نهاية الشهر.',
    capReached: 'تم بلوغ الحد الشهري', provider: 'مزود الدفع PaymentProvider', calculations: 'تفاصيل الحساب',
    viewInvoice: 'تنزيل PDF', terms: 'الشروط: آراء حقيقية فقط. لا يجوز تقديم أي ميزة مقابل رأي على Google.',
    baselineEditor: 'التعديل متاح للمشرف العام فقط؛ يغيّر تاريخ بداية الحساب.',
    active: 'مفعّل', demoInvoice: 'فاتورة تجريبية', configSaved: 'تم حفظ قواعد المكافأة.',
    baselineSaved: 'تم حفظ تقييم البداية.', invoiceSaved: 'تم إنشاء الفاتورة عبر PaymentProvider.',
    anomalyVerified: 'تمت مراجعة التنبيه ورفع إيقاف المكافآت.', baselineMissing: 'تقييم البداية غير متوفر',
    noTier: 'لا توجد مكافأة مستحقة', googleChanged: 'تم تغيير رابط Google', observationShort: 'فترة الرصد غير كافية',
    monthlyClosed: 'يجب إغلاق الفترة قبل الاعتماد.', invalidExport: 'تعذر تصدير Excel.',
    invoicePdfError: 'تعذر إنشاء PDF.', loadError: 'جارٍ تحميل المكافآت…',
    maxUnreachable: 'غير ممكن بلوغه مع أقصى تقييم Google (5.0)'
  },
  en: {
    title: 'Star rating and bonuses', period: 'Period to review', config: 'Configurable rules',
    mode: 'Calculation mode', highest: 'Highest tier only', cumulative: 'Cumulative',
    cap: 'Monthly cap (€)', observation: 'Minimum observation (days)', monthEnd: 'Month-end reading window (days)',
    subscription: 'Monthly subscription (€)', window: 'Fraud window (hours)', spike: 'Review threshold / window',
    sameDevice: 'Same-device review threshold', tier: 'Increase tiers', increase: 'Increase (stars)', amount: 'Bonus (€)',
    save: 'Save rules', addTier: 'Add tier', baseline: 'Starting rating', rating: 'Rating out of 5',
    count: 'Review count', date: 'Baseline date', setBaseline: 'Save starting rating',
    restaurant: 'Restaurant', current: 'Current rating', change: 'Change', due: 'Bonus', status: 'Status',
    eligible: 'Ready to validate', blocked: 'Blocked · review required', noBaseline: 'Starting rating missing',
    noGrowth: 'No bonus due', linkChanged: 'Google link changed', minPeriod: 'Observation period too short',
    validate: 'Validate and invoice', paymentMode: 'Simulated payment method', invoiceHistory: 'Invoice history',
    anomalies: 'Fraud alerts', verify: 'Review and unblock', spikeLabel: 'Review spike',
    deviceLabel: 'Reviews from one device', export: 'Export Excel', example: 'Demo example',
    paid: 'Paid · simulation', pending: 'Pending manual validation', issued: 'Validated · simulation',
    noInvoices: 'No invoices for this period.', noAnomalies: 'No fraud alerts.',
    reason: 'Eligibility', saving: 'Processing…', error: 'Action failed.', noEnd: 'A rating near month-end is required.',
    capReached: 'Monthly cap reached', provider: 'PaymentProvider', calculations: 'Calculation details',
    viewInvoice: 'Download PDF', terms: 'Terms: genuine reviews only. Never offer an incentive in exchange for a Google review.',
    baselineEditor: 'Only the super-admin can edit the baseline; changes reset the calculation start date.',
    active: 'Active', demoInvoice: 'Demo invoice', configSaved: 'Bonus rules saved.',
    baselineSaved: 'Starting rating saved.', invoiceSaved: 'Invoice created through PaymentProvider.',
    anomalyVerified: 'Alert reviewed; bonuses are unblocked.', baselineMissing: 'Starting rating missing',
    noTier: 'No bonus due', googleChanged: 'Google link changed', observationShort: 'Observation period too short',
    monthlyClosed: 'The period must be closed before validation.', invalidExport: 'Excel export failed.',
    invoicePdfError: 'Could not generate PDF.', loadError: 'Loading bonuses…',
    maxUnreachable: 'Unreachable at the maximum Google rating (5.0)'
  }
};

function formatEUR(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function localizeReason(reason: string, locale: keyof typeof copy) {
  const translations: Record<string, Record<keyof typeof copy, string>> = {
    'Note de départ indisponible.': { fr: 'Note de départ indisponible.', ar: 'تقييم البداية غير متوفر.', en: 'Starting rating is unavailable.' },
    'Note de départ à définir par le super-admin.': { fr: 'Note de départ à définir par le super-admin.', ar: 'يجب على المشرف العام تحديد تقييم البداية.', en: 'The super-admin must set a starting rating.' },
    'Lien Google modifié : revalidez la note de départ.': { fr: 'Lien Google modifié : revalidez la note de départ.', ar: 'تم تغيير رابط Google؛ أعد التحقق من تقييم البداية.', en: 'Google link changed: revalidate the starting rating.' },
    'La période doit être clôturée avant validation.': { fr: 'La période doit être clôturée avant validation.', ar: 'يجب إغلاق الفترة قبل الاعتماد.', en: 'The period must close before validation.' },
    'Aucune note relevée pendant cette période.': { fr: 'Aucune note relevée pendant cette période.', ar: 'لم يتم تسجيل تقييم خلال هذه الفترة.', en: 'No rating was recorded during this period.' },
    'La note doit être relevée près de la clôture du mois.': { fr: 'La note doit être relevée près de la clôture du mois.', ar: 'يجب تسجيل التقييم قرب نهاية الشهر.', en: 'A rating near month-end is required.' },
    'Période minimale d’observation non atteinte.': { fr: 'Période minimale d’observation non atteinte.', ar: 'لم تكتمل مدة الرصد الدنيا.', en: 'The minimum observation period has not elapsed.' },
    'Prime bloquée : anomalie en attente de vérification.': { fr: 'Prime bloquée : anomalie en attente de vérification.', ar: 'المكافأة موقوفة بانتظار التحقق من التنبيه.', en: 'Bonus blocked pending anomaly review.' },
    'Aucune prime : la note n’a pas progressé.': { fr: 'Aucune prime : la note n’a pas progressé.', ar: 'لا توجد مكافأة؛ لم يرتفع التقييم.', en: 'No bonus: the rating has not increased.' },
    'Aucun nouveau palier facturable ou plafond mensuel atteint.': { fr: 'Aucun nouveau palier facturable ou plafond mensuel atteint.', ar: 'لا يوجد مستوى جديد للفوترة أو تم بلوغ الحد الشهري.', en: 'No new billable tier or the monthly cap was reached.' }
  };
  return translations[reason]?.[locale] ?? reason;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StarBonusAdminPanel() {
  const { locale } = useLanguage();
  const t = copy[locale];
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [workspace, setWorkspace] = useState<AdminStarBonusData | null>(null);
  const [config, setConfig] = useState<StarBonusConfig | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('simulation');
  const [baselineRestaurantId, setBaselineRestaurantId] = useState('');
  const [baselineRating, setBaselineRating] = useState('');
  const [baselineCount, setBaselineCount] = useState('');
  const [baselineDate, setBaselineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const next = await getStarBonusAdminData(period);
    setWorkspace(next);
    setConfig(next.config);
  }, [period]);
  useEffect(() => {
    void refresh().catch(reason => setError(reason instanceof Error ? reason.message : t.error));
  }, [refresh]);

  const act = async (work: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      await refresh();
      setNotice(message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  const saveRules = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    void act(() => updateStarBonusConfig(config, 'super_admin'), t.configSaved);
  };

  const saveBaseline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!baselineRestaurantId) return;
    void act(() => setStarBonusBaseline({
      restaurantId: baselineRestaurantId, rating: Number(baselineRating),
      reviewCount: Number(baselineCount), establishedAt: new Date(`${baselineDate}T12:00:00`).toISOString()
    }, 'super_admin'), t.baselineSaved);
  };

  const validate = (restaurantId: string) => void act(
    () => validateStarBonusPeriod({ restaurantId, period, method: paymentMethod }, 'super_admin'),
    t.invoiceSaved
  );

  const downloadInvoice = async (invoice: StarBonusInvoice) => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const restaurant = workspace?.restaurants.find(item => item.restaurant.id === invoice.restaurantId)?.restaurant;
      pdf.setFillColor(21, 27, 35);
      pdf.rect(0, 0, 210, 42, 'F');
      pdf.setTextColor(245, 245, 245);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('DIGIFEEL', 16, 22);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Facture mensuelle · Abonnement et prime de progression', 16, 32);
      pdf.setTextColor(30, 35, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(restaurant?.name ?? 'Restaurant', 16, 57);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Facture n° ${invoice.invoiceNumber}`, 16, 67);
      pdf.text(`Période d’observation : ${invoice.period}`, 16, 74);
      pdf.text(`Date d’émission : ${new Date(invoice.createdAt).toLocaleDateString('fr-FR')}`, 16, 81);
      let y = 101;
      pdf.text(`Note de départ : ${invoice.baselineRating?.toFixed(1) ?? '—'} / 5`, 16, 91);
      pdf.text(`Note relevée : ${invoice.currentRating?.toFixed(1) ?? '—'} / 5 · ${invoice.reviewCount ?? '—'} avis · hausse +${invoice.increase.toFixed(1)}`, 16, 97);
      y = 111;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Désignation', 16, y);
      pdf.text('Montant EUR', 190, y, { align: 'right' });
      y += 8;
      pdf.setDrawColor(200, 205, 210);
      pdf.line(16, y, 194, y);
      y += 9;
      pdf.setFont('helvetica', 'normal');
      if (invoice.subscriptionEUR > 0) {
        pdf.text(`Abonnement mensuel · période ${invoice.period}`, 16, y);
        pdf.text(formatEUR(invoice.subscriptionEUR), 190, y, { align: 'right' });
        y += 9;
      }
      for (const line of invoice.lines) {
        pdf.text(`Prime palier +${line.increase.toFixed(1)} étoile`, 16, y);
        pdf.text(formatEUR(line.amountEUR), 190, y, { align: 'right' });
        y += 8;
      }
      y += 4;
      pdf.line(16, y, 194, y);
      y += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', 16, y);
      pdf.text(formatEUR(invoice.totalEUR), 190, y, { align: 'right' });
      y += 16;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Statut : ${invoice.status === 'example' ? t.example : invoice.status === 'pending_manual' ? t.pending : t.paid}`, 16, y);
      if (invoice.providerReference) pdf.text(`Référence PaymentProvider : ${invoice.providerReference}`, 16, y + 7);
      pdf.text('Calcul fondé sur une progression Google confirmée à la clôture du mois. Avis authentiques uniquement ; aucune récompense contre un avis.', 16, y + 20, { maxWidth: 178 });
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.invoicePdfError);
    }
  };

  const exportInvoices = async () => {
    if (!workspace) return;
    try {
      const XLSX = await import('@/src/lib/xlsxCompat');
      const rows = workspace.invoices.map(invoice => ({
        'N° facture': invoice.invoiceNumber,
        Restaurant: workspace.restaurants.find(item => item.restaurant.id === invoice.restaurantId)?.restaurant.name ?? '',
        Période: invoice.period,
        Abonnement: invoice.subscriptionEUR,
        Prime: invoice.bonusEUR,
        Total: invoice.totalEUR,
        'Note de départ': invoice.baselineRating,
        'Note relevée': invoice.currentRating,
        'Nombre d’avis': invoice.reviewCount,
        'Hausse étoiles': invoice.increase,
        Statut: invoice.status,
        Paliers: invoice.lines.map(line => `+${line.increase.toFixed(1)}: ${line.amountEUR} EUR`).join(' | ')
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Factures');
      await XLSX.writeFile(workbook, 'digifeel-factures-primes.xlsx');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.invalidExport);
    }
  };

  const addTier = () => {
    if (!config) return;
    setConfig({ ...config, tiers: [...config.tiers, { id: `tier-${Date.now()}`, increase: 1.5, amountEUR: 0, active: true }] });
  };

  if (!workspace || !config) return <article className="workspace-panel star-admin-panel"><p>{t.loadError}</p></article>;

  return <section className="star-admin-panel">
    <div className="star-admin-intro"><div><span className="workspace-eyebrow">DIGIFEEL · SUPER-ADMIN</span><h3><Star size={20} />{t.title}</h3><p>{t.terms}</p></div><label>{t.period}<input type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label></div>
    {(error || notice) && <p className={error ? 'star-alert' : 'star-notice'} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    <form className="workspace-panel star-admin-config" onSubmit={saveRules}>
      <header><h4>{t.config}</h4><span>{t.provider}: {paymentProvider ? 'simulation / local_manual' : '—'}</span></header>
      <div className="star-config-grid">
        <label>{t.mode}<select value={config.mode} onChange={event => setConfig({ ...config, mode: event.target.value as StarBonusConfig['mode'] })}><option value="highest_only">{t.highest}</option><option value="cumulative">{t.cumulative}</option></select></label>
        <label>{t.cap}<input type="number" min="0" step="0.01" value={config.monthlyCapEUR} onChange={event => setConfig({ ...config, monthlyCapEUR: Number(event.target.value) })} /></label>
        <label>{t.observation}<input type="number" min="0" max="3650" value={config.minimumObservationDays} onChange={event => setConfig({ ...config, minimumObservationDays: Number(event.target.value) })} /></label>
        <label>{t.monthEnd}<input type="number" min="1" max="31" value={config.monthEndFreshnessDays} onChange={event => setConfig({ ...config, monthEndFreshnessDays: Number(event.target.value) })} /></label>
        <label>{t.subscription}<input type="number" min="0" step="0.01" value={config.monthlySubscriptionEUR} onChange={event => setConfig({ ...config, monthlySubscriptionEUR: Number(event.target.value) })} /></label>
        <label>{t.window}<input type="number" min="1" value={config.anomalyWindowHours} onChange={event => setConfig({ ...config, anomalyWindowHours: Number(event.target.value) })} /></label>
        <label>{t.spike}<input type="number" min="2" value={config.anomalyReviewLimit} onChange={event => setConfig({ ...config, anomalyReviewLimit: Number(event.target.value) })} /></label>
        <label>{t.sameDevice}<input type="number" min="2" value={config.sameDeviceReviewLimit} onChange={event => setConfig({ ...config, sameDeviceReviewLimit: Number(event.target.value) })} /></label>
      </div>
      <div className="star-tier-head"><strong>{t.tier}</strong><button type="button" className="workspace-secondary-button" onClick={addTier}><Plus size={15} />{t.addTier}</button></div>
      <div className="star-tier-editor">{config.tiers.map((tier, index) => <div key={tier.id}><label>{t.increase}<input type="number" min=".1" max="5" step=".1" value={tier.increase} onChange={event => setConfig({ ...config, tiers: config.tiers.map((item, itemIndex) => itemIndex === index ? { ...item, increase: Number(event.target.value) } : item) })} /></label><label>{t.amount}<input type="number" min="0" step=".01" value={tier.amountEUR} onChange={event => setConfig({ ...config, tiers: config.tiers.map((item, itemIndex) => itemIndex === index ? { ...item, amountEUR: Number(event.target.value) } : item) })} /></label>      <label className="star-tier-active"><input type="checkbox" checked={tier.active} onChange={event => setConfig({ ...config, tiers: config.tiers.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item) })} />{t.active}</label><button type="button" aria-label="Supprimer le palier" onClick={() => setConfig({ ...config, tiers: config.tiers.filter(item => item.id !== tier.id) })}>×</button></div>)}</div>
      <button className="workspace-primary-button" type="submit" disabled={busy}><BadgeEuro size={16} />{t.save}</button>
    </form>

    <article className="workspace-panel star-baseline-panel">
    <header><h4><Pencil size={16} />{t.baseline}</h4><p>{t.baselineEditor}</p></header>
      <form onSubmit={saveBaseline}>
        <label>{t.restaurant}<select required value={baselineRestaurantId} onChange={event => {
          const selected = workspace.restaurants.find(item => item.restaurant.id === event.target.value);
          setBaselineRestaurantId(event.target.value);
          setBaselineRating(selected?.baseline?.rating?.toString() ?? '');
          setBaselineCount(selected?.baseline?.reviewCount?.toString() ?? '');
          setBaselineDate(selected?.baseline?.establishedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
        }}><option value="">—</option>{workspace.restaurants.map(item => <option key={item.restaurant.id} value={item.restaurant.id}>{item.restaurant.name}</option>)}</select></label>
        <label>{t.rating}<input type="number" min="0" max="5" step=".1" required value={baselineRating} onChange={event => setBaselineRating(event.target.value)} /></label>
        <label>{t.count}<input type="number" min="0" step="1" required value={baselineCount} onChange={event => setBaselineCount(event.target.value)} /></label>
        <label>{t.date}<input type="date" required value={baselineDate} onChange={event => setBaselineDate(event.target.value)} /></label>
        <button className="workspace-secondary-button" disabled={busy || !baselineRestaurantId}><Pencil size={15} />{t.setBaseline}</button>
      </form>
    </article>

    <article className="workspace-panel star-month-panel">
      <header><h4><BadgeEuro size={17} />{t.calculations} · {period}</h4><label>{t.paymentMode}<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}><option value="simulation">Simulation</option><option value="local_manual">Validation locale manuelle</option></select></label></header>
      <div className="star-admin-table"><div className="star-admin-table-head"><span>{t.restaurant}</span><span>{t.baseline}</span><span>{t.current}</span><span>{t.change}</span><span>{t.due}</span><span>{t.status}</span><span /></div>
        {workspace.restaurants.map(item => <div className="star-admin-table-row" key={item.restaurant.id}>
          <strong>{item.restaurant.name}</strong>
          <span>{item.baseline?.rating === null || item.baseline?.rating === undefined ? '—' : `${item.baseline.rating.toFixed(1)} · ${item.baseline.reviewCount} avis`}</span>
          <span>{item.calculation.currentRating?.toFixed(1) ?? item.latest?.rating.toFixed(1) ?? '—'} · {item.calculation.reviewCount ?? item.latest?.reviewCount ?? '—'}</span>
          <span>{item.baseline?.rating !== null && item.baseline?.rating !== undefined && item.latest ? `${item.latest.rating - item.baseline.rating > 0 ? '+' : ''}${(item.latest.rating - item.baseline.rating).toFixed(1)}` : '—'}</span>
          <strong>{formatEUR(item.calculation.bonusEUR)}</strong>
          <span className={item.blocked ? 'is-danger' : item.calculation.eligible ? 'is-success' : ''}>{item.blocked ? t.blocked : item.calculation.eligible ? t.eligible : localizeReason(item.calculation.reason, locale)}{item.baseline?.rating !== null && item.baseline?.rating !== undefined && config.tiers.some(tier => tier.active && tier.increase > 5 - item.baseline!.rating!) && <small className="star-unreachable">{t.maxUnreachable}: {config.tiers.filter(tier => tier.active && tier.increase > 5 - item.baseline!.rating!).map(tier => `+${tier.increase.toFixed(1)}`).join(', ')}</small>}</span>
          <button type="button" className="workspace-primary-button" disabled={busy || !item.calculation.eligible || item.blocked} onClick={() => void validate(item.restaurant.id)}>{t.validate}</button>
        </div>)}
      </div>
    </article>

    <article className="workspace-panel star-anomaly-panel">
      <header><h4><AlertTriangle size={17} />{t.anomalies}</h4></header>
      {workspace.anomalies.filter(item => item.status === 'blocked').length === 0 ? <p className="workspace-empty">{t.noAnomalies}</p> : workspace.anomalies.filter(item => item.status === 'blocked').map(anomaly => <div className="star-anomaly-row" key={anomaly.id}><span><strong>{workspace.restaurants.find(item => item.restaurant.id === anomaly.restaurantId)?.restaurant.name}</strong><small>{anomaly.kind === 'review_spike' ? t.spikeLabel : t.deviceLabel} · {anomaly.reviewCount} / {anomaly.windowHours} h · {anomaly.deviceReviewCount}</small></span><button type="button" className="workspace-secondary-button" disabled={busy} onClick={() => void act(() => verifyStarBonusAnomaly(anomaly.id, 'super_admin'), t.anomalyVerified) }><ShieldCheck size={15} />{t.verify}</button></div>)}
    </article>

    <article className="workspace-panel star-invoices-panel">
      <header><h4><FileSpreadsheet size={17} />{t.invoiceHistory}</h4><button type="button" className="workspace-secondary-button" onClick={() => void exportInvoices()}><Download size={15} />{t.export}</button></header>
      {workspace.invoices.length === 0 ? <p className="workspace-empty">{t.noInvoices}</p> : workspace.invoices.map(invoice => <div className="star-invoice-row" key={invoice.id}>
        <span><strong>{invoice.invoiceNumber}</strong><small>{workspace.restaurants.find(item => item.restaurant.id === invoice.restaurantId)?.restaurant.name} · {invoice.period}</small></span>
        <span>{formatEUR(invoice.totalEUR)}</span>
        <span className={invoice.status === 'example' ? '' : 'is-success'}>{invoice.status === 'example' ? t.demoInvoice : invoice.status === 'pending_manual' ? t.pending : t.paid}</span>
        <button type="button" className="workspace-secondary-button" onClick={() => void downloadInvoice(invoice)}><Download size={15} />{t.viewInvoice}</button>
      </div>)}
    </article>
  </section>;
}
