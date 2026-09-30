import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  Mail,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Key
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export const OnboardingNotificationToast: React.FC = () => {
  const {
    notificationToast,
    setNotificationToast,
    setActiveEmailModal,
    setCurrentRestaurantId,
    setMode
  } = useApp();

  const [copiedPin, setCopiedPin] = useState(false);

  useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => {
        setNotificationToast(null);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast, setNotificationToast]);

  if (!notificationToast) return null;

  const handleOpenEmail = () => {
    setActiveEmailModal(notificationToast);
    setNotificationToast(null);
  };

  const handleCopyPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(notificationToast.pin);
    setCopiedPin(true);
    try {
      soundFX.playHoverTick();
    } catch {
      // ignore
    }
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleDirectDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentRestaurantId(notificationToast.restaurantId);
    setMode('manager');
    setNotificationToast(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100vw-2rem)]"
      >
        <div className="relative group p-4 sm:p-5 rounded-3xl bg-[#090d18]/95 backdrop-blur-2xl border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-white overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Status Bar */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono font-bold tracking-wide uppercase text-amber-300">
                Email d'Onboarding Délivré
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                TLS 1.3 · SMTP 250 OK
              </span>
              <button
                onClick={() => setNotificationToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification Core Content */}
          <div className="mt-3 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
              <Mail className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>{notificationToast.restaurantName}</span>
                <span className="text-slate-400 font-normal">({notificationToast.ownerName})</span>
              </div>

              <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                Envoyé à : <span className="text-amber-300 font-mono font-bold">{notificationToast.to}</span>
              </div>

              {/* Quick Credentials Strip */}
              <div className="mt-2.5 p-2 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-400 text-[11px]">PIN Secret :</span>
                  <span className="font-mono font-black text-amber-400 tracking-wider">
                    {notificationToast.pin}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-mono flex items-center gap-1 text-slate-200 transition-colors"
                  title="Copier le code PIN"
                >
                  {copiedPin ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEmail}
              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Ouvrir l'Email Reçu</span>
            </button>

            <button
              type="button"
              onClick={handleDirectDashboard}
              className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-white/15"
              title="Accéder directement au Dashboard"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
