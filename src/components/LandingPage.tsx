import React, { lazy, Suspense, useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown, ArrowRight, Check, FileSpreadsheet, FileText, QrCode,
  Radio, Share2, Star, TrendingUp, Users
} from 'lucide-react';
import { INSTALLATION_PACKS, PRODUCT_PRICING } from '../config/product';
import { useApp } from '../context/AppContext';

const NfcHeroScene = lazy(() => import('./NfcHeroScene').then(module => ({ default: module.NfcHeroScene })));

const useImmersiveScroll = () => {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false, anchors: true });
    const tick = (time: number) => lenis.raf(time * 1000);
    const onScroll = () => ScrollTrigger.update();
    gsap.ticker.add(tick);
    lenis.on('scroll', onScroll);

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.fromTo(element, { autoAlpha: 0, y: 28 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 86%', once: true }
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
        gsap.to(element, {
          yPercent: -8,
          ease: 'none',
          scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
        });
      });
    });

    return () => {
      context.revert();
      lenis.off('scroll', onScroll);
      lenis.destroy();
      gsap.ticker.remove(tick);
    };
  }, []);
};

const magneticProps = {
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.08;
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.08;
    event.currentTarget.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  },
  onPointerLeave: (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.transform = '';
  }
};

export const LandingPage: React.FC = () => {
  const { setMode } = useApp();
  const [contactSent, setContactSent] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  useImmersiveScroll();

  const shareSite = async () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text: 'Découvre Digifeel pour les restaurants.', url: url.toString() });
        setShareStatus('Lien partagé.');
      } else {
        await navigator.clipboard.writeText(url.toString());
        setShareStatus('Lien copié.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Le lien du site n’a pas pu être partagé.', error);
      setShareStatus('Partage indisponible. Copiez le lien depuis la barre d’adresse.');
    }
  };

  const submitContact = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactSent(true);
  };

  return (
    <div className="product-shell marketing-page immersive-site">
      <header className="product-topbar immersive-nav">
        <a className="product-brand" href="#accueil" aria-label="Digifeel, accueil">
          <img src="/icons/icon.svg" alt="" />
          DIGIFEEL
        </a>
        <nav className="product-topbar__links" aria-label="Navigation du site">
          <a href="#fonctionnement">Le parcours</a>
          <a href="#avis">Avis</a>
          <a href="#serveurs">Équipe</a>
          <a href="#gestion">Gestion</a>
          <a href="#tarifs">Tarifs</a>
        </nav>
        <button className="product-button product-button--small magnetic-button" onClick={() => setMode('workspace_demo')} {...magneticProps}>
          Voir la démo <ArrowRight aria-hidden="true" />
        </button>
      </header>

      <main id="accueil">
        <section className="immersive-hero">
          <div className="immersive-hero__copy" data-reveal>
            <span className="product-eyebrow"><Radio aria-hidden="true" /> NFC · QR · avis clients</span>
            <h1>Un geste.<br /><span>Un avis qui compte.</span></h1>
            <p>Après le repas, un scan ouvre un parcours simple : noter, laisser un mot, puis publier sur Google.</p>
            <div className="marketing-hero__actions">
              <a className="product-button magnetic-button" href="#fonctionnement">Voir le parcours <ArrowDown aria-hidden="true" /></a>
              <button className="product-button product-button--secondary magnetic-button" onClick={() => void shareSite()} {...magneticProps}>
                <Share2 aria-hidden="true" /> {shareStatus || 'Partager le site'}
              </button>
            </div>
            <p className="marketing-hero__reassurance"><Check aria-hidden="true" /> Les puces continuent de rediriger sans abonnement.</p>
          </div>
          <div className="immersive-hero__scene" data-parallax>
            <div className="immersive-hero__halo" aria-hidden="true" />
            <Suspense fallback={<div className="nfc-scene-fallback" aria-label="Puce Digifeel"><Radio /> DIGIFEEL</div>}>
              <NfcHeroScene />
            </Suspense>
            <span className="immersive-hero__caption">APPROCHEZ · SCANNEZ · PARTAGEZ</span>
          </div>
          <a className="immersive-scroll-hint" href="#fonctionnement"><span /> Défiler pour découvrir</a>
        </section>

        <section className="product-section immersive-steps" id="fonctionnement">
          <div className="product-section__heading" data-reveal>
            <span className="product-eyebrow">Le parcours client</span>
            <h2>Du repas à Google.<br />Sans détour.</h2>
          </div>
          <div className="immersive-step-grid">
            {[
              { number: '01', title: 'Scanner', text: 'Une puce sur la table ou un QR code. Pas d’application à installer.', icon: Radio },
              { number: '02', title: 'Noter', text: 'Le client choisit ses étoiles et peut ajouter un commentaire.', icon: Star },
              { number: '03', title: 'Publier', text: 'Il copie son message et ouvre la fiche Google de votre restaurant.', icon: QrCode }
            ].map(step => (
              <article className="immersive-step glass-interactive" key={step.number} data-reveal>
                <span className="immersive-step__number">{step.number}</span>
                <step.icon aria-hidden="true" className="immersive-step__icon" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="immersive-editorial" id="avis">
          <div className="immersive-editorial__index" data-reveal>01 / AVIS CLIENTS</div>
          <div className="immersive-editorial__content glass-interactive" data-reveal>
            <span className="product-eyebrow">Après chaque service</span>
            <h2>Une expérience<br />qui ne s’arrête pas à table.</h2>
            <p>Le client partage son ressenti dans Digifeel. Google est proposé à tous, quelle que soit la note.</p>
            <div className="immersive-review-card">
              <div className="immersive-review-card__stars" aria-label="Exemple : quatre étoiles">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} fill={star <= 4 ? 'currentColor' : 'none'} aria-hidden="true" />)}
              </div>
              <p>« Service attentionné, plats généreux. Nous reviendrons. »</p>
              <span>EXEMPLE DE RETOUR CLIENT</span>
            </div>
          </div>
        </section>

        <section className="immersive-team" id="serveurs">
          <div className="immersive-team__visual" data-reveal>
            <div className="immersive-team__orbit immersive-team__orbit--outer" />
            <div className="immersive-team__orbit immersive-team__orbit--inner" />
            <div className="immersive-team__center"><Users aria-hidden="true" /></div>
            <span className="immersive-team__tag immersive-team__tag--one">Équipe</span>
            <span className="immersive-team__tag immersive-team__tag--two">Service</span>
          </div>
          <div className="immersive-team__copy" data-reveal>
            <span className="immersive-editorial__index">02 / SERVEURS</span>
            <h2>Chaque bon service<br />a un visage.</h2>
            <p>Associez les retours aux membres de votre équipe et valorisez les attentions qui font revenir vos clients.</p>
            <button className="product-text-link" onClick={() => setMode('workspace_demo')}>Explorer l’espace restaurateur <ArrowRight aria-hidden="true" /></button>
          </div>
        </section>

        <section className="immersive-management" id="gestion">
          <div className="immersive-management__intro" data-reveal>
            <span className="immersive-editorial__index">03 / GESTION</span>
            <h2>Vos services,<br />en un regard.</h2>
            <p>Une démonstration avec données fictives. Les exports sont testables dans l’espace restaurateur.</p>
            <button className="product-button magnetic-button" onClick={() => setMode('workspace_demo')} {...magneticProps}>Ouvrir le tableau de bord <ArrowRight aria-hidden="true" /></button>
          </div>
          <div className="immersive-dashboard glass-interactive" data-reveal>
            <div className="immersive-dashboard__top">
              <span>VOTRE RESTAURANT</span>
              <span className="immersive-dashboard__live"><i /> DONNÉES D’EXEMPLE</span>
            </div>
            <div className="immersive-dashboard__metrics">
              <div><span>Scans cette semaine</span><strong>261</strong><small><TrendingUp aria-hidden="true" /> +18 %</small></div>
              <div><span>Note moyenne</span><strong>4,7<small>/5</small></strong><span className="immersive-dashboard__stars" aria-hidden="true">★★★★★</span></div>
            </div>
            <div className="immersive-dashboard__chart" role="img" aria-label="Exemple de progression des scans sur sept jours">
              {[28, 42, 35, 54, 47, 77, 61].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="immersive-dashboard__footer">
              <span>SCANS · 7 JOURS</span>
              <div>
                <button type="button" aria-label="Voir l’export PDF" onClick={() => setMode('workspace_demo')}><FileText aria-hidden="true" /></button>
                <button type="button" aria-label="Voir l’export Excel" onClick={() => setMode('workspace_demo')}><FileSpreadsheet aria-hidden="true" /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="product-section marketing-pricing immersive-pricing" id="tarifs">
          <div className="product-section__heading" data-reveal>
            <span className="product-eyebrow">Simple et sans surprise</span>
            <h2>À vous de choisir.</h2>
            <p>Installation en paiement unique. Le tableau de bord reste facultatif.</p>
          </div>
          <div className="marketing-pricing__summary">
            {INSTALLATION_PACKS.map((pack, index) => (
              <article className={`pricing-card glass-interactive${pack.id === 'complete' ? ' pricing-card--featured' : ''}`} key={pack.id} data-reveal>
                <span className="immersive-pack-index">0{index + 1} / INSTALLATION</span>
                {pack.id === 'complete' && <span className="pricing-card__badge">NFC + QR</span>}
                <h3>{pack.name}</h3>
                <p>{pack.summary}</p>
                <strong className="pricing-card__price">{pack.priceEuros} <small>€</small></strong>
                <span className="pricing-card__once">Paiement unique · simulation</span>
                <button className="product-button product-button--full" onClick={() => setMode('pricing')} {...magneticProps}>
                  Choisir ce pack <ArrowRight aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
          <div className="marketing-subscription glass-interactive" data-reveal>
            <span className="marketing-subscription__icon"><Check aria-hidden="true" /></span>
            <p><strong>Tableau de bord et exports : {PRODUCT_PRICING.monthlySubscriptionEuros} € / mois</strong><br />Facultatif. Les puces restent actives si vous arrêtez.</p>
            <button className="product-button product-button--secondary" onClick={() => setMode('pricing')}>Détails des tarifs</button>
          </div>
        </section>

        <section className="marketing-contact glass-interactive" id="contact" data-reveal>
          <div>
            <span className="product-eyebrow">Parlons de votre restaurant</span>
            <h2>Prêt à tester<br />un scan ?</h2>
            <p>Découvrez le parcours du restaurateur avec des données d’exemple.</p>
          </div>
          <div className="immersive-contact-actions">
            <button className="product-button magnetic-button" onClick={() => setMode('workspace_demo')} {...magneticProps}>Voir la démo restaurateur <ArrowRight aria-hidden="true" /></button>
            <button className="product-button product-button--secondary" onClick={() => setMode('admin_demo')}>Voir la démo admin</button>
            <button className="product-text-link" onClick={() => void shareSite()}><Share2 aria-hidden="true" /> {shareStatus || 'Partager Digifeel'}</button>
          </div>
        </section>
      </main>

      <footer className="product-footer immersive-footer">
        <a className="product-brand" href="#accueil"><img src="/icons/icon.svg" alt="" />DIGIFEEL</a>
        <span>Des avis clients, en un scan.</span>
        <a href="#contact">Nous contacter</a>
      </footer>
    </div>
  );
};
