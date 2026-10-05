import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ShieldCheck, Scale, Check, X, CreditCard, Radio } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';
import { INSTALLATION_PACKS, PRODUCT_PRICING } from '../config/product';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          className="relative w-full max-w-3xl bg-gradient-to-b from-[#0c1836]/95 via-[#071026]/98 to-[#030712] border border-cyan-400/30 rounded-3xl p-6 sm:p-8 text-white shadow-[0_25px_80px_rgba(0,240,255,0.15)] my-6 overflow-hidden space-y-6 max-h-[88vh] overflow-y-auto"
        >
          {/* Top Liquid Mirror Shimmer Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-400 animate-mirror-sweep" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                <Scale className="w-4 h-4 text-cyan-400" />
                <span>Conditions Générales d'Utilisation & de Vente</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Conditions Générales d'Utilisation et de Vente (CGU/CGV)
              </h2>
              <p className="text-xs text-slate-400">
                Modèle indicatif à compléter et à faire relire avant toute mise en ligne.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Terms Content */}
          <div className="space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>1. Objet du Service</span>
              </h3>
              <p>
                Complétez l’identité du vendeur, ses coordonnées, les modalités de livraison, de rétractation et de réclamation avant publication. Digifeel fournit des liens NFC et QR, une page de retour client et, selon l’offre, un tableau de bord.
              </p>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>2. Pack d'Installation & Tarification</span>
              </h3>
              <p>
                Les packs affichés sont : {INSTALLATION_PACKS.map(pack => `${pack.name} : ${pack.priceEuros} €`).join(' · ')}. L’abonnement facultatif « {PRODUCT_PRICING.subscriptionName} » coûte {PRODUCT_PRICING.monthlySubscriptionEuros} € par mois, avec un essai initial de {PRODUCT_PRICING.subscriptionTrialDays} jours selon les conditions de l’offre. Les caractéristiques et frais éventuels sont à confirmer avant commande.
              </p>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>3. Gestion des Puces NFC & Responsabilité</span>
              </h3>
              <p>
                Le restaurateur est responsable de la configuration de son lien d’avis, de l’usage des liens NFC/QR et des commentaires publiés par ses clients. Une puce active continue d’ouvrir le lien Google du restaurant même si l’abonnement au tableau de bord est arrêté.
              </p>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>4. Reversement des Pourboires & Devises</span>
              </h3>
              <p>
                Les paiements par carte sont traités par Stripe ; Digifeel ne stocke pas les données de carte. Le paiement manuel est proposé uniquement lorsque les coordonnées et le taux EUR/DZD sont configurés. Les conditions de reversement des pourboires doivent être précisées avant leur activation.
              </p>
            </section>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <span className="text-[11px] text-slate-400 font-mono">Modèle à compléter et à faire relire</span>
            <button
              type="button"
              onClick={() => {
                soundFX.playHoverTick();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              Fermer les CGU
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
