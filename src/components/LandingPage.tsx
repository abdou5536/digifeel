/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Landing Page
 * Immersive futuristic presentation featuring the interactive 3D NFC hero,
 * 3-step explanation, live interactive smartphone simulator, transparent pricing,
 * WhatsApp contact, and multilingual French/Arabic support.
 */

import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  QrCode,
  Radio,
  ScanLine,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Zap,
  HelpCircle,
  MessageCircle,
  ShieldCheck,
  Award,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundFX } from '../utils/soundEffects';
import { NfcHero3D } from './NfcHero3D';
import { InteractivePhoneDemo } from './InteractivePhoneDemo';

export const LandingPage: React.FC = () => {
  const {
    t,
    lang,
    setMode,
    setIsOrderModalOpen,
    setCurrentRestaurantId,
    setShowDemoAccount,
    setIsDemoMode,
    restaurant,
    faqItems,
    payoutConfig
  } = useApp();

  const prefersReducedMotion = useReducedMotion();

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

  const whatsappUrl = `https://wa.me/${(payoutConfig.whatsappNumber || '+33612345678').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    'Bonjour Digifeel, je souhaite équiper mon restaurant avec le pack de puces NFC & QR codes.'
  )}`;

  return (
    <div className="landing-page min-h-screen text-slate-100 overflow-x-hidden selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. HERO SECTION WITH 3D NFC CHIP */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-8 pb-20 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.8 }}
            className="lg:col-span-7 space-y-6 text-left"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-amber-300 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{t.nfcChipLabel}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 ml-1" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15] font-sans">
              {t.heroTitle1}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 underline decoration-amber-400/30 decoration-wavy decoration-2">
                {t.heroTitleHighlight}
              </span>{' '}
              {t.heroTitle2}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <motion.button
                type="button"
                onClick={() => {
                  setIsOrderModalOpen(true);
                  soundFX.playHoverTick();
                }}
                className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm sm:text-base shadow-[0_0_35px_rgba(245,158,11,0.35)] hover:shadow-[0_0_50px_rgba(245,158,11,0.55)] transition-all flex items-center gap-2.5 cursor-pointer active:scale-98"
                whileTap={{ scale: 0.98 }}
              >
                <span>{t.heroCtaOrder}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                type="button"
                onClick={() => openDemo('dashboard')}
                className="py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-sm sm:text-base font-bold transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer active:scale-98"
                whileTap={{ scale: 0.98 }}
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>{t.heroCtaDemo}</span>
              </motion.button>
            </div>

            {/* Quick Proof Metrics */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1 text-amber-400 font-extrabold text-lg sm:text-xl">
                  <span>4.9</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-white/50 mt-0.5">{t.heroStatRating}</p>
              </div>

              <div>
                <div className="text-white font-extrabold text-lg sm:text-xl font-mono">
                  3 sec
                </div>
                <p className="text-[11px] text-white/50 mt-0.5">{t.heroStatSpeed}</p>
              </div>

              <div>
                <div className="text-emerald-400 font-extrabold text-lg sm:text-xl font-mono">
                  +300%
                </div>
                <p className="text-[11px] text-white/50 mt-0.5">{t.heroStatConversion}</p>
              </div>
            </div>
          </motion.div>

          {/* Right 3D Interactive NFC Display */}
          <div className="lg:col-span-5 flex justify-center">
            <NfcHero3D />
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. HOW IT WORKS (3 SIMPLE STEPS) */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Processus sans friction</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {t.howTitle}
          </h2>
          <p className="mt-3 text-white/60 text-sm sm:text-base">
            {t.howSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-xl space-y-4 hover:border-amber-400/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ScanLine className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">{t.step1Title}</h3>
            <p className="text-sm text-white/65 leading-relaxed">{t.step1Desc}</p>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-xl space-y-4 hover:border-amber-400/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Star className="w-7 h-7 fill-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{t.step2Title}</h3>
            <p className="text-sm text-white/65 leading-relaxed">{t.step2Desc}</p>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-xl space-y-4 hover:border-emerald-400/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">{t.step3Title}</h3>
            <p className="text-sm text-white/65 leading-relaxed">{t.step3Desc}</p>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. INTERACTIVE SMARTPHONE DEMO SECTION */}
      {/* ------------------------------------------------------------- */}
      <section className="py-12 bg-gradient-to-b from-transparent via-[#0a0f1d]/60 to-transparent border-t border-white/10">
        <InteractivePhoneDemo />
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. PRICING & PACK INSTALLATION */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-white/10" id="tarifs">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rentable dès le 1er week-end</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {t.pricingTitle}
          </h2>
          <p className="mt-3 text-white/60 text-sm sm:text-base">
            {t.pricingSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Main Pack: 100€ */}
          <div className="p-8 sm:p-10 rounded-[2.5rem] bg-[#0d1322] border-2 border-amber-400/50 relative shadow-[0_20px_70px_rgba(245,158,11,0.15)] flex flex-col justify-between">
            <div className="absolute -top-4 right-8 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs tracking-wider uppercase shadow-md">
              Offre Complète
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white">{t.packTitle}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
                  {t.packPrice}
                </span>
                <span className="text-xs text-amber-300 font-semibold">
                  {t.packPriceSub}
                </span>
              </div>

              <ul className="mt-8 space-y-3.5 text-sm text-white/80">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{t.packFeature1}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{t.packFeature2}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{t.packFeature3}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{t.packFeature4}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{t.packFeature5}</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOrderModalOpen(true);
                soundFX.playHoverTick();
              }}
              className="mt-8 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{t.packCta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Subscription Card: 29€ / month */}
          <div className="p-8 sm:p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/15 relative backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">{t.subTitle}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
                  {t.subPrice}
                </span>
                <span className="text-xs text-white/50">
                  {t.subPriceSub}
                </span>
              </div>

              <ul className="mt-8 space-y-3.5 text-sm text-white/80">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.subFeature1}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.subFeature2}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.subFeature3}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.subFeature4}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/60">
              Inclus d’office sans frais pendant 30 jours avec le Pack d’Installation.
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. FAQ & DIRECT WHATSAPP CONTACT */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Questions Fréquentes
          </h2>
          <p className="text-sm text-white/60 mt-2">
            Tout ce que vous devez savoir pour démarrer simplement.
          </p>
        </div>

        <div className="space-y-4">
          <details className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 open:border-amber-400/40 transition-colors">
            <summary className="font-bold text-white text-sm sm:text-base cursor-pointer list-none flex items-center justify-between">
              <span>Mes clients ont-ils besoin d’installer une application ?</span>
              <span className="text-amber-400 font-mono group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed">
              Non, absolument aucune. Les smartphones récents (iPhone et Android) intègrent un lecteur NFC automatique. Il suffit de poser le téléphone sur la puce pour que le navigateur ouvre la page d’avis en une seconde.
            </p>
          </details>

          <details className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 open:border-amber-400/40 transition-colors">
            <summary className="font-bold text-white text-sm sm:text-base cursor-pointer list-none flex items-center justify-between">
              <span>Comment mes pourboires et avis sont-ils comptabilisés ?</span>
              <span className="text-amber-400 font-mono group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed">
              Chaque puce NFC est assignée soit à un serveur en salle, soit à une table spécifique. Vous pouvez suivre les statistiques précises dans votre tableau de bord et exporter des bilans au format PDF ou Excel.
            </p>
          </details>

          <details className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 open:border-amber-400/40 transition-colors">
            <summary className="font-bold text-white text-sm sm:text-base cursor-pointer list-none flex items-center justify-between">
              <span>Quel est le délai de livraison et de configuration ?</span>
              <span className="text-amber-400 font-mono group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed">
              Votre compte administrateur est activé instantanément. Les puces et chevalets physiques pré-encodés vous sont expédiés sous 48h à 72h.
            </p>
          </details>
        </div>

        {/* Direct WhatsApp Callout */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">
                Une question ? Échangez avec notre équipe
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Réponse rapide 7j/7 pour vous conseiller sur le meilleur équipement.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 shadow-lg active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.whatsappContact}</span>
          </a>
        </div>
      </section>

    </div>
  );
};
