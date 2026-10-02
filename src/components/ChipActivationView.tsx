/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Chip Activation View
 * Triggered when a new or unassigned NFC chip (/r/[chipId]) is scanned.
 * Allows the restaurant owner to input the activation code, link the restaurant,
 * set the Google Reviews URL, and bind to a server or table.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, ShieldCheck, CheckCircle2, ArrowRight, Building, KeyRound, MapPin, User, AlertCircle, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ChipActivationViewProps {
  chipId: string;
  onActivated?: () => void;
}

export const ChipActivationView: React.FC<ChipActivationViewProps> = ({ chipId, onActivated }) => {
  const { t, restaurant, updateNfcChip, createRestaurant, waiters, setMode } = useApp();

  const [activationCode, setActivationCode] = useState('');
  const [restaurantName, setRestaurantName] = useState(restaurant?.name || '');
  const [googleReviewUrl, setGoogleReviewUrl] = useState(restaurant?.googleReviewUrl || '');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetType, setTargetType] = useState<'server' | 'table'>('server');
  const [selectedServerId, setSelectedServerId] = useState<string>(waiters[0]?.id || 'waiter-1');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chips/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chipId,
          activationCode: activationCode.trim().toUpperCase(),
          restaurantId: restaurant?.id || 'resto-demo',
          restaurantName,
          googleReviewUrl,
          ownerEmail,
          password,
          targetType,
          targetId: targetType === 'server' ? selectedServerId : String(selectedTableNumber)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Code d’activation non valide.');
      }

      // Update in local state
      updateNfcChip(chipId, {
        status: 'active',
        restaurantId: data.restaurantId || restaurant?.id,
        targetType,
        targetId: targetType === 'server' ? selectedServerId : String(selectedTableNumber),
        targetName: targetType === 'server' 
          ? (waiters.find(w => w.id === selectedServerId)?.name || 'Serveur')
          : `Table N°${selectedTableNumber}`
      });

      setIsSuccess(true);
      if (onActivated) {
        setTimeout(onActivated, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’activation de la puce.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#0c101b]/90 border border-white/15 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] text-white"
      >
        {/* Header Icon & Chip Badge */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-amber-300 mb-2">
            <span>Puce ID :</span>
            <span className="font-bold text-white">{chipId}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.activationTitle}
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
            {t.activationSubtitle}
          </p>
        </div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">Activation Réussie !</h3>
            <p className="text-sm text-emerald-300 max-w-sm mx-auto">
              {t.activationSuccess}
            </p>
            <button
              type="button"
              onClick={() => setMode('client')}
              className="mt-4 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all cursor-pointer"
            >
              Tester le scan client maintenant
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Activation Code */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.activationCodeLabel}</span>
              </label>
              <input
                type="text"
                required
                value={activationCode}
                onChange={e => setActivationCode(e.target.value)}
                placeholder="Ex: DF-8492-PARIS"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 focus:border-amber-400 focus:outline-none text-white text-sm font-mono uppercase tracking-wider placeholder:text-white/30"
              />
              <p className="text-[11px] text-white/40 mt-1">
                Le code d’activation est inscrit au dos de votre carte ou fourni lors de l’envoi.
              </p>
            </div>

            {/* Restaurant Name */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.restaurantNameLabel}</span>
              </label>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={e => setRestaurantName(e.target.value)}
                placeholder="Ex: Le Bistro Parisien"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 focus:border-amber-400 focus:outline-none text-white text-sm placeholder:text-white/30"
              />
            </div>

            {/* Google Reviews Link */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.googleReviewUrlLabel}</span>
              </label>
              <input
                type="url"
                required
                value={googleReviewUrl}
                onChange={e => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 focus:border-amber-400 focus:outline-none text-white text-sm placeholder:text-white/30"
              />
            </div>

            {/* Target type assignment */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                {t.targetTypeLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('server')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                    targetType === 'server'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  {t.targetServer}
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('table')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                    targetType === 'table'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  {t.targetTable}
                </button>
              </div>
            </div>

            {/* If server target */}
            {targetType === 'server' && (
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Sélectionner le serveur
                </label>
                <select
                  value={selectedServerId}
                  onChange={e => setSelectedServerId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#111624] border border-white/15 focus:border-amber-400 focus:outline-none text-white text-sm"
                >
                  {waiters.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If table target */}
            {targetType === 'table' && (
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Numéro de Table / Chevalet
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={selectedTableNumber}
                  onChange={e => setSelectedTableNumber(Number(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 focus:border-amber-400 focus:outline-none text-white text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.btnActivateChip}</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
