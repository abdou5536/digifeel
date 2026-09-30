import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CreditCard,
  Globe,
  Lock,
  QrCode,
  Radio,
  ScanLine,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundFX } from '../utils/soundEffects';
import { CustomDomainModal } from './CustomDomainModal';

const particles = Array.from({ length: 22 }, (_, index) => index);

export const LandingPage: React.FC = () => {
  const {
    setMode,
    setIsOrderModalOpen,
    setCurrentRestaurantId,
    setShowDemoAccount,
    setIsDemoMode,
    restaurant,
    registeredNfcChips
  } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [isDomainOpen, setIsDomainOpen] = React.useState(false);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    event.currentTarget.style.setProperty('--pointer-tilt-x', `${(event.clientY / window.innerHeight - 0.5) * -7}deg`);
    event.currentTarget.style.setProperty('--pointer-tilt-y', `${(event.clientX / window.innerWidth - 0.5) * 9}deg`);
  };

  const resetPointer = () => {
    heroRef.current?.style.removeProperty('--pointer-tilt-x');
    heroRef.current?.style.removeProperty('--pointer-tilt-y');
  };

  const openDemo = (view: 'dashboard' | 'server' = 'dashboard') => {
    setShowDemoAccount(true);
    setCurrentRestaurantId('resto-demo');
    setIsDemoMode(true);
    const url = new URL(window.location.href);
    url.searchParams.set('demo', view);
    window.history.replaceState(null, '', url);
    setMode(view === 'server' ? 'server' : 'demo');
    soundFX.playHoverTick();
  };

  return (
    <div className="landing-page">
      <section
        ref={heroRef}
        className="landing-hero"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
      >
        <div className="landing-hero__grid" aria-hidden="true" />
        <div className="landing-hero__glow landing-hero__glow--one" aria-hidden="true" />
        <div className="landing-hero__glow landing-hero__glow--two" aria-hidden="true" />
        <div className="landing-particles" aria-hidden="true">
          {particles.map(particle => (
            <span
              className="landing-particle"
              key={particle}
              style={{
                '--particle-x': `${(particle * 47 + 13) % 100}%`,
                '--particle-y': `${(particle * 67 + 9) % 100}%`,
                '--particle-delay': `${(particle % 9) * -0.7}s`,
                '--particle-duration': `${5 + (particle % 6)}s`
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="landing-hero__inner">
          <motion.div
            className="landing-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="landing-eyebrow">
              <span className="landing-eyebrow__pulse" />
              <span>LA NOUVELLE EXPÉRIENCE RESTAURANT</span>
              <Sparkles aria-hidden="true" />
            </div>

            <h1 className="landing-title">
              Chaque instant
              <br />
              <span>compte.</span>
            </h1>
            <p className="landing-description">
              Le service laisse une impression. Digifeel vous aide à la comprendre,
              à la mesurer et à la rendre inoubliable.
            </p>

            <div className="landing-actions">
              <motion.button
                type="button"
                className="landing-button landing-button--primary"
                onClick={() => openDemo()}
                whileTap={{ scale: 0.97 }}
              >
                <span>Explorer le tableau de bord</span>
                <ArrowRight aria-hidden="true" />
              </motion.button>
              <motion.button
                type="button"
                className="landing-button landing-button--quiet"
                onClick={() => setMode('client')}
                whileTap={{ scale: 0.97 }}
              >
                <span className="landing-play"><Smartphone aria-hidden="true" /></span>
                <span>Voir l’expérience client</span>
              </motion.button>
            </div>

            <div className="landing-proof">
              <div className="landing-proof__avatars" aria-hidden="true">
                <span>J</span><span>M</span><span>A</span><span><Users /></span>
              </div>
              <div>
                <div className="landing-proof__stars" aria-label="5 étoiles">
                  {[0, 1, 2, 3, 4].map(star => <Star key={star} fill="currentColor" />)}
                </div>
                <span>Le service qui fait la différence</span>
              </div>
              <span className="landing-proof__divider" />
              <span className="landing-proof__live"><i /> En temps réel</span>
            </div>
          </motion.div>

          <motion.div
            className="landing-visual"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 1, delay: prefersReducedMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Aperçu de l’expérience Digifeel"
          >
            <div className="landing-orbit landing-orbit--outer" aria-hidden="true" />
            <div className="landing-orbit landing-orbit--inner" aria-hidden="true" />
            <div className="landing-orb-halo" aria-hidden="true" />
            <div className="landing-token-scene" aria-hidden="true">
              <div className="landing-token">
                <div className="landing-token__edge" />
                <div className="landing-token__face">
                  <div className="landing-token__shine" />
                  <span className="landing-token__mark"><Radio /></span>
                  <span className="landing-token__brand">DIGIFEEL</span>
                  <span className="landing-token__caption">TAP TO CONNECT</span>
                </div>
              </div>
            </div>
            <div className="landing-float-card landing-float-card--review glass-interactive">
              <div className="landing-float-card__icon"><Star fill="currentColor" /></div>
              <div>
                <span className="landing-float-card__label">Nouvel avis</span>
                <strong>Une équipe au top !</strong>
                <span className="landing-float-card__rating">★★★★★ <small>5.0</small></span>
              </div>
              <span className="landing-float-card__check"><Check /></span>
            </div>
            <div className="landing-float-card landing-float-card--score glass-interactive">
              <span className="landing-float-card__label">Satisfaction client</span>
              <div className="landing-score">
                <strong>4.9</strong><span>/ 5</span>
                <span className="landing-score__trend"><ArrowUpRight /> +12%</span>
              </div>
              <div className="landing-score__bars" aria-hidden="true">
                {[34, 48, 42, 63, 55, 78, 68, 91, 73, 100, 83, 96].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div className="landing-float-card landing-float-card--nfc">
              <span className="landing-nfc-icon"><ScanLine /></span>
              <span><strong>Un simple geste.</strong><small>Un retour précieux.</small></span>
              <Zap aria-hidden="true" />
            </div>
            <span className="landing-visual-caption"><i /> TECHNOLOGIE NFC · SIMPLE & INSTANTANÉE</span>
          </motion.div>
        </div>

        <div className="landing-hero__bottom">
          <span>LA SUITE DE VOTRE SERVICE, EN MIEUX.</span>
          <a href="#landing-features" aria-label="Découvrir les fonctionnalités">
            <ArrowDown aria-hidden="true" />
          </a>
          <span>01 — 02</span>
        </div>
      </section>

      <section className="landing-metrics" aria-label="Les avantages de Digifeel">
        <div className="landing-metric">
          <span className="landing-metric__icon"><Radio /></span>
          <span><strong>NFC & QR</strong><small>Sans application à installer</small></span>
        </div>
        <div className="landing-metric">
          <span className="landing-metric__icon landing-metric__icon--violet"><Activity /></span>
          <span><strong>Instantané</strong><small>Les retours, en direct</small></span>
        </div>
        <div className="landing-metric">
          <span className="landing-metric__icon landing-metric__icon--green"><Lock /></span>
          <span><strong>À votre image</strong><small>Votre établissement, vos règles</small></span>
        </div>
        <div className="landing-metric">
          <span className="landing-metric__value">{registeredNfcChips.length}</span>
          <span><strong>{restaurant.name || 'Votre restaurant'}</strong><small>Puces prêtes à l’emploi</small></span>
        </div>
      </section>

      <section className="landing-features" id="landing-features">
        <motion.div
          className="landing-section-heading"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: prefersReducedMotion ? 0.15 : 0.55 }}
        >
          <span className="landing-section-kicker">UNE EXPÉRIENCE QUI FAIT SENS</span>
          <h2>Le détail qui change <span>tout.</span></h2>
          <p>La technologie s’efface. Le lien humain reste au premier plan.</p>
        </motion.div>
        <div className="landing-feature-grid">
          <motion.article
            className="landing-feature-card landing-feature-card--cyan glass-interactive"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.55 }}
          >
            <div className="landing-feature-card__icon"><Radio /></div>
            <span className="landing-feature-card__index">01 / CONNECTER</span>
            <h3>Un geste suffit.</h3>
            <p>Une puce NFC ou un QR code à table. Vos clients accèdent instantanément à votre expérience.</p>
            <button type="button" onClick={() => setIsOrderModalOpen(true)}>
              Découvrir les packs <ArrowRight />
            </button>
            <div className="landing-feature-card__glow" />
          </motion.article>
          <motion.article
            className="landing-feature-card landing-feature-card--violet glass-interactive"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.55, delay: 0.08 }}
          >
            <div className="landing-feature-card__icon"><Star /></div>
            <span className="landing-feature-card__index">02 / ÉCOUTER</span>
            <h3>Chaque avis compte.</h3>
            <p>Recueillez des retours sincères sur le service et invitez vos clients satisfaits à partager leur expérience.</p>
            <button type="button" onClick={() => setMode('client')}>
              Tester le parcours <ArrowRight />
            </button>
            <div className="landing-feature-card__glow" />
          </motion.article>
          <motion.article
            className="landing-feature-card landing-feature-card--green glass-interactive"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.55, delay: 0.16 }}
          >
            <div className="landing-feature-card__icon"><CreditCard /></div>
            <span className="landing-feature-card__index">03 / PROGRESSER</span>
            <h3>Voyez plus clair.</h3>
            <p>Un tableau de bord simple pour suivre les retours, les pourboires et l’expérience de votre équipe.</p>
            <button type="button" onClick={() => openDemo()}>
            Explorer la démo interactive <ArrowRight />
            </button>
            <div className="landing-feature-card__glow" />
          </motion.article>
        </div>
      </section>

      <section className="landing-bottom-cta">
        <div className="landing-bottom-cta__orb" aria-hidden="true" />
        <div>
          <span className="landing-section-kicker">VOTRE PROCHAINE BELLE HISTOIRE COMMENCE ICI</span>
          <h2>Prêt à écouter autrement ?</h2>
          <p>Un petit geste pour vos clients. Une grande différence pour votre équipe.</p>
        </div>
        <div className="landing-bottom-cta__actions">
          <button type="button" className="landing-button landing-button--primary" onClick={() => setIsOrderModalOpen(true)}>
            <span>Voir les packs</span><ArrowRight />
          </button>
          <button
            type="button"
            className="landing-domain-link"
            onClick={() => {
              setIsDomainOpen(true);
              soundFX.playHoverTick();
            }}
          >
            <Globe /> Configurer un domaine
          </button>
          <button type="button" className="landing-domain-link" onClick={() => setMode('studio')}>
            <QrCode /> Gérer mes QR codes
          </button>
          <button type="button" className="landing-domain-link" onClick={() => openDemo('server')}>
            <Smartphone /> Voir l’espace serveur en démo
          </button>
        </div>
      </section>
      <CustomDomainModal isOpen={isDomainOpen} onClose={() => setIsDomainOpen(false)} />
    </div>
  );
};
