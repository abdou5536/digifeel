import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { HelpCircle, X, ChevronDown, Sparkles, ShieldCheck, CreditCard, Radio, Star, Utensils, MessageCircle } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';
import { FaqItem } from '../types';

interface CustomerFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<FaqItem['category'], React.FC<{ className?: string }>> = {
  paiement: CreditCard,
  service: Radio,
  reputation: Star,
  restaurant: Utensils,
  general: ShieldCheck
};

export const CustomerFaqModal: React.FC<CustomerFaqModalProps> = ({ isOpen, onClose }) => {
  const { restaurant, faqItems } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const publicFaqs = faqItems.filter(f => f.isPublic);

  const filteredFaqs = activeCategory === 'all'
    ? publicFaqs
    : publicFaqs.filter(f => f.category === activeCategory);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl max-w-lg w-full text-white space-y-5 relative max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <span>Questions Fréquentes & Aide</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {restaurant.name} · Guide d'expérience convive
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playHoverTick();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                soundFX.playHoverTick();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Toutes ({publicFaqs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('paiement');
                soundFX.playHoverTick();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'paiement'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Paiements & Pourboires
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('service');
                soundFX.playHoverTick();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'service'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Service & NFC
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('reputation');
                soundFX.playHoverTick();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'reputation'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Avis Google 5★
            </button>
          </div>

          {/* Accordion FAQ list */}
          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Aucune question trouvée dans cette catégorie.
              </div>
            ) : (
              filteredFaqs.map(item => {
                const isExpanded = expandedId === item.id;
                const IconComp = CATEGORY_ICONS[item.category] || ShieldCheck;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-amber-400/60 bg-amber-500/10 shadow-lg'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : item.id);
                        soundFX.playHoverTick();
                      }}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <IconComp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{item.question}</span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                          isExpanded ? 'rotate-180 text-amber-400' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-3.5 pb-3.5 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2"
                        >
                          {item.answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Notice */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Pourboire Reversé au Serveur
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-white font-bold hover:underline cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
