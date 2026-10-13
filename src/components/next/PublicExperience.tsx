'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Building2, Check, CircleHelp, Coins, FileSpreadsheet, LayoutDashboard, QrCode, Radio, ShoppingCart, Star, Users } from 'lucide-react';
import { PRODUCT_PRICING } from '@/src/config/product';
import { useLanguage } from './LanguageProvider';
import { SiteHeader } from './SiteHeader';
import { ImmersiveBackground } from './ImmersiveBackground';
import { LandingMotion } from './LandingMotion';
import { ShinyText, SpotlightCard } from './ReactBits';

const steps = [
  { number: '01', key: 'scan' as const, textKey: 'scanText' as const, Icon: Radio },
  { number: '02', key: 'rate' as const, textKey: 'rateText' as const, Icon: Star },
  { number: '03', key: 'publish' as const, textKey: 'publishText' as const, Icon: QrCode }
];

const modules = [
  { titleKey: 'featureCaisseTitle' as const, textKey: 'featureCaisseText' as const, Icon: ShoppingCart },
  { titleKey: 'featureReportsTitle' as const, textKey: 'featureReportsText' as const, Icon: FileSpreadsheet },
  { titleKey: 'featureReviewsTitle' as const, textKey: 'featureReviewsText' as const, Icon: Star },
  { titleKey: 'featureTipsTitle' as const, textKey: 'featureTipsText' as const, Icon: Coins },
  { titleKey: 'featureDashboardTitle' as const, textKey: 'featureDashboardText' as const, Icon: LayoutDashboard },
  { titleKey: 'featureMultiTitle' as const, textKey: 'featureMultiText' as const, Icon: Building2 }
];

function HeroMockupCard() {
  return (
    <div className="next-mockup-card">
      <div className="next-mockup-card__bar">
        <span /><span /><span />
        <div className="next-mockup-card__tabs">
          <span className="is-active">Caisse</span>
          <span>Avis</span>
          <span>Analyse</span>
        </div>
      </div>
      <div className="next-mockup-card__body">
        <div className="next-mockup-stat">
          <span>Chiffre du jour</span>
          <strong>1 248 €</strong>
        </div>
        <div className="next-mockup-stat">
          <span>Avis Google</span>
          <strong>4.9 ★</strong>
        </div>
        <div className="next-mockup-bars">
          <i style={{ height: '38%' }} /><i style={{ height: '62%' }} /><i style={{ height: '48%' }} />
          <i style={{ height: '82%' }} /><i style={{ height: '56%' }} /><i style={{ height: '70%' }} />
        </div>
      </div>
    </div>
  );
}

export function PublicExperience() {
  const { locale, text } = useLanguage();

  return (
    <div className="product-shell immersive-site next-app">
      <ImmersiveBackground />
      <SiteHeader />
      <LandingMotion />
      <main>
        <section className="next-home-hero" id="accueil">
          <div className="next-home-hero__brandmark" aria-hidden="true" data-next-reveal>
            <span className="next-home-hero__brandmark-glow" />
            <img src="/icons/icon-gold.svg" alt="" />
          </div>
          <span className="product-eyebrow next-home-hero__eyebrow" data-next-reveal><Radio aria-hidden="true" /> {text('eyebrow')}</span>
          <h1 className="next-home-hero__title" data-next-reveal>{text('heroTitle').split('\n').map((line, index) => (
            <React.Fragment key={line}>{index > 0 && <br />}<span             className={index === 1 ? 'next-accent' : ''}>{index === 1 ? <ShinyText>{line}</ShinyText> : line}</span></React.Fragment>
          ))}</h1>
          <div className="next-home-hero__copy" data-next-reveal>
            <p>{text('heroText')}</p>
            <div className="next-home-hero__buttons">
              <a className="product-button magnetic-button" href="#fonctionnement">
                {text('explore')} <ArrowDown aria-hidden="true" />
              </a>
              <Link className="product-button product-button--secondary" href="/demo">
                {text('tryDemo')} <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <p className="next-home-hero__trust"><Check aria-hidden="true" /> {text('promise')}</p>
          </div>
          <div className="next-home-hero__mockup" aria-hidden="true" data-next-reveal>
            <HeroMockupCard />
            <div className="next-mockup-card--reflection">
              <HeroMockupCard />
            </div>
          </div>
          <span className="next-scene-caption" aria-hidden="true">APPROCHEZ · SCANNEZ · PARTAGEZ</span>
        </section>

        <section className="next-section" id="logiciel">
          <div className="next-section-heading" data-next-reveal>
            <span>{text('modulesEyebrow')}</span>
            <h2>{text('modulesTitle').split('\n').map((line, index) => (
              <React.Fragment key={line}>{index > 0 && <br />}<span className={index === 1 ? 'next-accent' : ''}>{line}</span></React.Fragment>
            ))}</h2>
            <p>{text('modulesText')}</p>
          </div>
          <div className="next-feature-grid">
            {modules.map(({ titleKey, textKey, Icon }) => (
              <SpotlightCard className="next-glass-card next-feature-card" data-next-reveal key={titleKey}>
                <Icon aria-hidden="true" />
                <h3>{text(titleKey)}</h3>
                <p>{text(textKey)}</p>
                            </SpotlightCard>
            ))}
          </div>
        </section>

        <section className="next-section" id="fonctionnement">
          <div className="next-section-heading" data-next-reveal>
            <span>{text('flowEyebrow')}</span>
            <h2>{text('flowTitle')}</h2>
          </div>
          <div className="next-step-grid">
            {steps.map(({ number, key, textKey, Icon }) => (
              <article className="next-glass-card next-step-card" data-next-reveal key={number}>
                <span>{number} / 03</span>
                <Icon aria-hidden="true" />
                <h3>{text(key)}</h3>
                <p>{text(textKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="next-editorial" id="avis">
          <span className="next-editorial__index" data-next-reveal>01 / {text('reviewsEyebrow').toLocaleUpperCase(locale)}</span>
          <article className="next-glass-card next-editorial__panel" data-next-reveal>
            <span className="next-kicker">{text('reviewsEyebrow')}</span>
            <h2>{text('reviewsTitle')}</h2>
            <p className="next-muted">{text('reviewsText')}</p>
            <div className="next-review-quote">
              <div className="next-review-quote__stars" aria-label={locale === 'ar' ? 'خمس نجوم' : 'Exemple : cinq étoiles'}>
                {[1, 2, 3, 4, 5].map(star => <Star key={star} fill="currentColor" aria-hidden="true" />)}
              </div>
              <p>{locale === 'ar' ? '« خدمة رائعة وأطباق لذيذة. سنعود قريباً. »' : '« Service attentionné, plats généreux. Nous reviendrons. »'}</p>
              <small>{locale === 'ar' ? 'مثال على رأي زبون' : 'EXEMPLE DE RETOUR CLIENT'}</small>
            </div>
          </article>
        </section>

        <section className="next-team" id="serveurs">
          <div className="next-team-art" data-next-reveal>
            <div className="immersive-team__orbit immersive-team__orbit--outer" />
            <div className="immersive-team__orbit immersive-team__orbit--inner" />
            <div className="next-team-art__center"><Users aria-hidden="true" /></div>
          </div>
          <div data-next-reveal>
            <span className="next-kicker">02 / {text('navTeam').toLocaleUpperCase(locale)}</span>
            <h2>{text('teamTitle')}</h2>
            <p>{text('teamText')}</p>
            <Link className="product-button product-button--secondary" href="/dashboard?demo=1">
              {text('navDashboard')} <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="next-section next-dashboard-teaser" id="gestion">
          <div className="next-dashboard-teaser__copy" data-next-reveal>
            <span className="next-kicker">03 / {text('navDashboard').toLocaleUpperCase(locale)}</span>
            <h2>{text('dashboardTitle')}</h2>
            <p>{text('dashboardText')}</p>
            <Link className="product-button magnetic-button" href="/dashboard?demo=1">
              {text('demo')} <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="next-glass-card next-dashboard-mini" data-next-reveal>
            <div className="immersive-dashboard__top">
              <span>DIGIFEEL · LYON</span>
              <span className="immersive-dashboard__live"><i /> EXEMPLE</span>
            </div>
            <div className="next-dashboard-mini__stats">
              <div><span>{locale === 'ar' ? 'عمليات المسح هذا الأسبوع' : 'Scans cette semaine'}</span><strong>261</strong><small><Check aria-hidden="true" /> +18 %</small></div>
              <div><span>{locale === 'ar' ? 'متوسط التقييم' : 'Note moyenne'}</span><strong>4,7<small>/5</small></strong><span className="next-accent">★★★★★</span></div>
            </div>
            <div className="next-bars" role="img" aria-label={locale === 'ar' ? 'نشاط المسح خلال الأسبوع' : 'Activité des scans sur sept jours'}>
              {[34, 48, 41, 66, 54, 82, 69].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
          </div>
        </section>

        <section className="next-section" id="tarifs">
          <div className="next-section-heading" data-next-reveal>
            <span>{text('navPricing')}</span>
            <h2>{locale === 'ar' ? 'تسعيرة واضحة لكل طاولة' : 'Une offre simple pour votre restaurant'}</h2>
            <p>{locale === 'ar'
              ? `رمز QR لكل طاولة مقابل ${PRODUCT_PRICING.installationPricePerTableEuros} يورو مرة واحدة. قائمتان مجانيتان بالذكاء الاصطناعي، ثم ${PRODUCT_PRICING.monthlySubscriptionEuros} يورو شهرياً للمساعد الذكي.`
              : `Un QR code de table coûte ${PRODUCT_PRICING.installationPricePerTableEuros} €, une fois. Deux menus IA sont offerts, puis l’assistant de gestion et de comptabilité est à ${PRODUCT_PRICING.monthlySubscriptionEuros} €/mois.`}</p>
          </div>
          <div className="next-pack-grid">
            <article className="next-glass-card next-pack-card next-pack-card--featured" data-next-reveal>
              <span className="next-kicker">{locale === 'ar' ? 'التركيب لكل طاولة' : 'Installation par table'}</span>
              <strong className="next-pricing__amount">{PRODUCT_PRICING.installationPricePerTableEuros} <small>€ / {locale === 'ar' ? 'طاولة' : 'table'}</small></strong>
              <p className="next-pack-card__summary">{locale === 'ar' ? 'رمز QR مخصص لكل طاولة. احسب التكلفة حسب عدد الطاولات.' : 'Un QR code unique par table. Le total dépend du nombre de tables à équiper.'}</p>
              <ul>
                <li><Check aria-hidden="true" />{locale === 'ar' ? 'رمز QR لكل طاولة' : 'QR code pour chaque table'}</li>
                <li><Radio aria-hidden="true" />{locale === 'ar' ? 'شرائح NFC اختيارية للنادل، بسعر يتم الاتفاق عليه' : 'Puces NFC pour les serveurs en option, sur devis'}</li>
              </ul>
              <Link className="product-button" href="/login">{locale === 'ar' ? 'تواصل معنا' : 'Demander une installation'} <ArrowRight aria-hidden="true" /></Link>
            </article>
            <article className="next-glass-card next-pack-card" data-next-reveal>
              <span className="next-kicker">{locale === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'Assistant IA restaurant'}</span>
              <strong className="next-pricing__amount">{PRODUCT_PRICING.monthlySubscriptionEuros} <small>€ / {locale === 'ar' ? 'شهر' : 'mois'}</small></strong>
              <p className="next-pack-card__summary">{locale === 'ar'
                ? 'أنشئ قائمتين مجاناً، ثم اشترك لاستخدام مساعد إدارة المبيعات.'
                : `Deux menus web avec lien et QR code sont offerts. L’abonnement donne accès aux synthèses IA des ventes et aux fonctions de gestion.`}</p>
              <ul>
                <li><Check aria-hidden="true" />{locale === 'ar' ? 'قائمتان مجاناً مع رابط ورمز QR' : `${PRODUCT_PRICING.freeAiMenuGenerations} menus créés gratuitement avec lien et QR code`}</li>
                <li><Check aria-hidden="true" />{locale === 'ar' ? 'ملخصات ذكية للمبيعات المسجلة' : 'Synthèses IA des ventes et annulations déjà enregistrées'}</li>
                <li><Check aria-hidden="true" />{locale === 'ar' ? 'إدارة الاشتراك عبر Stripe' : 'Sans période d’essai · résiliation via Stripe'}</li>
              </ul>
              <Link className="product-button" href="/login">{locale === 'ar' ? 'تسجيل الدخول للاشتراك' : 'Se connecter pour souscrire'} <ArrowRight aria-hidden="true" /></Link>
            </article>
          </div>
          <p className="next-pricing-note">{locale === 'ar'
            ? 'تُعرض وسائل الدفع المتاحة عبر Stripe حسب البلد والجهاز. BaridiMob تحويل يدوي ولا يدعم التجديد التلقائي.'
            : 'Stripe affiche les moyens de paiement disponibles selon le pays et l’appareil. BaridiMob reste un virement manuel, sans renouvellement automatique.'}</p>
        </section>

        <section className="next-section next-faq" id="faq">
          <div className="next-section-heading" data-next-reveal>
            <span><CircleHelp aria-hidden="true" /> FAQ</span>
            <h2>{text('faqTitle')}</h2>
          </div>
          <details><summary>{text('faqOne')}</summary><p>{text('faqOneAnswer')}</p></details>
          <details><summary>{text('faqTwo')}</summary><p>{text('faqTwoAnswer')}</p></details>
          <details><summary>{text('faqThree')}</summary><p>{text('faqThreeAnswer')}</p></details>
          <details><summary>{text('faqFour')}</summary><p>{text('faqFourAnswer')}</p></details>
          <details><summary>{text('faqFive')}</summary><p>{text('faqFiveAnswer')}</p></details>
        </section>

        <section className="next-contact next-glass-card next-section" id="contact">
          <div>
            <span className="next-kicker">{text('contact')}</span>
            <h2>{locale === 'ar' ? 'هل تريد تجربة المسح؟' : 'Envie d’essayer un scan ?'}</h2>
          </div>
          {process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
            ? <a className="product-button" href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{text('whatsapp')} <ArrowRight aria-hidden="true" /></a>
            : <span className="next-muted">{locale === 'ar' ? 'أضف رقم WhatsApp للتواصل.' : 'WhatsApp sera disponible après configuration du numéro.'}</span>}
        </section>
      </main>
      <footer className="next-footer">
        <Link className="product-brand" href="/"><img src="/icons/icon.svg" alt="" />DIGIFEEL</Link>
        <span>{text('footer')}</span>
        <Link className="next-link" href="/demo">{text('demo')}</Link>
      </footer>
    </div>
  );
}
