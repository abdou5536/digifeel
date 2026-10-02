/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Interactive Phone Demo
 * Simulates a realistic customer smartphone scanning an NFC chip or table QR,
 * rating with individual illuminated gold stars, leaving a tip, and triggering
 * the Google Reviews redirect flow.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Radio, Heart, Sparkles, ArrowRight, RotateCcw, ExternalLink, CheckCircle2, DollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const InteractivePhoneDemo: React.FC = () => {
  const { t, restaurant, waiters } = useApp();

  const [step, setStep] = useState<'idle' | 'scanning' | 'rating' | 'success'>('idle');
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<string>(waiters[0]?.id || 'waiter-david');
  const [selectedTip, setSelectedTip] = useState<number>(2);
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>(['Service rapide', 'Très souriant']);
  const [googleSimulated, setGoogleSimulated] = useState<boolean>(false);

  const complimentsList = [
    t.complimentFast,
    t.complimentFriendly,
    t.complimentDelicious,
    t.complimentClean
  ];

  const handleSimulateScan = () => {
    setStep('scanning');
    setTimeout(() => {
      setStep('rating');
    }, 1200);
  };

  const handleToggleCompliment = (comp: string) => {
    setSelectedCompliments(prev =>
      prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('success');
  };

  const handleReset = () => {
    setStep('idle');
    setGoogleSimulated(false);
    setSelectedStars(5);
    setSelectedTip(2);
  };

  const activeServer = waiters.find(w => w.id === selectedWaiter) || waiters[0] || {
    name: 'David M.',
    role: 'Chef de rang'
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.demoSectionTitle}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {t.demoSectionTitle}
        </h2>
        <p className="mt-3 text-white/60 max-w-xl mx-auto text-sm sm:text-base">
          {t.demoSectionSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Controls & Highlights */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400" />
              <span>Simulateur d’Expérience Client</span>
            </h3>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              Testez le parcours complet en 3 clics : du contact avec la puce NFC jusqu’à la redirection automatique vers votre fiche Google Maps.
            </p>

            {step === 'idle' && (
              <button
                type="button"
                onClick={handleSimulateScan}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm sm:text-base shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                <span>{t.demoBtnSimulateScan}</span>
              </button>
            )}

            {step !== 'idle' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                  <span className="text-white/60">Statut du simulateur :</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {step === 'scanning' ? 'Scan en cours...' : step === 'rating' ? 'Avis en saisie' : 'Avis Google validé'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.demoReset}</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300/90 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>100% sans application :</strong> Fonctionne instantanément sur Safari (iOS) et Chrome (Android) dès que le téléphone s’approche de la puce.
            </span>
          </div>
        </div>

        {/* Right Side: High-Fidelity Phone Mockup */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-[#070b14] rounded-[3.2rem] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.95)] border-[5px] border-[#222838] overflow-hidden">
            {/* Dynamic Island / Speaker Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-end px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#111827] border border-white/10" />
            </div>

            {/* Inner Phone Screen */}
            <div className="w-full h-full rounded-[2.5rem] bg-[#0d121e] border border-white/10 overflow-y-auto overflow-x-hidden relative flex flex-col p-4 pt-10 text-white select-none">
              
              <AnimatePresence mode="wait">
                {step === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-6"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
                        <Radio className="w-12 h-12 text-amber-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-black">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-white">Prêt pour le scan</h4>
                      <p className="text-xs text-white/50 mt-1 max-w-[200px] mx-auto">
                        Approchez un smartphone pour ouvrir la page instantanément.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateScan}
                      className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white tracking-wide transition-all cursor-pointer"
                    >
                      Toucher pour simuler
                    </button>
                  </motion.div>
                )}

                {step === 'scanning' && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4"
                  >
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping" />
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                        <Radio className="w-8 h-8 text-amber-300 animate-spin" />
                      </div>
                    </div>
                    <p className="text-xs text-amber-300 font-semibold font-mono tracking-wide">
                      {t.demoScanSimulated}
                    </p>
                  </motion.div>
                )}

                {step === 'rating' && (
                  <motion.form
                    key="rating"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex-1 flex flex-col justify-between space-y-4 text-left"
                  >
                    {/* Header: Restaurant & Server */}
                    <div className="border-b border-white/10 pb-3">
                      <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider font-semibold">
                        {restaurant.name}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {t.demoRatingPrompt}
                      </h4>
                    </div>

                    {/* Server selector */}
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1.5">
                        {t.demoWaitersSelect}
                      </label>
                      <div className="flex gap-2">
                        {waiters.slice(0, 3).map(w => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setSelectedWaiter(w.id)}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-medium border transition-all ${
                              selectedWaiter === w.id
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs'
                                : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06]'
                            }`}
                          >
                            {w.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animated Gold Stars (Illuminating individually) */}
                    <div className="text-center py-2 bg-white/[0.02] rounded-2xl border border-white/5">
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(starIndex => {
                          const isFilled = (hoveredStars !== null ? hoveredStars : selectedStars) >= starIndex;
                          return (
                            <button
                              key={starIndex}
                              type="button"
                              onMouseEnter={() => setHoveredStars(starIndex)}
                              onMouseLeave={() => setHoveredStars(null)}
                              onClick={() => setSelectedStars(starIndex)}
                              className="p-1 text-2xl transition-transform active:scale-125 focus:outline-none"
                            >
                              <Star
                                className={`w-7 h-7 transition-all duration-200 ${
                                  isFilled
                                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.7)] scale-110'
                                    : 'text-white/20 fill-transparent hover:text-amber-400/40'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-amber-300 font-semibold mt-1">
                        {selectedStars === 5 ? t.stars5 : selectedStars === 4 ? t.stars4 : selectedStars === 3 ? t.stars3 : selectedStars === 2 ? t.stars2 : t.stars1}
                      </p>
                    </div>

                    {/* Quick Compliments */}
                    <div>
                      <div className="flex flex-wrap gap-1.5">
                        {complimentsList.map(comp => (
                          <button
                            key={comp}
                            type="button"
                            onClick={() => handleToggleCompliment(comp)}
                            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                              selectedCompliments.includes(comp)
                                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 font-semibold'
                                : 'bg-white/[0.03] border-white/10 text-white/60'
                            }`}
                          >
                            {comp}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tip Selection */}
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1.5 flex items-center justify-between">
                        <span>{t.demoTipPrompt}</span>
                        <span className="text-amber-400 font-mono font-semibold">+{selectedTip} €</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 2, 5, 10].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setSelectedTip(amt)}
                            className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedTip === amt
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-xs'
                                : 'bg-white/[0.03] border-white/10 text-white/70'
                            }`}
                          >
                            {amt === 0 ? 'Sans' : `${amt} €`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>{t.demoSubmitReview}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.form>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-between text-center space-y-4 py-2"
                  >
                    <div className="space-y-3 my-auto">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <h4 className="text-base font-bold text-white">
                        {t.demoSuccessTitle}
                      </h4>
                      <p className="text-xs text-white/60 max-w-[220px] mx-auto leading-relaxed">
                        {t.demoSuccessSubtitle}
                      </p>

                      {selectedTip > 0 && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                          <Heart className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                          <span>Pourboire de {selectedTip} € transmis à {activeServer.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Google Reviews Redirection Button (shown to all users) */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setGoogleSimulated(true)}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                          googleSimulated
                            ? 'bg-emerald-500 text-black'
                            : 'bg-white text-black hover:bg-slate-100 shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer active:scale-98'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{googleSimulated ? 'Redirection Google réussie !' : t.demoGoogleCta}</span>
                      </button>

                      <p className="text-[10px] text-white/40 leading-tight">
                        {t.demoGoogleSimulatedNotice}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
