import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ICE_GLASS_THEME } from '../utils/mirrorThemeUtils';
import {
  Sparkles,
  Check,
  X,
  Layers,
  Zap,
  ShieldCheck,
  Eye,
  Radio,
  Sliders
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface MirrorThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MirrorThemeModal: React.FC<MirrorThemeModalProps> = ({ isOpen, onClose }) => {
  const {
    restaurant,
    isSpecularMirrorActive,
    setIsSpecularMirrorActive
  } = useApp();

  if (!isOpen) return null;

  const handleToggleSpecular = () => {
    setIsSpecularMirrorActive(!isSpecularMirrorActive);
    soundFX.playStarSelect(5);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-auto flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020408]/80 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c1836]/90 via-[#071026]/95 to-[#030712]/98 border border-cyan-400/30 rounded-3xl p-6 sm:p-8 text-white shadow-[0_25px_80px_rgba(0,240,255,0.15)] my-6 overflow-hidden space-y-6"
        >
          {/* Top Liquid Mirror Shimmer Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-400 animate-mirror-sweep" />
          <div
            className="absolute -top-24 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-500 bg-cyan-500/20"
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Effet Miroir de Glace · Mode Unique Cristal</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                <span>Effet Miroir & Verre Givré</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono font-bold flex items-center gap-1">
                  <span>🧊</span>
                  <span>Actif & Verrouillé</span>
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Tout le site pro, le dashboard et la vue client sont configurés directement dans l'effet verre de glace translucide avec reflets givrés pour {restaurant.name}.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Showcase Card of the Pure Ice Mirror Effect */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white/12 via-white/5 to-cyan-950/40 border border-cyan-300/30 shadow-[0_10px_30px_rgba(0,240,255,0.1)] relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-sky-200 flex items-center justify-center text-slate-950 text-xl font-bold shadow-lg shadow-cyan-500/30">
                  🧊
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{ICE_GLASS_THEME.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                      Standard Unique
                    </span>
                  </div>
                  <div className="text-xs text-cyan-200/80 font-mono">
                    Translucidité haute clarté · Reflets chrome & givre boréal
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-cyan-300 font-mono font-bold bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>100% Immersif</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[11px] font-mono text-cyan-300 font-bold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  Cartes en Verre Givré
                </div>
                <div className="text-[11px] text-slate-300">
                  Flou d'arrière-plan de 28px, bordures biseautées et translucidité moderne.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[11px] font-mono text-sky-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  Reflet Miroir Spéculaire
                </div>
                <div className="text-[11px] text-slate-300">
                  Balayage lumineux argenté en surface simulant un véritable miroir taillé.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[11px] font-mono text-emerald-300 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Lisibilité & Performance
                </div>
                <div className="text-[11px] text-slate-300">
                  Contraste optimisé sur smartphone lors du scan NFC ou du QR Code.
                </div>
              </div>
            </div>
          </div>

          {/* Micro-Toggle for Light Shimmer Reflection */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Brillance Spéculaire de Glace</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {isSpecularMirrorActive
                  ? 'Reflet de surface argenté et brillance spéculaire ultra-nette actifs.'
                  : 'Rendu givré doux sans balayage lumineux dynamique.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleSpecular}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 border ${
                isSpecularMirrorActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm'
                  : 'bg-white/10 text-slate-300 border-white/15'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSpecularMirrorActive ? 'Brillance Active' : 'Activer Brillance'}</span>
            </button>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>Rendu appliqué en direct sur l'ensemble de l'interface</span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playHoverTick();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              Compris, parfait
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
