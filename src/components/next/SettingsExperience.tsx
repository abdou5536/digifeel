'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Building2, CreditCard, Download, Globe2, Palette, ShieldCheck, Users } from 'lucide-react';
import { getRestaurantData, getSelectedRestaurantId, type RestaurantData } from '@/src/services/restaurant';
import { ThemePicker } from './ThemePicker';
import { useLanguage } from './LanguageProvider';

type Locale = 'fr' | 'ar' | 'en';
type SettingsTab = 'profile' | 'location' | 'appearance' | 'notifications' | 'team' | 'billing' | 'security' | 'integrations' | 'exports';

const labels: Record<Locale, Record<string, string>> = {
  fr: {
    title: 'Réglages', subtitle: 'Configurez votre espace de travail Digifeel.', profile: 'Profil', location: 'Établissement',
    appearance: 'Apparence', notifications: 'Notifications', team: 'Équipe et rôles', billing: 'Facturation',
    security: 'Sécurité', integrations: 'Intégrations', exports: 'Données et exports', theme: 'Thème',
    density: 'Densité d’affichage', comfortable: 'Confortable', compact: 'Compacte', language: 'Langue',
    emailAlerts: 'Alertes par e-mail', lowReview: 'Avis avec une note basse', kitchenAlert: 'Commandes cuisine',
    systemLocal: 'Ces préférences sont enregistrées sur cet appareil.', status: 'Statut', currency: 'Devise',
    google: 'Lien Google Avis', manageMenu: 'Gérer les accès équipe dans Serveurs', open: 'Ouvrir',
    securityInfo: 'La version de démonstration ne stocke pas de mots de passe dans cet espace. La sécurité de production dépend du backend Supabase.',
    integrationInfo: 'Les paiements réels ne sont pas activés. Le fournisseur de paiement reste en mode simulation.',
    billingInfo: 'Aucun prélèvement réel n’est effectué dans la démonstration.', exportInfo: 'Téléchargez les exports disponibles depuis la page Gestion.',
    saved: 'Préférence mise à jour', back: 'Espace restaurant'
  },
  ar: {
    title: 'الإعدادات', subtitle: 'إعداد مساحة Digifeel الخاصة بك.', profile: 'الملف الشخصي', location: 'المطعم',
    appearance: 'المظهر', notifications: 'الإشعارات', team: 'الفريق والصلاحيات', billing: 'الفوترة',
    security: 'الأمان', integrations: 'التكاملات', exports: 'البيانات والتصدير', theme: 'السمة',
    density: 'كثافة العرض', comfortable: 'مريح', compact: 'مضغوط', language: 'اللغة',
    emailAlerts: 'تنبيهات البريد', lowReview: 'التقييمات المنخفضة', kitchenAlert: 'طلبات المطبخ',
    systemLocal: 'يتم حفظ هذه التفضيلات على هذا الجهاز.', status: 'الحالة', currency: 'العملة',
    google: 'رابط تقييم Google', manageMenu: 'إدارة صلاحيات الفريق من صفحة النادلين', open: 'فتح',
    securityInfo: 'لا تحفظ النسخة التجريبية كلمات المرور هنا. تعتمد حماية الإنتاج على خادم Supabase.',
    integrationInfo: 'الدفع الفعلي غير مفعّل. مزود الدفع يعمل في وضع المحاكاة.',
    billingInfo: 'لا يتم تحصيل أي مبالغ فعلية في النسخة التجريبية.', exportInfo: 'التنزيلات متاحة من صفحة الإدارة.',
    saved: 'تم تحديث التفضيل', back: 'مساحة المطعم'
  },
  en: {
    title: 'Settings', subtitle: 'Configure your Digifeel workspace.', profile: 'Profile', location: 'Location',
    appearance: 'Appearance', notifications: 'Notifications', team: 'Team and roles', billing: 'Billing',
    security: 'Security', integrations: 'Integrations', exports: 'Data and exports', theme: 'Theme',
    density: 'Display density', comfortable: 'Comfortable', compact: 'Compact', language: 'Language',
    emailAlerts: 'Email alerts', lowReview: 'Low rating reviews', kitchenAlert: 'Kitchen orders',
    systemLocal: 'These preferences are stored on this device.', status: 'Status', currency: 'Currency',
    google: 'Google review link', manageMenu: 'Manage team access in Servers', open: 'Open',
    securityInfo: 'The demo does not store passwords here. Production security depends on the Supabase backend.',
    integrationInfo: 'Live payments are not enabled. The payment provider remains in simulation mode.',
    billingInfo: 'No real charges are made in this demonstration.', exportInfo: 'Download available exports from Management.',
    saved: 'Preference updated', back: 'Restaurant workspace'
  }
};

const tabs: Array<{ id: SettingsTab; icon: typeof Users; label: Record<Locale, string> }> = [
  { id: 'profile', icon: Users, label: { fr: 'Profil', ar: 'الملف الشخصي', en: 'Profile' } },
  { id: 'location', icon: Building2, label: { fr: 'Établissement', ar: 'المطعم', en: 'Location' } },
  { id: 'appearance', icon: Palette, label: { fr: 'Apparence', ar: 'المظهر', en: 'Appearance' } },
  { id: 'notifications', icon: Bell, label: { fr: 'Notifications', ar: 'الإشعارات', en: 'Notifications' } },
  { id: 'team', icon: Users, label: { fr: 'Équipe et rôles', ar: 'الفريق والصلاحيات', en: 'Team and roles' } },
  { id: 'billing', icon: CreditCard, label: { fr: 'Facturation', ar: 'الفوترة', en: 'Billing' } },
  { id: 'security', icon: ShieldCheck, label: { fr: 'Sécurité', ar: 'الأمان', en: 'Security' } },
  { id: 'integrations', icon: Globe2, label: { fr: 'Intégrations', ar: 'التكاملات', en: 'Integrations' } },
  { id: 'exports', icon: Download, label: { fr: 'Données et exports', ar: 'البيانات والتصدير', en: 'Data and exports' } }
];

export function SettingsExperience() {
  const [locale, setLocale] = useState<Locale>('fr');
  const { setLocale: setGlobalLocale } = useLanguage();
  const [active, setActive] = useState<SettingsTab>('appearance');
  const [data, setData] = useState<RestaurantData | null>(null);
  const [restaurantId, setRestaurantId] = useState('');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [notifications, setNotifications] = useState({ lowReview: true, kitchenAlert: true });
  const [saved, setSaved] = useState(false);
  const t = labels[locale];
  const restaurant = data?.restaurants.find(item => item.id === restaurantId) ?? data?.restaurants[0];

  useEffect(() => {
    const lang = window.localStorage.getItem('digifeel-app-locale');
    if (lang === 'fr' || lang === 'ar' || lang === 'en') {
      setLocale(lang);
      setGlobalLocale(lang);
    }
    const storedDensity = window.localStorage.getItem('digifeel-density');
    if (storedDensity === 'compact' || storedDensity === 'comfortable') setDensity(storedDensity);
    const savedNotifications = window.localStorage.getItem('digifeel-notifications');
    if (savedNotifications) {
      try { setNotifications(JSON.parse(savedNotifications)); }
      catch (error) { console.warn('Préférences de notification illisibles.', error); }
    }
    void Promise.all([getRestaurantData(), getSelectedRestaurantId()]).then(([nextData, selected]) => {
      setData(nextData);
      setRestaurantId(selected);
    });
  }, [setGlobalLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const saveDensity = (value: 'comfortable' | 'compact') => {
    setDensity(value);
    window.localStorage.setItem('digifeel-density', value);
    document.documentElement.dataset.density = value;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const saveNotifications = (next: typeof notifications) => {
    setNotifications(next);
    window.localStorage.setItem('digifeel-notifications', JSON.stringify(next));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const setLanguage = (value: Locale) => {
    setLocale(value);
    setGlobalLocale(value);
    window.localStorage.setItem('digifeel-app-locale', value);
    window.localStorage.setItem('digifeel-locale', value);
  };

  return <main className="settings-page" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="settings-header"><Link href="/app">← {t.back}</Link><div><span>DIGIFEEL · WORKSPACE</span><h1>{t.title}</h1><p>{t.subtitle}</p></div></header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label={t.title}>{tabs.map(({ id, icon: Icon, label }) => <button key={id} type="button" className={active === id ? 'is-active' : ''} onClick={() => setActive(id)}><Icon size={17} />{label[locale]}</button>)}</nav>
      <section className="settings-content">
        {saved && <p className="settings-saved" role="status">{t.saved}</p>}
        {active === 'appearance' && <article className="settings-card"><header><h2>{t.appearance}</h2><p>{t.systemLocal}</p></header><div className="settings-row"><div><strong>{t.theme}</strong><small>{locale === 'ar' ? 'فاتح أو داكن أو حسب النظام' : locale === 'en' ? 'Light, dark or follow system' : 'Clair, sombre ou selon votre système'}</small></div><ThemePicker locale={locale} /></div><div className="settings-row"><div><strong>{t.density}</strong><small>{locale === 'ar' ? 'المسافات بين عناصر الواجهة' : locale === 'en' ? 'Spacing across workspace screens' : 'Espacement dans les écrans de travail'}</small></div><select value={density} onChange={event => saveDensity(event.target.value as 'comfortable' | 'compact')}><option value="comfortable">{t.comfortable}</option><option value="compact">{t.compact}</option></select></div><div className="settings-row"><div><strong>{t.language}</strong><small>Français · العربية · English</small></div><select value={locale} onChange={event => setLanguage(event.target.value as Locale)}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></div></article>}
        {active === 'profile' && <article className="settings-card"><header><h2>{t.profile}</h2><p>{t.systemLocal}</p></header><div className="settings-row"><strong>{restaurant?.name ?? 'Digifeel'}</strong><span>{data?.users.find(user => user.restaurantId === restaurant?.id && user.role === 'admin_restaurant')?.name ?? '—'}</span></div><Link className="settings-primary-link" href="/app">Ouvrir l’espace restaurant</Link></article>}
        {active === 'location' && <article className="settings-card"><header><h2>{t.location}</h2></header><div className="settings-row"><strong>{restaurant?.name ?? '—'}</strong><span>{restaurant?.city ?? '—'}</span></div><div className="settings-row"><strong>{t.currency}</strong><span>{restaurant?.currency ?? '—'}</span></div><div className="settings-row"><strong>{t.google}</strong>{restaurant?.googleReviewUrl ? <a href={restaurant.googleReviewUrl} target="_blank" rel="noreferrer">{restaurant.googleReviewUrl}</a> : <span>—</span>}</div><Link className="settings-primary-link" href="/app">Modifier les paramètres</Link></article>}
        {active === 'notifications' && <article className="settings-card"><header><h2>{t.notifications}</h2><p>{t.systemLocal}</p></header>{(['lowReview', 'kitchenAlert'] as const).map(key => <label className="settings-row" key={key}><span><strong>{key === 'lowReview' ? t.lowReview : t.kitchenAlert}</strong></span><input type="checkbox" checked={notifications[key]} onChange={event => saveNotifications({ ...notifications, [key]: event.target.checked })} /></label>)}</article>}
        {active === 'team' && <article className="settings-card"><header><h2>{t.team}</h2><p>{locale === 'ar' ? 'تُدار الصلاحيات من مساحة المطعم.' : locale === 'en' ? 'Manage permissions from the restaurant workspace.' : 'Les permissions se gèrent depuis l’espace restaurant.'}</p></header><Link className="settings-primary-link" href="/app">{t.manageMenu} · {t.open}</Link></article>}
        {active === 'billing' && <article className="settings-card"><header><h2>{t.billing}</h2><p>{t.billingInfo}</p></header><div className="settings-row"><strong>{t.status}</strong><span className="settings-status">{restaurant?.subscriptionStatus ?? '—'}</span></div><Link className="settings-primary-link" href="/inscription">{locale === 'ar' ? 'عرض الاشتراك' : locale === 'en' ? 'View subscription options' : 'Voir les offres'}</Link></article>}
        {active === 'security' && <article className="settings-card"><header><h2>{t.security}</h2></header><p className="settings-note"><ShieldCheck />{t.securityInfo}</p><Link className="settings-primary-link" href="/login">{locale === 'ar' ? 'إدارة تسجيل الدخول' : locale === 'en' ? 'Manage sign-in' : 'Gérer la connexion'}</Link></article>}
        {active === 'integrations' && <article className="settings-card"><header><h2>{t.integrations}</h2><p>{t.integrationInfo}</p></header><div className="settings-row"><strong>Google Reviews</strong><span>{restaurant?.googleReviewUrl ? 'Connecté' : 'Non configuré'}</span></div><div className="settings-row"><strong>Gemini</strong><span>Optionnel · serveur</span></div><div className="settings-row"><strong>PaymentProvider</strong><span>Simulation</span></div></article>}
        {active === 'exports' && <article className="settings-card"><header><h2>{t.exports}</h2><p>{t.exportInfo}</p></header><Link className="settings-primary-link" href="/app">{locale === 'ar' ? 'فتح إدارة المطعم' : locale === 'en' ? 'Open management' : 'Ouvrir la gestion'} <Download size={16} /></Link></article>}
      </section>
    </div>
  </main>;
}
