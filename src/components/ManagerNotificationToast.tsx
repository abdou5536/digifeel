import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencyUtils';
import {
  Star,
  Euro,
  DollarSign,
  MessageCircle,
  X,
  CheckCircle2,
  Sparkles,
  User,
  MapPin,
  TrendingUp,
  Zap,
  Radio,
  ArrowRight
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export const ManagerNotificationToast: React.FC = () => {
  const {
    activeManagerToast,
    dismissManagerNotification,
    markNotificationAsRead,
    setMode,
    restaurant,
    displayCurrency
  } = useApp();

  const [progress, setProgress] = useState<number>(100);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const remainingProgress = useRef(100);
  const activeToastId = useRef<string | null>(null);

  useEffect(() => {
    if (!activeManagerToast) {
      activeToastId.current = null;
      remainingProgress.current = 100;
      setProgress(100);
      return;
    }

    if (activeToastId.current !== activeManagerToast.id) {
      activeToastId.current = activeManagerToast.id;
      remainingProgress.current = 100;
      setProgress(100);
    }

    // Play alert sound when toast is active
    try {
      soundFX.playNotificationAlert();
    } catch {
      // ignore
    }

    const duration = 6500; // 6.5s display time
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (!isHovered) {
        remainingProgress.current = Math.max(0, remainingProgress.current - step);
        setProgress(remainingProgress.current);
        if (remainingProgress.current === 0) {
          clearInterval(timer);
          dismissManagerNotification(activeManagerToast.id);
        }
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeManagerToast, isHovered, dismissManagerNotification]);

  if (!activeManagerToast) return null;

  const isHotel = restaurant.establishmentType === 'hotel';
  const {
    id,
    type,
    restaurantName,
    waiterName,
    tableNumber,
    rating,
    tipAmount,
    compliments,
    comment,
    photoUrl,
    createdAt
  } = activeManagerToast;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    markNotificationAsRead(id);
    dismissManagerNotification(id);
  };

  const handleAction = () => {
    markNotificationAsRead(id);
    dismissManagerNotification(id);
    setMode('manager');
  };

  // Badge configurations based on notification type
  const isTip = type === 'new_tip' || type === 'review_and_tip';
  const isReview = type === 'new_review' || type === 'review_and_tip';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(4px)' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100vw-2rem)] pointer-events-auto"
      >
        <div className="relative group p-4 sm:p-5 rounded-3xl bg-[#090d18]/95 backdrop-blur-2xl border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white overflow-hidden">
          {/* Glowing Ambient Background Gradients */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Top Status Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-300 bg-clip-text text-transparent flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                {type === 'review_and_tip' && '🎉 Avis Client + Pourboire Versé'}
                {type === 'new_tip' && '💶 Pourboire Reçu en Direct'}
                {type === 'new_review' && '⭐ Nouvel Avis Soumis'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                NFC Live · {restaurantName}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Fermer la notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Toast Main Content */}
          <div className="mt-3 flex items-start gap-3.5">
            {/* Visual Icon Avatar */}
            <div className="relative shrink-0">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                isTip && isReview
                  ? 'bg-gradient-to-br from-amber-500/30 via-emerald-500/30 to-amber-600/20 border-amber-400/50 text-amber-300'
                  : isTip
                  ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-700/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-gradient-to-br from-amber-500/30 to-amber-700/20 border-amber-400/50 text-amber-300'
              }`}>
                {type === 'review_and_tip' ? (
                  <Sparkles className="w-6 h-6 animate-spin-slow text-amber-300" />
                ) : isTip ? (
                  <Euro className="w-6 h-6 text-emerald-400 animate-bounce" />
                ) : (
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                )}
              </div>

              {/* Badge for rating or table */}
              <div className="absolute -bottom-1 -right-1 bg-slate-950 px-1.5 py-0.5 rounded-md border border-white/20 text-[9px] font-mono font-bold text-amber-300">
                {isHotel ? `Ch.${tableNumber}` : `T.${tableNumber}`}
              </div>
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0">
              {/* Waiter & Table line */}
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{waiterName}</span>
                  <span className="text-slate-400 font-normal">
                    ({isHotel ? `Chambre ${tableNumber}` : `Table ${tableNumber}`})
                  </span>
                </div>
              </div>

              {/* Highlights Row: Rating Stars + Tip Badge */}
              <div className="mt-2 flex items-center flex-wrap gap-2">
                {/* Rating Badge */}
                {isReview && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(rating)
                              ? 'text-amber-400 fill-amber-400'
                              : i < rating
                              ? 'text-amber-400 fill-amber-400/50'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-0.5">{rating.toFixed(1)}/5</span>
                  </div>
                )}

                {/* Tip Badge */}
                {isTip && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs font-black text-emerald-300 shadow-sm animate-pulse">
                    <Euro className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ {formatCurrency(tipAmount, displayCurrency)}</span>
                  </div>
                )}
              </div>

              {/* Compliments / Comment */}
              {compliments && compliments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {compliments.slice(0, 2).map((comp, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white/10 text-slate-200 border border-white/10 truncate max-w-[180px]"
                    >
                      {comp}
                    </span>
                  ))}
                  {compliments.length > 2 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-white/5 text-slate-400">
                      +{compliments.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Customer Comment Quote */}
              {comment && (
                <div className="mt-2 text-[11px] text-slate-300 italic bg-black/30 p-2 rounded-xl border border-white/10 line-clamp-2">
                  "{comment}"
                </div>
              )}

              {/* Customer Photo preview if exists */}
              {photoUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={photoUrl}
                    alt="Avis client"
                    className="w-10 h-10 object-cover rounded-lg border border-amber-500/40"
                  />
                  <span className="text-[10px] text-amber-300 font-mono">
                    📸 Photo du plat jointe
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              Horodatage : {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>

            <button
              type="button"
              onClick={handleAction}
              className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              <span>Ouvrir Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Countdown Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden rounded-b-3xl">
            <div
              className={`h-full transition-all duration-75 ${
                isTip ? 'bg-gradient-to-r from-emerald-400 to-amber-400' : 'bg-amber-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
