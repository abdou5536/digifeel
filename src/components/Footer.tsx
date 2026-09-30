import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { soundFX } from '../utils/soundEffects';
import { Radio, ShieldCheck, Globe, Lock, FileText, Scale } from 'lucide-react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { CustomDomainModal } from './CustomDomainModal';

export const Footer: React.FC = () => {
  const { setMode, setIsOrderModalOpen } = useApp();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(false);

  return (
    <>
      <footer className="glass-nav border-t border-white/[0.08] py-12 px-4 sm:px-6 text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white tracking-wider text-sm">DIGIFEEL · NFC RESTO</span>
                <div className="text-[11px] text-slate-400">Avis clients et suivi du service</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs">
              <button 
                onClick={() => { setMode('landing'); soundFX.playHoverTick(); }} 
                className="hover:text-white transition-colors cursor-pointer"
              >
                Accueil
              </button>
              <button 
                onClick={() => { setMode('client'); soundFX.playHoverTick(); }} 
                className="hover:text-white transition-colors cursor-pointer"
              >
                Parcours client
              </button>
              <button 
                onClick={() => { setMode('server'); soundFX.playHoverTick(); }} 
                className="hover:text-white transition-colors cursor-pointer"
              >
                Ouvrir l’espace serveur
              </button>
              <button 
                onClick={() => { setMode('manager'); soundFX.playHoverTick(); }} 
                className="hover:text-white transition-colors cursor-pointer"
              >
                Ouvrir le tableau de bord
              </button>
              <button 
                onClick={() => { setIsDomainOpen(true); soundFX.playHoverTick(); }} 
                className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1 text-cyan-400"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Configurer un domaine</span>
              </button>
              <button 
                onClick={() => { setIsOrderModalOpen(true); soundFX.playHoverTick(); }} 
                className="text-white font-bold hover:underline cursor-pointer flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15"
              >
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>Voir les packs</span>
              </button>
            </div>
          </div>

          {/* Legal Links & Compliance */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyOpen(true);
                  soundFX.playHoverTick();
                }}
                className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1 underline underline-offset-4"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Politique de Confidentialité (RGPD)</span>
              </button>

              <span aria-hidden="true">·</span>

              <button
                type="button"
                onClick={() => {
                  setIsTermsOpen(true);
                  soundFX.playHoverTick();
                }}
                className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1 underline underline-offset-4"
              >
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
                <span>Conditions Générales d'Utilisation (CGU)</span>
              </button>

              <span aria-hidden="true">·</span>
              <span>© {new Date().getFullYear()} DIGIFEEL</span>
            </div>

          </div>

        </div>
      </footer>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      {/* Custom Domain Modal */}
      <CustomDomainModal
        isOpen={isDomainOpen}
        onClose={() => setIsDomainOpen(false)}
      />
    </>
  );
};
