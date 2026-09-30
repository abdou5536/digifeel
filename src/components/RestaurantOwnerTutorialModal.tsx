import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  Smartphone,
  QrCode,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Star,
  Users,
  FileSpreadsheet,
  Zap,
  X,
  ExternalLink,
  ChevronRight,
  Radio,
  Coins,
  Lock,
  Compass,
  Link,
  Cpu,
  Check
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';
import { formatCurrency } from '../utils/currencyUtils';
import { NfcChipEnrollerModal } from './NfcChipEnrollerModal';

interface RestaurantOwnerTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView?: (view: 'client' | 'manager' | 'studio' | 'server') => void;
}

export const RestaurantOwnerTutorialModal: React.FC<RestaurantOwnerTutorialModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView
}) => {
  const { restaurant, updateRestaurantGoogleUrl, waiters, displayCurrency, setMode, setSelectedWaiterId, setSelectedTableNumber } = useApp();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [demoRating, setDemoRating] = useState<number>(5);
  const [demoTip, setDemoTip] = useState<number>(5);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [googleUrlInput, setGoogleUrlInput] = useState<string>(restaurant.googleReviewUrl || 'https://g.page/r/bistro-parisien/review');
  const [isSavedGoogleUrl, setIsSavedGoogleUrl] = useState<boolean>(false);
  const [isNfcEnrollerOpen, setIsNfcEnrollerOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveGoogleUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUrlInput.trim()) return;
    updateRestaurantGoogleUrl(googleUrlInput.trim());
    setIsSavedGoogleUrl(true);
    soundFX.playSuccessChime();
    setTimeout(() => setIsSavedGoogleUrl(false), 2500);
  };

  const totalSteps = 4;

  const handleNext = () => {
    soundFX.playHoverTick();
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    soundFX.playHoverTick();
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    soundFX.playSuccessChime();
    if (dontShowAgain) {
      try {
        localStorage.setItem('digifeel_tutorial_seen', 'true');
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const stepsMeta = [
    {
      step: 1,
      title: 'Puces NFC & Tables QR',
      subtitle: 'Le matériel physique posé en 5 minutes en salle',
      icon: Radio
    },
    {
      step: 2,
      title: 'Serveurs & Pourboires',
      subtitle: 'Comment vos équipes reçoivent 100% sans monnaie',
      icon: Users
    },
    {
      step: 3,
      title: 'Bouclier d\'Avis Google',
      subtitle: 'Filtre automatique entre avis 5★ et retours privés',
      icon: ShieldCheck
    },
    {
      step: 4,
      title: 'Comptabilité & Exports',
      subtitle: 'Export CSV & conformité URSSAF en 1 clic',
      icon: FileSpreadsheet
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-auto flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020408]/85 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl bg-[#0b0e17] border border-white/10 rounded-3xl p-6 sm:p-8 text-white shadow-[0_25px_70px_rgba(0,0,0,0.85)] my-6 overflow-hidden"
        >
          {/* Subtle Top Ambient Gradient */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500" />
          <div className="absolute -top-24 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Didacticiel Établissement · {restaurant.name}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                Guide de Prise en Main & Mise en Service
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Comprenez en 2 minutes le fonctionnement de vos puces NFC, pourboires et avis clients.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Fermer le guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Stepper Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-5">
            {stepsMeta.map(item => {
              const isCurrent = currentStep === item.step;
              const isDone = currentStep > item.step;
              const Icon = item.icon;
              return (
                <button
                  key={item.step}
                  onClick={() => {
                    setCurrentStep(item.step);
                    soundFX.playHoverTick();
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                      : isDone
                      ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      0{item.step}
                    </span>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isCurrent ? 'text-amber-400' : 'text-slate-500'}`} />
                    )}
                  </div>
                  <div className="font-bold text-xs mt-1.5 truncate">
                    {item.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* STEP 1: MATÉRIEL & TABLES */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Radio className="w-4 h-4 text-amber-400" />
                  <span>Aucun câble, aucune application à installer pour les clients</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Le système repose sur deux supports physiques que vous disposez en salle :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Chevalet QR sur les tables</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Chaque table a son QR code unique (ex: Table N°4). Le client scanne avec l'appareil photo de son smartphone (iPhone ou Android).
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Badge NFC 13.56 MHz du serveur</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Vos serveurs portent une puce ou carte NFC. Le client approche simplement son smartphone à 2 cm : la page s'ouvre instantanément.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Demo Trigger */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white">Simuler ce que voit le client au scan :</div>
                  <div className="text-[11px] text-slate-400">
                    Ouvre l'interface telle qu'elle s'affiche sur le téléphone d'un client à la Table 4.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableNumber(4);
                    if (waiters.length > 0) setSelectedWaiterId(waiters[0].id);
                    setMode('client');
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Tester le Scan Client (Table 4)</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SERVEURS & POURBOIRES */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>+40% de pourboires pour vos serveurs sans friction de monnaie</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Aujourd'hui, 8 clients sur 10 n'ont aucune pièce de monnaie. Avec DIGIFEEL, le client choisit un montant en 1 clic (Carte Bancaire ou Apple Pay).
                </p>

                {/* Interactive Tip Simulation */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Simulation pourboire moyen :</span>
                    <span className="font-mono font-bold text-amber-300">
                      {formatCurrency(demoTip, displayCurrency)} versés au serveur
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[2, 3.5, 5, 8, 12].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setDemoTip(amt);
                          soundFX.playTipChime(amt);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          demoTip === amt
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        +{formatCurrency(amt, displayCurrency)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>• <strong>0% de commission patron</strong> : L'intégralité est versée à l'équipe.</div>
                  <div>• <strong>Transparence totale</strong> : L'historique horodaté montre chaque versement en temps réel.</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: BOUCLIER D'AVIS GOOGLE MAPS */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Le filtre intelligent qui protège votre réputation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Contrairement à un simple QR code Google classique qui envoie les clients mécontents détruire votre fiche en public, notre algorithme filtre automatiquement :
                </p>

                {/* Rating Interactive Tester */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="text-xs text-slate-400 font-semibold">
                    Cliquez sur une note pour tester le filtre en direct :
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setDemoRating(star);
                          soundFX.playHoverTick();
                        }}
                        className="p-2 rounded-xl hover:bg-white/10 transition-transform active:scale-95 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= demoRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {demoRating >= 4 ? (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Avis {demoRating} Étoiles : Redirection Google Maps Publique</span>
                      </div>
                      <p className="text-[11px] text-emerald-400/90">
                        Le client est invité en un clic à copier son avis sur votre fiche Google Maps pour faire grimper votre note officielle.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Avis {demoRating} Étoiles : Retenu 100% en Privé</span>
                      </div>
                      <p className="text-[11px] text-amber-400/90">
                        L'avis reste strictement confidentiel dans votre Dashboard. Vous pouvez régler le problème avec votre cuisine ou votre salle sans abîmer votre fiche publique !
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: COMPTABILITÉ & EXPORTS */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span>Zéro saisie manuelle : Export comptable en un clic</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  En fin de service ou à la fin du mois, générez vos rapports prêts pour votre expert-comptable et conformes à la réglementation des pourboires dématérialisés :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-300">Export CSV Excel</div>
                    <p className="text-[11px] text-slate-400">
                      Tableau Excel complet avec date, heure, table, serveur et pourboire brut/net.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <div className="font-bold text-cyan-300">Rapport PDF Mensuel</div>
                    <p className="text-[11px] text-slate-400">
                      Synthèse imprimable prête à archiver avec mention d'exonération fiscale.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
                  <span className="text-slate-300">Partage de pourboires automatique :</span>
                  <span className="font-bold text-amber-300">Temps de service ou Tables</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer Controls */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Don't show again toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span>Ne plus afficher ce guide automatiquement</span>
            </label>

            <div className="flex items-center justify-end gap-2.5">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>{currentStep === totalSteps ? 'Accéder à mon Dashboard' : 'Étape suivante'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
