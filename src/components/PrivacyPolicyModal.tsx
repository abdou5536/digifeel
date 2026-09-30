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
                Dernière mise à jour : 28 Septembre 2026 · Conforme au Règlement Général sur la Protection des Données (UE 2016/679).
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
                L'application DIGIFEEL / NFC Solutions traite uniquement les données strictement nécessaires au fonctionnement du service de notation et de pourboires :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                <li><strong>Données relatives au scan :</strong> Identifiant UID matériel de la puce NFC ou identifiant de table scannée, horodatage du scan.</li>
                <li><strong>Évaluations clients :</strong> Note attribuée (1 à 5 étoiles), commentaire textuel libre éventuel, sélection avec ou sans pourboire.</li>
                <li><strong>Données restaurateur :</strong> Nom de l'établissement, lien direct Google Maps / Google Avis, identifiants des collaborateurs en salle.</li>
              </ul>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>2. Utilisation des Puces NFC & Respect de l'Anonymat</span>
              </h3>
              <p>
                Le scan d'une puce NFC ou d'un QR code par un client s'effectue sans aucune obligation de création de compte ou de téléchargement d'application. L'expérience client est immédiate et garantit l'anonymat des déposants, sauf si le client choisit de s'identifier sur la fiche Google Maps publique de l'établissement.
              </p>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>3. Sécurité et Conservation des Données</span>
              </h3>
              <p>
                Toutes les transmissions de données sont chiffrées de bout en bout via protocole HTTPS / TLS. Les données de comptabilité et de pourboires sont conservées de manière sécurisée et ne sont jamais vendues, louées ou partagées avec des tiers à des fins publicitaires.
              </p>
            </section>

            <section className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>4. Vos Droits d'Accès, de Rectification et d'Effacement</span>
              </h3>
              <p>
                Conformément aux réglementations RGPD, tout utilisateur ou restaurateur dispose d'un droit d'accès, de rectification, de portabilité et de suppression des données le concernant sur simple demande par email à l'administrateur de l'application : <span className="font-mono text-cyan-300 font-bold">rahouabdallah27@gmail.com</span>.
              </p>
            </section>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <span className="text-[11px] text-slate-400 font-mono">DIGIFEEL · Respect de la vie privée garanti</span>
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
