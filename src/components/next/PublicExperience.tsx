'use client';

import React, { lazy, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Check, CircleHelp, QrCode, Radio, Star, Users } from 'lucide-react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { INSTALLATION_PACKS, PRODUCT_PRICING } from '@/src/config/product';
import { useLanguage } from './LanguageProvider';
import { SiteHeader } from './SiteHeader';

const NfcHeroScene = lazy(() => import('../NfcHeroScene').then(module => ({ default: module.NfcHeroScene })));

const steps = [
  { number: '01', key: 'scan' as const, textKey: 'scanText' as const, Icon: Radio },
  { number: '02', key: 'rate' as const, textKey: 'rateText' as const, Icon: Star },
  { number: '03', key: 'publish' as const, textKey: 'publishText' as const, Icon: QrCode }
];

export function PublicExperience() {
  const { locale, text } = useLanguage();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: true });
    const onFrame = (time: number) => lenis.raf(time * 1000);
    const onScroll = () => ScrollTrigger.update();
    gsap.ticker.add(onFrame);
    lenis.on('scroll', onScroll);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-next-reveal]').forEach(element => {
        gsap.fromTo(element, { autoAlpha: 0, y: 24 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 86%', once: true }
        });
      });
    });
    return () => {
      context.revert();
      lenis.off('scroll', onScroll);
      lenis.destroy();
      gsap.ticker.remove(onFrame);
    };
  }, []);

  return (
    <div className="product-shell immersive-site next-app">
      <SiteHeader />
      <main>
        <section className="next-home-hero" id="accueil">
          <div className="next-home-hero__copy" data-next-reveal>
            <span className="product-eyebrow"><Radio aria-hidden="true" /> {text('eyebrow')}</span>
            <h1>{text('heroTitle').split('\n').map((line, index) => (
              <React.Fragment key={line}>{index > 0 && <br />}<span className={index === 1 ? 'next-accent' : ''}>{line}</span></React.Fragment>
            ))}</h1>
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
          <div className="next-home-hero__scene" data-next-reveal>
            <div className="immersive-hero__halo" aria-hidden="true" />
            <Suspense fallback={<div className="nfc-scene-fallback" aria-label="Puce Digifeel"><Radio aria-hidden="true" /> DIGIFEEL</div>}>
              <NfcHeroScene />
            </Suspense>
            <span className="next-scene-caption">APPROCHEZ · SCANNEZ · PARTAGEZ</span>
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
            <h2>{text('pricingTitle')}</h2>
            <p>{text('pricingText')}</p>
          </div>
          <div className="next-pack-grid">
            {INSTALLATION_PACKS.map(pack => {
              const packName = locale === 'ar'
                ? pack.id === 'nfc' ? 'حزمة NFC' : pack.id === 'qr' ? 'حزمة QR' : 'الحزمة الكاملة'
                : pack.name;
              const features = locale === 'ar'
                ? pack.id === 'nfc'
                  ? ['5 شرائح NFC مخصصة', 'رابط مباشر إلى Google', 'إرشادات التركيب']
                  : pack.id === 'qr'
                    ? ['رمز QR فريد لكل طاولة', 'حوامل للطاولات', 'رابط مباشر إلى Google']
                    : ['5 شرائح NFC مخصصة', 'رموز QR للطاولات', 'مساعدة في التركيب']
                : pack.features;
              const summary = locale === 'ar'
                ? pack.id === 'nfc' ? '5 شرائح جاهزة للتركيب' : pack.id === 'qr' ? 'رموز QR لجميع الطاولات' : 'NFC وQR لمطعمك بالكامل'
                : pack.summary;
              return <article className={`next-glass-card next-pack-card ${pack.id === 'complete' ? 'next-pack-card--featured' : ''}`} data-next-reveal key={pack.id}>
                <span className="next-kicker">{packName}</span>
                <strong className="next-pricing__amount">{pack.priceEuros} <small>€ · {locale === 'ar' ? 'مرة واحدة' : 'une fois'}</small></strong>
                <p className="next-pack-card__summary">{summary}</p>
                <ul>{features.map(feature => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul>
                <Link className={`product-button ${pack.id === 'complete' ? '' : 'product-button--secondary'}`} href="/login">{locale === 'ar' ? 'إنشاء حساب المطعم' : 'Créer un compte restaurant'} <ArrowRight aria-hidden="true" /></Link>
              </article>;
            })}
          </div>
          <p className="next-pricing-note">{locale === 'ar'
            ? `لوحة التحكم اختيارية: ${PRODUCT_PRICING.monthlySubscriptionEuros} يورو شهرياً بعد تجربة مجانية لمدة ${PRODUCT_PRICING.subscriptionTrialDays} يوماً.`
            : `Tableau de bord facultatif : ${PRODUCT_PRICING.monthlySubscriptionEuros} € par mois après ${PRODUCT_PRICING.subscriptionTrialDays} jours offerts.`}</p>
        </section>

        <section className="next-section next-faq" id="faq">
          <div className="next-section-heading" data-next-reveal>
            <span><CircleHelp aria-hidden="true" /> FAQ</span>
            <h2>{text('faqTitle')}</h2>
          </div>
          <details><summary>{text('faqOne')}</summary><p>{text('faqOneAnswer')}</p></details>
          <details><summary>{text('faqTwo')}</summary><p>{text('faqTwoAnswer')}</p></details>
          <details><summary>{text('faqThree')}</summary><p>{text('faqThreeAnswer')}</p></details>
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
