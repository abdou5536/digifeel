import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Eye, Check, X, FileText, Database, Radio } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
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
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Protection des Données & Conformité RGPD</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Politique de Confidentialité
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

          {/* Policy Content */}
          <div className="space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>1. Collecte et Traitement des Données</span>
              </h3>
              <p>
                Ce modèle doit être complété par l’identité et les coordonnées du responsable du traitement avant publication. Le service peut traiter les données suivantes :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                <li><strong>Scans :</strong> identifiant du lien NFC ou QR, restaurant associé et date du scan. L’adresse IP peut être utilisée temporairement pour limiter les abus.</li>
                <li><strong>Retours clients :</strong> note, commentaire facultatif, membre d’équipe associé au lien et état d’ouverture du lien Google.</li>
                <li><strong>Comptes et paiements :</strong> e-mail et données de configuration du restaurateur, références de paiement et, pour les paiements manuels, preuve image. Digifeel ne reçoit pas les numéros de carte bancaire.</li>
              </ul>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>2. Utilisation des Puces NFC & Respect de l'Anonymat</span>
              </h3>
              <p>
                Un scan ne demande pas la création d’un compte client. Un commentaire peut toutefois contenir des informations personnelles si son auteur en saisit. Le bouton Google est proposé quelle que soit la note ; Google applique ensuite ses propres règles et sa propre politique de confidentialité.
              </p>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>3. Sécurité et Conservation des Données</span>
              </h3>
              <p>
                En production, le site doit être servi en HTTPS. Les comptes et données métier sont stockés dans une base serveur. Les paiements par carte sont traités par Stripe ; les preuves CCP/Baridimob sont conservées hors du répertoire public. La durée de conservation, les sous-traitants et les modalités de suppression doivent être définis par l’exploitant avant publication.
              </p>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>4. Vos Droits d'Accès, de Rectification et d'Effacement</span>
              </h3>
              <p>
                Les coordonnées de contact et la procédure d’exercice des droits doivent être renseignées ici par l’exploitant : <strong>[adresse e-mail de contact à renseigner]</strong>. Le responsable doit également préciser la base légale, les délais de conservation et, le cas échéant, les coordonnées du délégué à la protection des données.
              </p>
            </section>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <span className="text-[11px] text-slate-400 font-mono">DIGIFEEL · Modèle à faire relire</span>
            <button
              type="button"
              onClick={() => {
                soundFX.playHoverTick();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              Fermer la Politique de Confidentialité
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
