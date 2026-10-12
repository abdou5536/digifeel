'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgePercent, Building2, CalendarDays, Check, CircleAlert, Clipboard, Download, FileText, MapPin, Plus, Store, Users } from 'lucide-react';
import {
  addResellerProspect, applyAsReseller, getResellerDashboard, getRestaurantData, subscribeRestaurantData, updateResellerProspect,
  type ResellerProfile
} from '@/src/services/restaurant';
import { ThemePicker } from './ThemePicker';

type Locale = 'fr' | 'ar' | 'en';

const copy = {
  fr: {
    title: 'Espace revendeur', subtitle: 'Votre réseau, vos résultats.', demo: 'ENVIRONNEMENT DE DÉMONSTRATION',
    apply: 'Devenir partenaire', applyLead: 'Soumettez votre candidature. Le super-admin valide l’accès et vous attribue un lien unique.',
    cancel: 'Annuler',
    name: 'Nom complet', email: 'E-mail', city: 'Ville / wilaya', submit: 'Envoyer ma candidature',
    waiting: 'Candidature reçue. Le lien de parrainage sera disponible après validation par Digifeel.',
    clients: 'Restaurants suivis', installs: 'Installations ce mois', earned: 'Commissions versées', due: 'À payer', coming: 'En attente de validation',
    referral: 'Votre lien partenaire', copy: 'Copier le lien', demoButton: 'Lancer une démo', addProspect: 'Ajouter un prospect',
    prospectName: 'Restaurant', prospectContact: 'Téléphone ou e-mail', followUp: 'Rappel prévu le', add: 'Ajouter au suivi',
    customers: 'Vos restaurants', prospects: 'Suivi commercial', commissions: 'Relevé de commissions', payouts: 'Historique des versements', period: 'Période',
    ranking: 'Restaurants par ville', status: 'Statut', cityLabel: 'Ville', scans: 'Scans', noCustomers: 'Aucun restaurant rattaché pour le moment.',
    noProspects: 'Aucun prospect enregistré.', noCommissions: 'Aucune commission sur cette période.',
    exportXlsx: 'Exporter Excel', exportPdf: 'Relevé PDF', brochure: 'Télécharger la brochure', follow: 'Rappel',
    statusNames: { prospect: 'Prospect', demo: 'Démo', installed: 'Installé', active: 'Actif', terminated: 'Résilié' },
    commissionStatus: { payable: 'À payer', paid: 'Payé' }, payoutStatus: { pending: 'Virement autorisé', paid: 'Payé' },
    error: 'Action impossible. Vérifiez les informations et réessayez.', copied: 'Lien copié.', prospectSaved: 'Prospect ajouté au suivi.',
    qualifier: 'Les montants affichés sont des données locales de démonstration. Aucun versement réel.'
  },
  en: {
    title: 'Partner portal', subtitle: 'Your network, your results.', demo: 'DEMO ENVIRONMENT',
    apply: 'Become a partner', applyLead: 'Apply to join. A Digifeel super-admin approves access and assigns your unique referral link.',
    cancel: 'Cancel',
    name: 'Full name', email: 'Email', city: 'City / province', submit: 'Submit application',
    waiting: 'Application received. Your referral link will be available after Digifeel approval.',
    clients: 'Restaurants', installs: 'Installations this month', earned: 'Paid commissions', due: 'Payable', coming: 'Awaiting validation',
    referral: 'Your partner link', copy: 'Copy link', demoButton: 'Launch demo', addProspect: 'Add a prospect',
    prospectName: 'Restaurant', prospectContact: 'Phone or email', followUp: 'Follow-up date', add: 'Add to follow-up',
    customers: 'Your restaurants', prospects: 'Sales follow-up', commissions: 'Commission statement', payouts: 'Payout history', period: 'Period',
    ranking: 'Restaurants by city', status: 'Status', cityLabel: 'City', scans: 'Scans', noCustomers: 'No linked restaurants yet.',
    noProspects: 'No prospects recorded.', noCommissions: 'No commissions for this period.',
    exportXlsx: 'Export Excel', exportPdf: 'PDF statement', brochure: 'Download brochure', follow: 'Follow-up',
    statusNames: { prospect: 'Prospect', demo: 'Demo', installed: 'Installed', active: 'Active', terminated: 'Terminated' },
    commissionStatus: { payable: 'Payable', paid: 'Paid' }, payoutStatus: { pending: 'Transfer authorized', paid: 'Paid' },
    error: 'Action failed. Check the details and try again.', copied: 'Link copied.', prospectSaved: 'Prospect added to follow-up.',
    qualifier: 'Amounts shown are local demo data. No real payout is made.'
  },
  ar: {
    title: 'بوابة الموزعين', subtitle: 'شبكتك ونتائجك.', demo: 'بيئة تجريبية',
    apply: 'انضم كشريك', applyLead: 'أرسل طلبك. يعتمد المشرف الوصول ويمنحك رابط إحالة فريداً.',
    cancel: 'إلغاء',
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', city: 'المدينة / الولاية', submit: 'إرسال الطلب',
    waiting: 'تم استلام الطلب. سيظهر رابط الإحالة بعد موافقة Digifeel.',
    clients: 'المطاعم', installs: 'تثبيتات هذا الشهر', earned: 'العمولات المدفوعة', due: 'مستحقة الدفع', coming: 'بانتظار التأكيد',
    referral: 'رابط الشريك', copy: 'نسخ الرابط', demoButton: 'بدء عرض تجريبي', addProspect: 'إضافة عميل محتمل',
    prospectName: 'المطعم', prospectContact: 'الهاتف أو البريد', followUp: 'موعد المتابعة', add: 'إضافة للمتابعة',
    customers: 'مطاعمك', prospects: 'متابعة المبيعات', commissions: 'كشف العمولات', payouts: 'سجل التحويلات', period: 'الفترة',
    ranking: 'المطاعم حسب المدينة', status: 'الحالة', cityLabel: 'المدينة', scans: 'المسحات', noCustomers: 'لا توجد مطاعم مرتبطة بعد.',
    noProspects: 'لا يوجد عملاء محتملون.', noCommissions: 'لا توجد عمولات لهذه الفترة.',
    exportXlsx: 'تصدير Excel', exportPdf: 'كشف PDF', brochure: 'تنزيل الكتيب', follow: 'متابعة',
    statusNames: { prospect: 'عميل محتمل', demo: 'عرض تجريبي', installed: 'مثبت', active: 'نشط', terminated: 'منتهي' },
    commissionStatus: { payable: 'مستحق', paid: 'مدفوع' }, payoutStatus: { pending: 'تم اعتماد التحويل', paid: 'مدفوع' },
    error: 'تعذر تنفيذ الإجراء. تحقق من المعلومات وحاول مجدداً.', copied: 'تم نسخ الرابط.', prospectSaved: 'تمت إضافة العميل المحتمل إلى المتابعة.',
    qualifier: 'المبالغ المعروضة بيانات تجريبية محلية. لا يتم إجراء تحويل حقيقي.'
  }
} as const;

function eur(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function ResellerPortal() {
  const [locale, setLocale] = useState<Locale>('fr');
  const t = copy[locale];
  const [resellerId, setResellerId] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof getResellerDashboard>> | null>(null);
  const [application, setApplication] = useState<ResellerProfile | null>(null);
  const [showApplication, setShowApplication] = useState(false);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [applicant, setApplicant] = useState({ name: '', email: '', city: '' });
  const [prospect, setProspect] = useState({ name: '', city: '', contact: '', followUpAt: '' });

  const refresh = useCallback(async (id: string) => {
    try {
      const dashboard = await getResellerDashboard(id);
      setData(dashboard);
      const latestCommission = dashboard.commissions.slice().sort((a, b) => b.month.localeCompare(a.month))[0];
      if (latestCommission) setMonth(current => dashboard.commissions.some(item => item.month === current) ? current : latestCommission.month);
      setApplication(null);
      setShowApplication(false);
    } catch {
      setData(null);
      const stored = (await getRestaurantData()).resellers.find(item => item.id === id) ?? null;
      setApplication(stored);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem('digifeel-app-locale');
    if (storedLocale === 'fr' || storedLocale === 'ar' || storedLocale === 'en') setLocale(storedLocale);
    const params = new URLSearchParams(window.location.search);
    const storedId = window.localStorage.getItem('digifeel-reseller-id');
    const directory = getRestaurantData();
    void directory.then(snapshot => {
      const candidate = params.get('id') ?? storedId;
      const available = snapshot.resellers.find(item => item.id === candidate) ??
        snapshot.resellers.find(item => item.code === 'DGF-AGENT-7K4M' && item.status === 'approved') ??
        snapshot.resellers.find(item => item.status === 'approved');
      if (available) {
        window.localStorage.setItem('digifeel-reseller-id', available.id);
        setResellerId(available.id);
        void refresh(available.id);
      } else if (candidate) {
        setResellerId(candidate);
        void refresh(candidate);
      } else setLoading(false);
    });
    const unsubscribe = subscribeRestaurantData(() => {
      if (resellerId) void refresh(resellerId);
    });
    return unsubscribe;
  }, [refresh, resellerId]);

  const ownCommissions = useMemo(() => data?.commissions.filter(item => item.month === month) ?? [], [data, month]);
  const referralUrl = data?.reseller.code && typeof window !== 'undefined'
    ? `${window.location.origin}/inscription?reseller=${encodeURIComponent(data.reseller.code)}` : '';

  const runExport = async (work: () => Promise<void>) => {
    setError('');
    try { await work(); } catch (failure) { setError(failure instanceof Error ? failure.message : t.error); }
  };

  const copyReferralLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error(t.error);
      await navigator.clipboard.writeText(referralUrl);
      setNotice(t.copied);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t.error);
    }
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const created = await applyAsReseller(applicant);
      setApplication(created);
      setResellerId(created.id);
      setShowApplication(true);
      window.localStorage.setItem('digifeel-reseller-id', created.id);
      setNotice(t.waiting);
      setApplicant({ name: '', email: '', city: '' });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t.error);
    } finally { setBusy(false); }
  };

  const submitProspect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await addResellerProspect({ ...prospect, resellerId: data.reseller.id });
      setProspect({ name: '', city: '', contact: '', followUpAt: '' });
      await refresh(data.reseller.id);
      setNotice(t.prospectSaved);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t.error);
    } finally { setBusy(false); }
  };

  const exportExcel = async () => {
    if (!data) return;
    const XLSX = await import('@/src/lib/xlsxCompat');
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ownCommissions.map(item => ({
      Période: item.month, Restaurant: data.customers.find(customer => customer.id === item.restaurantId)?.name ?? '',
      Montant: item.amountEUR, Statut: t.commissionStatus[item.status], Date: item.createdAt
    }))), 'Commissions');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.customers.map(item => ({
      Restaurant: item.name, Ville: item.city, Statut: t.statusNames[item.status], Scans: item.scans, Créé: item.createdAt
    }))), 'Restaurants');
    await XLSX.writeFile(workbook, `digifeel-releve-${month}.xlsx`);
  };

  const exportPdf = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    pdf.setFillColor(18, 25, 31); pdf.rect(0, 0, 210, 38, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(17); pdf.text('DIGIFEEL', 16, 18);
    pdf.setFontSize(10); pdf.text(locale === 'ar' ? 'كشف عمولات الشريك' : locale === 'en' ? 'Partner commission statement' : 'Relevé des commissions partenaire', 16, 29);
    pdf.setTextColor(25, 33, 40); pdf.setFontSize(12); pdf.text(`${data.reseller.name} · ${month}`, 16, 53);
    let y = 67;
    for (const commission of ownCommissions) {
      const restaurant = data.customers.find(item => item.id === commission.restaurantId);
      pdf.setFontSize(10); pdf.text(`${restaurant?.name ?? 'Restaurant'} · ${commission.month}`, 16, y);
      pdf.text(`${eur(commission.amountEUR)} · ${t.commissionStatus[commission.status]}`, 194, y, { align: 'right' });
      y += 9;
      if (y > 270) { pdf.addPage(); y = 20; }
    }
    pdf.setFontSize(11); pdf.text(`${locale === 'en' ? 'Total' : locale === 'ar' ? 'المجموع' : 'Total'} : ${eur(ownCommissions.reduce((sum, item) => sum + item.amountEUR, 0))}`, 16, y + 8);
    pdf.save(`digifeel-releve-${month}.pdf`);
  };

  const downloadBrochure = async () => {
    const { jsPDF } = await import('jspdf');
    if (locale === 'ar') {
      const canvas = document.createElement('canvas');
      canvas.width = 1240; canvas.height = 1754;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Le navigateur ne peut pas préparer la brochure.');
      context.fillStyle = '#10171c'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#e6b15a'; context.beginPath(); context.arc(1140, 126, 32, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#10171c'; context.font = '700 42px Arial, sans-serif'; context.textAlign = 'center'; context.direction = 'ltr'; context.fillText('D', 1140, 141);
      context.fillStyle = '#e6b15a'; context.font = '700 48px Arial, sans-serif'; context.textAlign = 'right'; context.direction = 'rtl';
      context.fillText('DIGIFEEL', 1120, 145);
      context.textAlign = 'right'; context.direction = 'rtl';
      context.fillStyle = '#f7f7f4'; context.font = '700 72px Arial, sans-serif';
      context.fillText('حل عملي للمطاعم', 1120, 400);
      context.fillStyle = '#c4cbd0'; context.font = '38px Arial, sans-serif';
      ['يطلب الزبون عبر رمز QR أو NFC.', 'يدير فريقك الطاولات والطلبات.', 'تابع التقييمات والبقشيش من لوحة واحدة.'].forEach((line, index) => context.fillText(line, 1120, 560 + index * 90));
      context.font = '30px Arial, sans-serif'; context.fillText('تواصل مع Digifeel لطلب عرض مباشر.', 1120, 1040);
      const pdf = new jsPDF();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save('digifeel-brochure-ar.pdf');
      return;
    }
    const pdf = new jsPDF();
    pdf.setFillColor(15, 22, 28); pdf.rect(0, 0, 210, 297, 'F');
    pdf.setFillColor(230, 177, 90); pdf.circle(21, 21, 6, 'F');
    pdf.setTextColor(15, 22, 28); pdf.setFontSize(10); pdf.text('D', 21, 24, { align: 'center' });
    pdf.setTextColor(230, 177, 90); pdf.setFontSize(13); pdf.text('DIGIFEEL', 31, 24);
    pdf.setTextColor(250, 250, 248); pdf.setFontSize(25);
    pdf.text(locale === 'en' ? 'A better guest experience' : 'Le service qui fait revenir', 18, 66);
    pdf.setFontSize(13);
    const lines = locale === 'en'
      ? ['Guests scan a table QR or NFC tag.', 'Your team manages tables and orders.', 'Track reviews and tips in one workspace.']
      : ['Vos clients scannent à table, sans application.', 'Votre équipe suit les additions en temps réel.', 'Avis, pourboires et activité réunis au même endroit.'];
    lines.forEach((line, index) => pdf.text(line, 18, 96 + index * 15));
    pdf.setTextColor(185, 194, 199); pdf.setFontSize(10);
    pdf.text(locale === 'en' ? 'Contact Digifeel for a live demo.' : 'Contactez Digifeel pour organiser une démonstration.', 18, 160);
    pdf.save(`digifeel-brochure-${locale}.pdf`);
  };

  return <main className="next-app reseller-portal" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="reseller-header">
      <Link href="/" className="product-brand"><img src="/icons/icon.svg" alt="" />DIGIFEEL <span>PARTENAIRES</span></Link>
      <div><span className="workspace-demo-pill">{t.demo}</span><select aria-label="Langue" value={locale} onChange={event => { const next = event.target.value as Locale; setLocale(next); window.localStorage.setItem('digifeel-app-locale', next); }}><option value="fr">FR</option><option value="ar">العربية</option><option value="en">EN</option></select><ThemePicker compact /></div>
    </header>
    <section className="reseller-main">
      <div className="reseller-title"><div><span className="workspace-eyebrow">DIGIFEEL · PARTENAIRES</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><div>{data && !showApplication && <button type="button" className="reseller-apply-link" onClick={() => { setApplication(null); setShowApplication(true); }}>{t.apply}</button>}{showApplication && data && <button type="button" className="reseller-apply-link" onClick={() => setShowApplication(false)}>{t.cancel}</button>}<Link href="/"><ArrowLeft size={16} />{locale === 'en' ? 'Back' : locale === 'ar' ? 'عودة' : 'Retour'}</Link></div></div>
      {(notice || error) && <p className={`workspace-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error ? <CircleAlert size={17} /> : <Check size={17} />}{error || notice}</p>}
      {loading ? <article className="reseller-glass reseller-application-state" aria-busy="true"><span className="reseller-skeleton" /><span className="reseller-skeleton reseller-skeleton--wide" /></article> :
        (!data || showApplication) ? application?.status === 'pending' ? <article className="reseller-glass reseller-application-state"><CalendarDays /><h2>{t.waiting}</h2></article> : <form className="reseller-glass reseller-apply-form" onSubmit={submitApplication}>
        <span className="workspace-eyebrow">PARTENARIAT LOCAL</span><h2>{t.apply}</h2><p>{t.applyLead}</p>
        <label>{t.name}<input required minLength={2} maxLength={100} value={applicant.name} onChange={event => setApplicant({ ...applicant, name: event.target.value })} /></label>
        <label>{t.email}<input required type="email" value={applicant.email} onChange={event => setApplicant({ ...applicant, email: event.target.value })} /></label>
        <label>{t.city}<input maxLength={100} value={applicant.city} onChange={event => setApplicant({ ...applicant, city: event.target.value })} /></label>
        <button type="submit" className="workspace-primary-button" disabled={busy}>{t.submit}</button>
      </form> : <>
        <div className="reseller-metric-grid">
          {[
            { icon: Users, label: t.clients, value: data.totals.customerCount },
            { icon: Building2, label: t.installs, value: data.totals.installationsThisMonth },
            { icon: Check, label: t.earned, value: eur(data.totals.earnedEUR) },
            { icon: BadgePercent, label: t.due, value: eur(data.totals.dueEUR) },
            { icon: CalendarDays, label: t.coming, value: eur(data.totals.comingEUR) }
          ].map(({ icon: Icon, label, value }) => <article className="reseller-metric reseller-glass" key={label}><span><Icon size={15} />{label}</span><strong>{value}</strong></article>)}
        </div>
        <section className="reseller-glass reseller-referral-card"><div><span className="workspace-eyebrow">{t.referral}</span><strong>{data.reseller.code}</strong><small>{referralUrl}</small></div><button type="button" onClick={() => void copyReferralLink()}><Clipboard size={16} />{t.copy}</button><Link className="workspace-primary-button" href="/demo"><Store size={16} />{t.demoButton}</Link><button type="button" onClick={() => void runExport(downloadBrochure)}><FileText size={16} />{t.brochure}</button></section>
        <div className="reseller-content-grid">
          <article className="reseller-glass reseller-panel"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{data.customers.length} {t.clients.toLowerCase()}</span><h2>{t.customers}</h2></div><Building2 /></div>
            {data.customers.length === 0 ? <p className="workspace-muted">{t.noCustomers}</p> : <div className="reseller-table"><div><span>{t.status}</span><span>{t.cityLabel}</span><span>{t.scans}</span></div>{data.customers.map(customer => <div key={customer.id}><strong>{customer.name}</strong><span>{customer.city}</span><span>{customer.scans}</span><span className={`reseller-status is-${customer.status}`}>{t.statusNames[customer.status]}</span></div>)}</div>}
          </article>
          <article className="reseller-glass reseller-panel"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.ranking}</span><h2>{t.ranking}</h2></div><MapPin /></div>{data.cityRanking.length ? data.cityRanking.map(item => <div className="reseller-ranking-row" key={item.city}><span>{item.city}</span><strong>{item.count}</strong></div>) : <p className="workspace-muted">—</p>}</article>
        </div>
        <div className="reseller-content-grid">
          <article className="reseller-glass reseller-panel"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">PROSPECTION</span><h2>{t.addProspect}</h2></div><Plus /></div>
            <form className="reseller-prospect-form" onSubmit={submitProspect}>
              <label>{t.prospectName}<input required minLength={2} value={prospect.name} onChange={event => setProspect({ ...prospect, name: event.target.value })} /></label>
              <label>{t.cityLabel}<input value={prospect.city} onChange={event => setProspect({ ...prospect, city: event.target.value })} /></label>
              <label>{t.prospectContact}<input required value={prospect.contact} onChange={event => setProspect({ ...prospect, contact: event.target.value })} /></label>
              <label>{t.followUp}<input required type="date" value={prospect.followUpAt} onChange={event => setProspect({ ...prospect, followUpAt: event.target.value })} /></label>
              <button className="workspace-primary-button" type="submit" disabled={busy}><Plus size={16} />{t.add}</button>
            </form>
            <div className="reseller-prospect-list">{data.prospects.length ? data.prospects.map(item => <div key={item.id}><strong>{item.name}</strong><span>{item.city} · {item.contact} · {item.followUpAt}</span><select aria-label={`${t.status} ${item.name}`} value={item.status} onChange={event => void updateResellerProspect(item.id, data.reseller.id, event.target.value as typeof item.status).then(() => refresh(data.reseller.id)).catch(failure => setError(failure instanceof Error ? failure.message : t.error))}><option value="prospect">{t.statusNames.prospect}</option><option value="demo">{t.statusNames.demo}</option><option value="installed">{t.statusNames.installed}</option><option value="active">{t.statusNames.active}</option><option value="terminated">{t.statusNames.terminated}</option></select></div>) : <p className="workspace-muted">{t.noProspects}</p>}</div>
          </article>
          <article className="reseller-glass reseller-panel"><div className="workspace-panel-heading"><div><span className="workspace-eyebrow">SUIVI MENSUEL</span><h2>{t.commissions}</h2></div><BadgePercent /></div>
            <label className="reseller-period">{t.period}<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
            <div className="reseller-table reseller-commission-table">{ownCommissions.length ? ownCommissions.map(item => <div key={item.id}><strong>{data.customers.find(customer => customer.id === item.restaurantId)?.name}</strong><span>{eur(item.amountEUR)}</span><span className={`reseller-status is-${item.status}`}>{t.commissionStatus[item.status]}</span></div>) : <p className="workspace-muted">{t.noCommissions}</p>}</div>
            <div className="reseller-export-actions"><button type="button" onClick={() => void runExport(exportExcel)}><Download size={16} />{t.exportXlsx}</button><button type="button" onClick={() => void runExport(exportPdf)}><FileText size={16} />{t.exportPdf}</button></div>
            <h3>{t.payouts}</h3>{data.payouts.length ? data.payouts.map(item => <div className="reseller-ranking-row" key={item.id}><span>{item.month} · {t.payoutStatus[item.status]}</span><strong>{eur(item.amountEUR)}</strong></div>) : <p className="workspace-muted">—</p>}
          </article>
        </div>
        <p className="reseller-footnote"><CircleAlert size={15} />{t.qualifier}</p>
      </>}
    </section>
  </main>;
}
