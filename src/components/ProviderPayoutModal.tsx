import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProviderPayoutModal: React.FC = () => {
  const { isPayoutModalOpen, setIsPayoutModalOpen } = useApp();

  return (
    <AnimatePresence>
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Fermer la fenêtre"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPayoutModalOpen(false)}
            className="fixed inset-0 cursor-default bg-[#020408]/85 backdrop-blur-xl"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-settings-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-lg space-y-5 rounded-3xl border border-cyan-400/30 bg-[#071026] p-6 text-white shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="payout-settings-title" className="text-xl font-bold">
                  Configuration des paiements
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Les coordonnées CCP/Baridimob et le taux de conversion sont configurés côté serveur. Cette démonstration ne collecte ni ne stocke de coordonnées bancaires dans le navigateur.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setIsPayoutModalOpen(false)}
                className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Renseignez ces valeurs dans les variables d’environnement du serveur avant d’activer les paiements manuels.</p>
            </div>
            <div className="flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="min-h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold hover:bg-white/15"
              >
                Fermer
              </button>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
};
