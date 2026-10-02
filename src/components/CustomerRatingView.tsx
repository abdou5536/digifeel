/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Customer Rating & Review Flow
 * Clean, frictionless client view accessible when scanning an activated NFC chip or table QR.
 * Allows instant star rating, waiter selection, compliments, tip, saves the review,
 * and provides the direct 1-click Google Reviews button for all users.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ExternalLink, Heart, CheckCircle2, ShieldCheck, User, Sparkles, MessageSquare, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundFX } from '../utils/soundEffects';

const TIP_PRESETS = [0, 2, 5, 10];

export const CustomerRatingView: React.FC = () => {
  const {
    t,
    restaurant,
    waiters,
    selectedWaiterId,
    setSelectedWaiterId,
    selectedTableNumber,
    setSelectedTableNumber,
    addReview
  } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedTip, setSelectedTip] = useState<number>(2);
  const [customTip, setCustomTip] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([t.complimentFriendly, t.complimentFast]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [googleClicked, setGoogleClicked] = useState<boolean>(false);

  const availableCompliments = [
    t.complimentFast,
    t.complimentFriendly,
    t.complimentDelicious,
    t.complimentClean,
    t.complimentAtmosphere
  ];

  const currentWaiter = waiters.find(w => w.id === selectedWaiterId) || waiters[0];
  const googleReviewUrl = restaurant?.googleReviewUrl || 'https://maps.google.com';

  const toggleCompliment = (comp: string) => {
    setSelectedCompliments(prev =>
      prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    const finalTip = customTip ? parseFloat(customTip) || 0 : selectedTip;

    // 1. Save to backend API
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          serverId: currentWaiter?.id,
          tableNumber: selectedTableNumber,
          rating,
          comment: comment.trim() || undefined,
          compliments: selectedCompliments,
          tipAmount: finalTip
        })
      });
    } catch {
      // Continue locally even if offline
    }

    // 2. Save in app context
    addReview({
      restaurantId: restaurant.id,
      waiterId: currentWaiter?.id || 'waiter-default',
      waiterName: currentWaiter?.name || 'Équipe',
      tableNumber: selectedTableNumber,
      rating,
      comment: comment.trim() || undefined,
      compliments: selectedCompliments,
      tipAmount: finalTip,
      googleReviewClicked: false
    });

    soundFX.playSuccessChime();
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const getRatingFeedback = (r: number) => {
    switch (r) {
      case 5: return t.stars5;
      case 4: return t.stars4;
      case 3: return t.stars3;
      case 2: return t.stars2;
      default: return t.stars1;
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 flex items-center justify-center bg-[#070b14] text-white">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] bg-[#0d121e]/95 border border-white/15 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] select-none"
      >
        {/* Header Restaurant & Table Context */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
          <div>
            <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider">
              {restaurant.name}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t.ratingTitle}
            </h1>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-amber-300">
            Table {selectedTableNumber}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Server selector */}
              {waiters.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-2">
                    {t.demoWaitersSelect}
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {waiters.map(w => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedWaiterId(w.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                          (selectedWaiterId === w.id || (!selectedWaiterId && w.id === currentWaiter?.id))
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs scale-102'
                            : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06]'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 5 Illuminated Stars */}
              <div className="text-center py-4 px-2 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map(starIndex => {
                    const activeVal = hoveredRating !== null ? hoveredRating : rating;
                    const isFilled = activeVal >= starIndex;
                    return (
                      <button
                        key={starIndex}
                        type="button"
                        onMouseEnter={() => setHoveredRating(starIndex)}
                        onMouseLeave={() => setHoveredRating(null)}
                        onClick={() => {
                          setRating(starIndex);
                          soundFX.playHoverTick();
                        }}
                        className="p-1 focus:outline-none transition-transform active:scale-125 cursor-pointer"
                      >
                        <Star
                          className={`w-9 h-9 sm:w-10 sm:h-10 transition-all duration-200 ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-110'
                              : 'text-white/20 fill-transparent hover:text-amber-400/40'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs sm:text-sm font-bold text-amber-300 mt-2 tracking-wide">
                  {getRatingFeedback(hoveredRating !== null ? hoveredRating : rating)}
                </p>
              </div>

              {/* Compliments Badges */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2">
                  Ce que vous avez le plus apprécié
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableCompliments.map(comp => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => toggleCompliment(comp)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                        selectedCompliments.includes(comp)
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                          : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06]'
                      }`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip Selection */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2 flex items-center justify-between">
                  <span>{t.tipSelection}</span>
                  <span className="text-amber-400 font-mono font-bold">
                    +{customTip ? customTip : selectedTip} €
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIP_PRESETS.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedTip(amt);
                        setCustomTip('');
                        soundFX.playHoverTick();
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedTip === amt && !customTip
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-xs'
                          : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06]'
                      }`}
                    >
                      {amt === 0 ? 'Sans' : `${amt} €`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Comment */}
              <div>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 focus:border-amber-400 focus:outline-none text-white text-xs placeholder:text-white/30 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t.btnSubmitReview}</span>
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            /* Thank you & Guaranteed Google Reviews Redirection */
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {t.thankYouTitle}
                </h3>
                <p className="text-sm text-white/60 max-w-xs mx-auto mt-1 leading-relaxed">
                  {t.thankYouDesc}
                </p>
              </div>

              {/* Google Reviews Direct Button (Always visible to 100% of reviews) */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setGoogleClicked(true)}
                  className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 text-black font-extrabold text-sm shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t.btnLeaveGoogleReview}</span>
                </a>

                <p className="text-[11px] text-white/40 leading-tight">
                  {googleClicked
                    ? 'Merci infiniment pour votre soutien sur Google Maps !'
                    : 'Aidez notre restaurant à se faire connaître en partageant votre note sur Google.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
