import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  WORLD_CURRENCIES,
  CurrencyInfo,
  convertCurrency,
  formatCurrency
} from '../utils/currencyUtils';
import {
  X,
  Coins,
  ArrowRightLeft,
  Check,
  Globe,
  TrendingUp,
  Sparkles,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface CurrencySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurrencySelectorModal: React.FC<CurrencySelectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    displayCurrency,
    setDisplayCurrency,
    restaurant,
    updateRestaurant
  } = useApp();

  // Converter State
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [fromCode, setFromCode] = useState<string>('EUR');
  const [toCode, setToCode] = useState<string>('DZD');

  if (!isOpen) return null;

  const currenciesList = Object.values(WORLD_CURRENCIES);

  const handleSelectCurrency = (currCode: string) => {
    setDisplayCurrency(currCode);
    updateRestaurant({ currency: currCode });
    soundFX.playSuccessChime();
  };

  const convertedResult = convertCurrency(calcAmount, fromCode, toCode);
  const fromInfo = WORLD_CURRENCIES[fromCode] || WORLD_CURRENCIES.EUR;
  const toInfo = WORLD_CURRENCIES[toCode] || WORLD_CURRENCIES.DZD;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-auto flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#090d18] border border-amber-500/40 rounded-3xl p-6 sm:p-7 text-white shadow-2xl overflow-hidden my-8"
        >
          {/* Glowing Ambient Gradient */}
          <div className="absolute top-0 right-0 w-48 h-44 bg-gradient-to-br from-amber-500/20 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>Monnaies du Monde & Convertisseur Live</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Taux en Direct
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Choisissez la monnaie d'affichage pour les pourboires et votre établissement.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Currency Converter Calculator */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                Convertisseur Instantané (Dinar, Dirham, Euro, Dollar...)
              </span>
              <span className="text-slate-400 font-normal">
                1 EUR = {toInfo.rateVsEur} {toInfo.code}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Input From */}
              <div className="sm:col-span-5 flex items-center bg-black/40 border border-white/15 rounded-xl p-2 gap-2">
                <input
                  type="number"
                  min="1"
                  value={calcAmount}
                  onChange={e => setCalcAmount(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-white font-mono font-bold text-base outline-none pl-1"
                />
                <select
                  value={fromCode}
                  onChange={e => setFromCode(e.target.value)}
                  className="bg-white/10 text-white font-mono font-bold text-xs rounded-lg px-2 py-1 outline-none border border-white/15 cursor-pointer"
                >
                  {currenciesList.map(c => (
                    <option key={c.code} value={c.code} className="bg-slate-950 text-white">
                      {c.flag} {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Equals Arrow */}
              <div className="sm:col-span-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const temp = fromCode;
                    setFromCode(toCode);
                    setToCode(temp);
                  }}
                  className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
                  title="Inverser les devises"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Output To */}
              <div className="sm:col-span-5 flex items-center bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 gap-2">
                <div className="w-full text-amber-300 font-mono font-black text-base pl-1 truncate">
                  {convertedResult.toLocaleString('fr-FR')} {toInfo.symbol}
                </div>
                <select
                  value={toCode}
                  onChange={e => setToCode(e.target.value)}
                  className="bg-slate-900 text-amber-300 font-mono font-bold text-xs rounded-lg px-2 py-1 outline-none border border-amber-500/30 cursor-pointer"
                >
                  {currenciesList.map(c => (
                    <option key={c.code} value={c.code} className="bg-slate-950 text-white">
                      {c.flag} {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Maghreb Highlights (DZD, TND, MAD) */}
          <div className="mt-5 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Devises du Maghreb (Dinar Algérien, Dinar Tunisien, Dirham Marocain)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {['DZD', 'TND', 'MAD'].map(code => {
                const c = WORLD_CURRENCIES[code];
                const isSelected = displayCurrency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCurrency(c.code)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{c.flag}</span>
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1">
                            <span>{c.code}</span>
                            <span className="text-amber-300 font-mono">({c.symbol})</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{c.name}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-white/10 pt-1.5 flex items-center justify-between">
                      <span>1 EUR = {c.rateVsEur} {c.symbol}</span>
                      {isSelected && <span className="text-emerald-400 font-bold">Actif</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Global Currencies Grid */}
          <div className="mt-5 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Toutes les Devises Internationales
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
              {currenciesList.map(c => {
                const isSelected = displayCurrency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCurrency(c.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>{c.flag}</span>
                        <span>{c.code}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{c.symbol}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{c.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-mono">
              Devise active : <strong className="text-amber-300">{WORLD_CURRENCIES[displayCurrency]?.name || 'Euro'} ({WORLD_CURRENCIES[displayCurrency]?.symbol || '€'})</strong>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Valider
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
