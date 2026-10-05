import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  Users,
  Clock,
  TrendingUp,
  Percent,
  CheckCircle2,
  Sliders,
  DollarSign,
  Coffee,
  ChefHat,
  ArrowRightLeft,
  FileSpreadsheet,
  Download,
  Info,
  Sparkles,
  HelpCircle,
  Plus,
  Minus,
  RotateCcw,
  ShieldCheck,
  Building,
  Save,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TipSharingMethod, TipSharingConfig } from '../types';
import { downloadTipSharingCsv } from '../utils/tipSharingUtils';
import {
  formatCurrency,
  getCurrencyInfo,
  fetchLiveExchangeRates,
  getLiveRatesStatus,
  WORLD_CURRENCIES
} from '../utils/currencyUtils';
import { soundFX } from '../utils/soundEffects';

export const ManagerTipSharingConfig: React.FC = () => {
  const {
    restaurant,
    waiters,
    reviews,
    tables,
    tipSharingConfig,
    updateTipSharingConfig,
    tipDistribution,
    displayCurrency,
    setDisplayCurrency
  } = useApp();

  const [fxStatus, setFxStatus] = useState(getLiveRatesStatus());

  React.useEffect(() => {
    fetchLiveExchangeRates().then(() => setFxStatus(getLiveRatesStatus()));
  }, []);

  // Local editable draft state for instant live preview
  const [draftConfig, setDraftConfig] = useState<TipSharingConfig>(tipSharingConfig);
  const [isSavedToastVisible, setIsSavedToastVisible] = useState<boolean>(false);

  // Sync draft when external config updates
  React.useEffect(() => {
    setDraftConfig(tipSharingConfig);
  }, [tipSharingConfig]);

  // Methods definition metadata
  const METHODS: Array<{
    id: TipSharingMethod;
    name: string;
    badge: string;
    icon: LucideIcon;
    description: string;
    details: string;
  }> = [
    {
      id: 'hours_worked',
      name: 'Temps de Service (Heures de présence)',
      badge: 'Recommandé ⏱️',
      icon: Clock,
      description: 'Répartition au prorata exact des heures travaillées par chaque serveur sur la période.',
      details: 'Chaque équipier touche une part proportionnelle à son temps effectif passé en salle (avec pondération possible selon le rôle).'
    },
    {
      id: 'table_volume',
      name: 'Volume de Clients par Table',
      badge: 'Performance 🍽️',
      icon: TrendingUp,
      description: 'Répartition basée sur l\'activité réelle : nombre de tables et rotation des couverts servis.',
      details: 'Valorise l\'intensité du service et les serveurs gérant les zones ou les rangs les plus denses.'
    },
    {
      id: 'hybrid_pool',
      name: 'Modèle Hybride (Direct + Pot Commun)',
      badge: 'Équilibré ⚖️',
      icon: ArrowRightLeft,
      description: 'Part individuelle directe (ex: 50%) + part mutualisée en pot commun redistribuée.',
      details: 'Le serveur conserve une récompense immédiate pour son contact client, tout en soutenant l\'entraide collective.'
    },
    {
      id: 'equal_split',
      name: 'Pot Commun Égalitaire',
      badge: 'Collectif 🤝',
      icon: Users,
      description: 'Tous les pourboires sans contact sont regroupés et divisés à parts égales entre les équipiers.',
      details: 'Idéal pour les petites brigades soudées où chaque membre participe au même niveau.'
    },
    {
      id: 'individual',
      name: '100% Individuel Direct',
      badge: 'Autonome 🎯',
      icon: DollarSign,
      description: 'Chaque serveur conserve 100% des pourboires collectés sur sa puce NFC ou ses tables.',
      details: 'Chaque pourboire client va directement sur la cagnotte du serveur qui a assuré la table.'
    }
  ];

  // Quick preset buttons for kitchen support percentage
  const KITCHEN_CUT_PRESETS = [0, 5, 10, 15, 20];

  // Adjust hours for a specific waiter
  const handleHourChange = (waiterId: string, delta: number) => {
    soundFX.playHoverTick();
    const current = draftConfig.waiterHours?.[waiterId] ?? 35;
    const nextHours = Math.max(1, Math.min(60, current + delta));
    setDraftConfig(prev => ({
      ...prev,
      waiterHours: {
        ...prev.waiterHours,
        [waiterId]: nextHours
      }
    }));
  };

  // Adjust coefficient for a waiter
  const handleCoeffChange = (waiterId: string, coeff: number) => {
    soundFX.playHoverTick();
    setDraftConfig(prev => ({
      ...prev,
      waiterCoefficients: {
        ...prev.waiterCoefficients,
        [waiterId]: coeff
      }
    }));
  };

  // Save changes to AppContext & LocalStorage
  const handleSaveConfig = () => {
    updateTipSharingConfig(draftConfig);
    soundFX.playSuccessChime();
    setIsSavedToastVisible(true);
    setTimeout(() => setIsSavedToastVisible(false), 3000);
  };

  // Export CSV
  const handleDownloadCsv = () => {
    soundFX.playSuccessChime();
    downloadTipSharingCsv(tipDistribution, restaurant);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-900 to-amber-950/40 p-5 sm:p-6 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                Module RH & Paie · DIGIFEEL
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                URSSAF & Loi de Finances Conforme
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Règles de Partage des Pourboires</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Automatisez la répartition transparente des pourboires collectés par puce NFC et QR code. Choisissez un prorata au temps de service, au volume de clients par table, ou un modèle hybride avec soutien cuisine/bar.
            </p>

            {/* Currency Quick-Switcher Bar (DZD, TND, EUR, USD, MAD) */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">
                Devise d'affichage :
              </span>
              {[
                { code: 'DZD', flag: '🇩🇿', name: 'DA' },
                { code: 'TND', flag: '🇹🇳', name: 'DT' },
                { code: 'EUR', flag: '🇪🇺', name: 'EUR' },
                { code: 'USD', flag: '🇺🇸', name: 'USD' },
                { code: 'MAD', flag: '🇲🇦', name: 'DH' }
              ].map(c => {
                const isSelected = displayCurrency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setDisplayCurrency(c.code);
                      soundFX.playHoverTick();
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-white/10 hover:bg-white/20 text-slate-300'
                    }`}
                  >
                    {c.flag} {c.code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-white/10 shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Télécharger le fichier de répartition pour la paie et la comptabilité"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Paie (CSV)</span>
            </button>

            <button
              onClick={handleSaveConfig}
              className="px-4 py-2.5 bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4 fill-slate-950" />
              <span>Enregistrer les Règles</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cagnotte Globale Brute</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono mt-1">
              {formatCurrency(tipDistribution.totalGrossTips, displayCurrency, { showDualEquivalent: true })}
            </div>
            <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">
              100% collecté sans contact
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              <span>Part Soutien Cuisine / Bar</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1">
              {formatCurrency(tipDistribution.totalKitchenCut, displayCurrency, { showDualEquivalent: true })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {draftConfig.kitchenSupportCutPercentage}% de quote-part
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Net Redistribué Équipe</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-cyan-300 font-mono mt-1">
              {formatCurrency(tipDistribution.netDistributableTips, displayCurrency, { showDualEquivalent: true })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Sur {waiters.length} serveurs actifs
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Temps de Service Total</span>
            </div>
            <div className="text-xl font-black text-indigo-300 font-mono mt-1">
              {tipDistribution.totalHoursWorked} h
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {tipDistribution.totalTablesServed} tables / avis servis
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Toast */}
      <AnimatePresence>
        {isSavedToastVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Règles de répartition enregistrées avec succès et appliquées au calcul de paie en direct !</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 1: Choose Distribution Rule */}
      <div className="bg-slate-900/90 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>1. Sélectionner la Méthode de Répartition</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurez comment la cagnotte des pourboires doit être arbitrée entre les serveurs en salle
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {METHODS.map(method => {
            const Icon = method.icon;
            const isSelected = draftConfig.method === method.id;

            return (
              <div
                key={method.id}
                onClick={() => {
                  soundFX.playHoverTick();
                  setDraftConfig(prev => ({ ...prev, method: method.id }));
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-amber-500/20">
                      {method.badge}
                    </span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      isSelected ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-600'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">{method.name}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                    {method.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-400 italic">
                  {method.details}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Advanced Parameters (Sliders & Adjustments) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kitchen & Bar Support Cut */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>Quote-part Cuisine & Bar (Soutien)</span>
            </h4>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              {draftConfig.kitchenSupportCutPercentage}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Pourcentage réservé pour la brigade de cuisine, les barmans et les commis pour valoriser le travail d'équipe global.
          </p>

          <input
            type="range"
            min="0"
            max="30"
            step="5"
            value={draftConfig.kitchenSupportCutPercentage}
            onChange={e => {
              soundFX.playHoverTick();
              setDraftConfig(prev => ({ ...prev, kitchenSupportCutPercentage: Number(e.target.value) }));
            }}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between gap-1 pt-1">
            {KITCHEN_CUT_PRESETS.map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  soundFX.playHoverTick();
                  setDraftConfig(prev => ({ ...prev, kitchenSupportCutPercentage: pct }));
                }}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  draftConfig.kitchenSupportCutPercentage === pct
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {pct === 0 ? '0% (Aucun)' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Hybrid Retention Ratio (Only active if hybrid_pool selected, otherwise payout frequency) */}
        {draftConfig.method === 'hybrid_pool' ? (
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                <span>Part Individuelle Directe (Hybride)</span>
              </h4>
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                {draftConfig.individualRetentionPercentage}% Direct / {100 - draftConfig.individualRetentionPercentage}% Pot
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Chaque serveur conserve {draftConfig.individualRetentionPercentage}% de ses pourboires directs. Les {100 - draftConfig.individualRetentionPercentage}% restants sont mis en pot commun redistribué au prorata des heures.
            </p>

            <input
              type="range"
              min="20"
              max="80"
              step="10"
              value={draftConfig.individualRetentionPercentage}
              onChange={e => {
                soundFX.playHoverTick();
                setDraftConfig(prev => ({ ...prev, individualRetentionPercentage: Number(e.target.value) }));
              }}
              className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>20% Direct (Plus collectif)</span>
              <span>80% Direct (Plus individualisé)</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Périodicité de Reversement Paie</span>
              </h4>
              <span className="text-xs font-mono font-bold text-emerald-300 uppercase">
                {draftConfig.payoutFrequency === 'shift' ? 'Fin de Service' : draftConfig.payoutFrequency === 'weekly' ? 'Hebdomadaire' : 'Mensuelle'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Fréquence à laquelle les pourboires dématérialisés sont arrêtés et exportés vers le logiciel de paie ou virés aux serveurs.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { id: 'shift', label: 'Fin de Shift' },
                { id: 'weekly', label: 'Hebdomadaire' },
                { id: 'monthly', label: 'Fin de Mois' }
              ].map(freq => (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => {
                    soundFX.playHoverTick();
                    setDraftConfig(prev => ({ ...prev, payoutFrequency: freq.id as any }));
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    draftConfig.payoutFrequency === freq.id
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Interactive Simulation Table per Waiter */}
      <div className="bg-slate-900/90 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Simulateur & Ventilation en Direct par Serveur</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ajustez les heures travaillées de chaque équipier en direct pour observer la redistribution immédiate
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              Méthode active : <strong className="text-amber-400">{METHODS.find(m => m.id === draftConfig.method)?.name}</strong>
            </span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Équipier & Rôle</th>
                <th className="py-3 px-3 text-right">Collecte Directe NFC (€)</th>
                <th className="py-3 px-3 text-center">Temps de Service (Heures)</th>
                <th className="py-3 px-3 text-center">Tables / Clients</th>
                <th className="py-3 px-3 text-right">Quote-part (%)</th>
                <th className="py-3 px-3 text-right">Part Cuisine (€)</th>
                <th className="py-3 px-4 text-right">Versement Final (€)</th>
                <th className="py-3 px-3 text-center">Écart Solidaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tipDistribution.distributions.map(dist => {
                const waiter = waiters.find(w => w.id === dist.waiterId);
                const hours = draftConfig.waiterHours?.[dist.waiterId] ?? 35;
                const coeff = draftConfig.waiterCoefficients?.[dist.waiterId] ?? 1.0;

                return (
                  <tr key={dist.waiterId} className="hover:bg-white/5 transition-colors">
                    {/* Waiter Name & Role */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center font-bold text-amber-300 text-xs overflow-hidden shrink-0">
                          {waiter?.avatarUrl ? (
                            <img src={waiter.avatarUrl} alt={dist.waiterName} className="w-full h-full object-cover" />
                          ) : (
                            dist.waiterName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{dist.waiterName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>{dist.role}</span>
                            {coeff !== 1.0 && (
                              <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1 rounded">
                                {coeff}x
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Raw Tips Directly Collected */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-300">
                      {dist.rawTipsCollected.toFixed(2)} €
                    </td>

                    {/* Hours Worked Controller with +/- buttons */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleHourChange(dist.waiterId, -1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center border border-white/10 cursor-pointer active:scale-95"
                          title="Retirer 1 heure"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-white w-8 text-center">
                          {hours}h
                        </span>
                        <button
                          type="button"
                          onClick={() => handleHourChange(dist.waiterId, 1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center border border-white/10 cursor-pointer active:scale-95"
                          title="Ajouter 1 heure"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Tables / Scans count */}
                    <td className="py-3 px-3 text-center font-mono text-slate-300">
                      <span className="bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                        {dist.tablesServedCount} tables
                      </span>
                    </td>

                    {/* Share Percentage */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">
                      {dist.sharePercentage.toFixed(1)}%
                    </td>

                    {/* Kitchen Cut Contribution */}
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      -{dist.kitchenContribution.toFixed(2)} €
                    </td>

                    {/* Final Payout Amount */}
                    <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-400">
                      {dist.finalCalculatedPayout.toFixed(2)} €
                    </td>

                    {/* Difference vs Direct */}
                    <td className="py-3 px-3 text-center font-mono text-xs">
                      {dist.differenceVsRaw > 0 ? (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          +{dist.differenceVsRaw.toFixed(2)} €
                        </span>
                      ) : dist.differenceVsRaw < 0 ? (
                        <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          {dist.differenceVsRaw.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-md">
                          0.00 €
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer with Totals */}
            <tfoot className="bg-slate-950 text-xs font-mono font-bold border-t-2 border-white/20">
              <tr>
                <td className="py-3.5 px-4 text-white">TOTAUX ÉTABLISSEMENT</td>
                <td className="py-3.5 px-3 text-right text-white">
                  {tipDistribution.totalGrossTips.toFixed(2)} €
                </td>
                <td className="py-3.5 px-3 text-center text-indigo-300">
                  {tipDistribution.totalHoursWorked}h
                </td>
                <td className="py-3.5 px-3 text-center text-slate-300">
                  {tipDistribution.totalTablesServed}
                </td>
                <td className="py-3.5 px-3 text-right text-amber-400">100%</td>
                <td className="py-3.5 px-3 text-right text-slate-400">
                  -{tipDistribution.totalKitchenCut.toFixed(2)} €
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-400 text-sm">
                  {tipDistribution.netDistributableTips.toFixed(2)} €
                </td>
                <td className="py-3.5 px-3 text-center text-slate-400 font-normal text-[10px]">
                  Équilibré
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legal & Fiscal Notice */}
        <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 flex items-start gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-white">
              Cadre Légal & Fiscalité des Pourboires Dématérialisés (Article 5 de la Loi de Finances)
            </div>
            <p className="text-[11px] leading-relaxed">
              Les pourboires collectés sans contact par puce NFC et reversés à vos serveurs sont <strong>totalement exonérés de cotisations sociales</strong> (patronales et salariales) et d'impôt sur le revenu pour les salariés percevant jusqu'à 1,6 SMIC. La traçabilité DIGIFEEL assure une conformité totale en cas de contrôle URSSAF.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
