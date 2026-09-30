import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  getCurrencyInfo,
  fetchLiveExchangeRates,
  getLiveRatesStatus,
  WORLD_CURRENCIES
} from '../utils/currencyUtils';
import {
  DollarSign,
  Check,
  Calculator,
  Coins,
  RefreshCw,
  Globe,
  HeartHandshake
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export interface TipCalculationProps {
  waiterName: string;
  waiterAvatarUrl?: string;
  initialBillAmount?: number;
  onTipChange: (calculatedTip: number, billAmount: number, percentageSelected: number | null) => void;
}

export const TipCalculation: React.FC<TipCalculationProps> = ({
  waiterName,
  waiterAvatarUrl,
  initialBillAmount = 45,
  onTipChange
}) => {
  const { displayCurrency, setDisplayCurrency } = useApp();
  const currInfo = getCurrencyInfo(displayCurrency);

  // Live Exchange Rates API State
  const [fxStatus, setFxStatus] = useState(getLiveRatesStatus());
  const [isRefreshingFx, setIsRefreshingFx] = useState(false);

  useEffect(() => {
    fetchLiveExchangeRates().then(() => {
      setFxStatus(getLiveRatesStatus());
    });
  }, []);

  const handleRefreshFxRates = async () => {
    setIsRefreshingFx(true);
    soundFX.playHoverTick();
    await fetchLiveExchangeRates();
    setFxStatus(getLiveRatesStatus());
    setIsRefreshingFx(false);
    soundFX.playSuccessChime();
  };

  // Montant de la table (en devise locale sélectionnée)
  const [billInputLocal, setBillInputLocal] = useState<string>(() => {
    const rate = currInfo.rateVsEur;
    const converted = initialBillAmount * rate;
    return currInfo.decimals === 0 ? Math.round(converted).toString() : converted.toFixed(currInfo.decimals);
  });

  // Pourboire versé (en devise locale sélectionnée)
  // Options directes : 0, 500, 1000, personnalisé
  const [tipInputLocal, setTipInputLocal] = useState<string>('0');
  const [selectedQuickTip, setSelectedQuickTip] = useState<number | null>(0);

  // Sync billInputLocal when displayCurrency changes
  useEffect(() => {
    const rate = currInfo.rateVsEur;
    const currentEurBill = (parseFloat(billInputLocal) || 0) / (currInfo.rateVsEur || 1);
    const updatedLocal = (currentEurBill || initialBillAmount) * rate;
    setBillInputLocal(currInfo.decimals === 0 ? Math.round(updatedLocal).toString() : updatedLocal.toFixed(currInfo.decimals));
  }, [displayCurrency]);

  // Valeurs numériques calculées
  const billAmountLocalNum = useMemo(() => {
    const parsed = parseFloat(billInputLocal);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [billInputLocal]);

  const tipAmountLocalNum = useMemo(() => {
    const parsed = parseFloat(tipInputLocal);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [tipInputLocal]);

  // Conversion en base EUR pour la compatibilité avec le système global
  const billAmountEur = useMemo(() => {
    return billAmountLocalNum / (currInfo.rateVsEur || 1);
  }, [billAmountLocalNum, currInfo.rateVsEur]);

  const tipAmountEur = useMemo(() => {
    return tipAmountLocalNum / (currInfo.rateVsEur || 1);
  }, [tipAmountLocalNum, currInfo.rateVsEur]);

  const totalAmountLocal = useMemo(() => {
    return billAmountLocalNum + tipAmountLocalNum;
  }, [billAmountLocalNum, tipAmountLocalNum]);

  // Transmettre les valeurs au composant parent
  useEffect(() => {
    const effectivePct = billAmountEur > 0 ? Math.round((tipAmountEur / billAmountEur) * 100) : 0;
    onTipChange(tipAmountEur, billAmountEur, effectivePct);
  }, [tipAmountEur, billAmountEur, onTipChange]);

  // Boutons rapides de pourboire selon la devise
  const quickTipOptions = useMemo(() => {
    if (displayCurrency === 'DZD') {
      return [
        { label: '0 DA', value: 0, text: 'Sans pourboire' },
        { label: '200 DA', value: 200, text: '+200 DA' },
        { label: '500 DA', value: 500, text: '+500 DA' },
        { label: '1000 DA', value: 1000, text: '+1000 DA' },
        { label: '2000 DA', value: 2000, text: '+2000 DA' }
      ];
    }
    if (displayCurrency === 'USD') {
      return [
        { label: '$0', value: 0, text: 'Sans pourboire' },
        { label: '$2', value: 2, text: '+$2' },
        { label: '$5', value: 5, text: '+$5' },
        { label: '$10', value: 10, text: '+$10' },
        { label: '$20', value: 20, text: '+$20' }
      ];
    }
    // Default EUR
    return [
      { label: '0 €', value: 0, text: 'Sans pourboire' },
      { label: '2 €', value: 2, text: '+2 €' },
      { label: '5 €', value: 5, text: '+5 €' },
      { label: '10 €', value: 10, text: '+10 €' },
      { label: '20 €', value: 20, text: '+20 €' }
    ];
  }, [displayCurrency]);

  const handleSelectQuickTip = (val: number) => {
    setSelectedQuickTip(val);
    setTipInputLocal(val.toString());
    if (val === 0) {
      soundFX.playHoverTick();
    } else {
      soundFX.playTipChime(val);
    }
  };

  const handleCustomTipChange = (val: string) => {
    setTipInputLocal(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setSelectedQuickTip(null);
      if (num > 0) {
        soundFX.playHoverTick();
      }
    } else if (val === '') {
      setSelectedQuickTip(null);
      setTipInputLocal('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Devise & Taux de change Black Market Header */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200">Devise du règlement :</span>
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            {(['DZD', 'EUR', 'USD'] as const).map(code => {
              const item = WORLD_CURRENCIES[code];
              const isSelected = displayCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setDisplayCurrency(code);
                    soundFX.playHoverTick();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.flag} {code}
                </button>
              );
            })}
          </div>
        </div>

        {displayCurrency === 'DZD' && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
            <span>Square Port-Saïd :</span>
            <span className="font-bold text-white">1 € = 277 DA</span>
          </div>
        )}
      </div>

      {/* 1. Montant de la Table / Addition Personnalisable */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-white/8 to-white/3 border border-white/15 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
            <span>Montant de la Table / Addition</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">100% Personnalisable</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="number"
            min="0"
            step={currInfo.decimals === 0 ? '1' : '0.5'}
            value={billInputLocal}
            onChange={e => {
              setBillInputLocal(e.target.value);
              soundFX.playHoverTick();
            }}
            placeholder="0"
            className="w-full bg-slate-950/80 border border-cyan-400/40 rounded-xl px-4 py-3 text-lg font-black text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-16 shadow-inner"
          />
          <div className="absolute right-3.5 text-sm font-black text-cyan-300 font-mono pointer-events-none">
            {currInfo.symbol}
          </div>
        </div>
      </div>

      {/* 2. Prix du Pourboire Versé (Personnalisable : 0, 500, 1000 ou saisie libre) */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/30 via-white/5 to-transparent border border-cyan-400/30 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4 text-cyan-300" />
            <span>Pourboire pour {waiterName}</span>
          </label>
          <span className="text-[11px] font-mono text-cyan-300 font-bold">
            {tipAmountLocalNum === 0 ? 'Sans pourboire (0)' : `${tipAmountLocalNum} ${currInfo.symbol}`}
          </span>
        </div>

        {/* Boutons Rapides : 0, 200, 500, 1000, 2000 */}
        <div className="grid grid-cols-5 gap-1.5">
          {quickTipOptions.map(opt => {
            const isSelected = selectedQuickTip === opt.value || (opt.value.toString() === tipInputLocal);
            return (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                key={opt.value}
                type="button"
                onClick={() => handleSelectQuickTip(opt.value)}
                className={`py-2.5 px-1 rounded-xl text-center border font-mono transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? opt.value === 0
                      ? 'bg-slate-700/80 border-slate-400 text-white shadow-md'
                      : 'bg-gradient-to-r from-cyan-400 to-sky-400 border-white text-slate-950 font-black shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[9px] opacity-80 truncate max-w-full">
                  {opt.value === 0 ? '0 DA' : opt.text}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Saisie Libre du Montant de Pourboire */}
        <div className="pt-1">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Ou saisissez le montant exact de votre pourboire :</span>
            {tipAmountLocalNum > 0 && (
              <span className="text-emerald-400 font-bold font-mono">✓ Pourboire actif</span>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              step={currInfo.decimals === 0 ? '10' : '0.5'}
              value={tipInputLocal}
              onChange={e => handleCustomTipChange(e.target.value)}
              placeholder="Ex : 500 ou 1000"
              className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-16 shadow-inner"
            />
            <div className="absolute right-3.5 text-xs font-bold text-cyan-300 font-mono pointer-events-none">
              {currInfo.symbol}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Récapitulatif Total en direct */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-400/40 flex items-center justify-between text-xs font-mono shadow-lg">
        <div className="space-y-0.5">
          <div className="text-slate-400">Total Addition + Pourboire :</div>
          <div className="text-slate-300 text-[11px]">
            {billAmountLocalNum} {currInfo.symbol} + {tipAmountLocalNum} {currInfo.symbol} tip
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-black text-cyan-300">
            {currInfo.decimals === 0 ? Math.round(totalAmountLocal) : totalAmountLocal.toFixed(2)} {currInfo.symbol}
          </div>
          {displayCurrency === 'DZD' && (
            <div className="text-[10px] text-slate-400">
              ≈ {(totalAmountLocal / 277).toFixed(2)} € (Marché Noir)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
