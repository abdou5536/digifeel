import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Globe, Check, X, Copy, ExternalLink, ShieldCheck, Server, Sparkles } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface CustomDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomDomainModal: React.FC<CustomDomainModalProps> = ({ isOpen, onClose }) => {
  const { restaurant, updateRestaurant } = useApp();
  const [domainInput, setDomainInput] = useState<string>(restaurant?.websiteUrl || '');
  const [copiedDns, setCopiedDns] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    updateRestaurant({
      hasWebsite: Boolean(domainInput.trim()),
      websiteUrl: domainInput.trim()
    });
    soundFX.playSuccessChime();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCopyCname = () => {
    navigator.clipboard.writeText('cname.digifeel.app');
    setCopiedDns(true);
    soundFX.playSuccessChime();
    setTimeout(() => setCopiedDns(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-auto flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020408]/85 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c1836]/95 via-[#071026]/98 to-[#030712] border border-cyan-400/30 rounded-3xl p-6 sm:p-8 text-white shadow-[0_25px_80px_rgba(0,240,255,0.15)] my-6 overflow-hidden space-y-6"
        >
          {/* Top Liquid Mirror Shimmer Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-400 animate-mirror-sweep" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Nom de Domaine Personnalisé · DNS & Marque Blanche</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                Nom de Domaine du Restaurant
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Liez votre propre nom de domaine ou sous-domaine pour que les scans NFC affichent directement votre adresse web.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSaved && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Nom de domaine enregistré et synchronisé pour {restaurant.name} !</span>
            </div>
          )}

          <form onSubmit={handleSaveDomain} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-200 font-mono">
                Votre Nom de Domaine ou Sous-Domaine :
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  placeholder="Ex: avis.mon-restaurant.fr ou www.restaurant-paris.com"
                  className="w-full bg-slate-950/80 border border-cyan-400/40 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                L'URL utilisée par défaut pour les puces NFC sera routée sur votre domaine.
              </p>
            </div>

            {/* DNS Configuration Helper */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs font-mono">
              <div className="text-slate-300 font-bold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Enregistrement DNS requis (CNAME) :</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-slate-400">Type CNAME :</div>
                  <div className="text-cyan-300 font-bold">cname.digifeel.app</div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCname}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedDns ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDns ? 'Copié !' : 'Copier CNAME'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer le Domaine</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
