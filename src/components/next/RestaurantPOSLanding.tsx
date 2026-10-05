'use client';

import Link from 'next/link';
import { ArrowDown, ArrowLeftRight, Banknote, BarChart3, Check, ChefHat, Clock3, CloudOff, CreditCard, Layers3, ReceiptText, ShoppingBag, Wifi } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { ThemePicker } from './ThemePicker';

export function RestaurantPOSLanding() {
  const { locale, toggleLocale } = useLanguage();
  const isArabic = locale === 'ar';
  const copy = isArabic ? {
    product: 'برنامج بسيط لتسيير مطعمك',
    headline: 'خدمة أسرع.\nحسابات أوضح.',
    intro: 'إدارة الطلبات والمبيعات من شاشة واحدة، مصممة للمطاعم الجزائرية.',
    demo: 'جرّب الصندوق',
    login: 'دخول المطعم',
    offline: 'يعمل دون إنترنت',
    offlineText: 'سجّل المبيعات دون اتصال. تتم المزامنة عند عودة الشبكة.',
    dinar: 'بالدينار الجزائري',
    dinarText: 'أسعارك ومبيعاتك بالدينار، وطرق الدفع نقداً أو بالبطاقة أو BaridiMob.',
    tracking: 'كل عملية واضحة',
    trackingText: 'تذاكر البيع، وسيلة الدفع والمبالغ المسجلة في سجل اليوم.',
    setup: 'ابدأ من قائمة الطعام',
    setupText: 'أضف المنتجات والأسعار، ثم افتح الصندوق. بيانات المطعم تبقى خاصة.',
    start: 'افتح صندوقاً تجريبياً',
    footer: 'نقطة بيع للمطاعم الجزائرية. لا تتم معالجة أي دفع إلكتروني.'
  } : {
    product: 'Le logiciel simple pour votre restaurant',
    headline: 'Un service plus fluide.\nDes ventes plus claires.',
    intro: 'Commandes et encaissements au même endroit, pensés pour les restaurants en Algérie.',
    demo: 'Essayer la caisse',
    login: 'Espace restaurant',
    offline: 'La caisse fonctionne hors ligne',
    offlineText: 'Enregistrez vos ventes sans réseau. Elles se synchronisent à la reconnexion.',
    dinar: 'Conçue en dinars',
    dinarText: 'Prix et ventes en DZD. Saisie des règlements en espèces, carte ou BaridiMob.',
    tracking: 'Chaque ticket est suivi',
    trackingText: 'Retrouvez le détail des articles, le mode de paiement et le total de la journée.',
    setup: 'Votre menu, vos prix',
    setupText: 'Ajoutez les produits et leurs tarifs. Les données de chaque restaurant restent isolées.',
    start: 'Ouvrir la caisse démo',
    footer: 'Une caisse pour les restaurants algériens. Aucun paiement électronique n’est traité.'
  };

  return (
    <main className="pos-landing" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="pos-landing-nav">
        <Link className="pos-brand" href="/"><span className="pos-brand-mark"><ChefHat aria-hidden="true" /></span><span>DIGIFEEL <small>POS</small></span></Link>
        <nav aria-label={isArabic ? 'التنقل الرئيسي' : 'Navigation principale'}>
          <a href="#modules">{isArabic ? 'المميزات' : 'Fonctionnalités'}</a>
          <a href="#offline">{isArabic ? 'بدون إنترنت' : 'Hors ligne'}</a>
        </nav>
        <div className="pos-landing-actions">
          <ThemePicker locale={locale} compact />
          <button className="pos-language" type="button" onClick={toggleLocale} aria-label={isArabic ? 'Change language to English' : locale === 'en' ? 'Changer la langue en français' : 'Basculer la langue en arabe'}>{locale === 'fr' ? 'العربية' : locale === 'ar' ? 'EN' : 'FR'}</button>
          <Link className="pos-login-link" href="/login?next=/caisse">{copy.login}</Link>
        </div>
      </header>

      <section className="pos-hero">
        <div className="pos-hero-copy">
          <span className="pos-eyebrow"><span />{copy.product}</span>
          <h1>{copy.headline.split('\n').map((line, index) => <span key={line} className={index ? 'pos-hero-accent' : ''}>{line}</span>)}</h1>
          <p>{copy.intro}</p>
          <div className="pos-hero-actions">
            <Link className="pos-cta" href="/caisse?demo=1">{copy.demo}<ArrowDown size={17} /></Link>
            <Link className="pos-cta-secondary" href="/login?next=/caisse">{copy.login}<Check size={16} /></Link>
          </div>
          <div className="pos-hero-points"><span><CloudOff />{copy.offline}</span><span><Banknote />DZD</span></div>
        </div>
        <div className="pos-hero-device" aria-label={isArabic ? 'واجهة الصندوق' : 'Aperçu de la caisse'}>
          <div className="pos-device-top"><span>Dar El Bahia</span><span><Wifi size={14} /> {isArabic ? 'متصل' : 'En ligne'}</span></div>
          <div className="pos-device-label">{isArabic ? 'طلب جديد' : 'NOUVELLE COMMANDE'}</div>
          <div className="pos-device-item"><span><i>01</i><span><strong>Café crème</strong><small>{isArabic ? 'مشروبات' : 'Boissons'}</small></span></span><strong>180 دج</strong></div>
          <div className="pos-device-item"><span><i>02</i><span><strong>Chakchouka</strong><small>{isArabic ? 'أطباق' : 'Plats'}</small></span></span><strong>850 دج</strong></div>
          <div className="pos-device-total"><span>{isArabic ? 'المجموع' : 'Total'}</span><strong>1 030 دج</strong></div>
          <div className="pos-device-pay"><span><Banknote /> {isArabic ? 'نقداً' : 'Espèces'}</span><span><CreditCard /> BaridiMob</span></div>
          <div className="pos-device-confirm"><Check size={17} />{isArabic ? 'تسجيل البيع' : 'Enregistrer la vente'}</div>
        </div>
      </section>

      <section className="pos-feature-section" id="modules">
        <div className="pos-section-heading"><span className="pos-eyebrow">{isArabic ? 'مصمم للميدان' : 'AU RYTHME DU SERVICE'}</span><h2>{isArabic ? 'المهم في شاشة واحدة.' : 'L’essentiel, sur un seul écran.'}</h2></div>
        <div className="pos-feature-grid">
          <article className="pos-feature-card pos-feature-card--offline" id="offline"><span className="pos-feature-icon"><Wifi /></span><h3>{copy.offline}</h3><p>{copy.offlineText}</p><span className="pos-feature-index">01 / 03</span></article>
          <article className="pos-feature-card pos-feature-card--currency"><span className="pos-feature-icon"><Banknote /></span><h3>{copy.dinar}</h3><p>{copy.dinarText}</p><span className="pos-feature-index">02 / 03</span></article>
          <article className="pos-feature-card pos-feature-card--sales"><span className="pos-feature-icon"><BarChart3 /></span><h3>{copy.tracking}</h3><p>{copy.trackingText}</p><span className="pos-feature-index">03 / 03</span></article>
        </div>
      </section>

      <section className="pos-start-section">
        <div><span className="pos-eyebrow">{isArabic ? 'ابدأ بخطوات بسيطة' : 'UN DÉMARRAGE SIMPLE'}</span><h2>{copy.setup}</h2><p>{copy.setupText}</p></div>
        <div className="pos-start-modules"><span><Layers3 />{isArabic ? 'قائمة الطعام والأسعار' : 'Menu et prix'}</span><span><ShoppingBag />{isArabic ? 'صندوق البيع' : 'Caisse'}</span><span><ReceiptText />{isArabic ? 'سجل اليوم' : 'Journal des ventes'}</span><span><ArrowLeftRight />BaridiMob manuel</span><span><Clock3 />{isArabic ? 'مزامنة لاحقة' : 'Synchronisation'}</span></div>
      </section>

      <footer className="pos-landing-footer"><Link className="pos-brand" href="/"><span className="pos-brand-mark"><ChefHat aria-hidden="true" /></span><span>DIGIFEEL <small>POS</small></span></Link><p>{copy.footer}</p><Link href="/avis">{isArabic ? 'النسخة السابقة' : 'Ancien espace avis'}</Link></footer>
    </main>
  );
}
