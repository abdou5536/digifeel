import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  CreditCard,
  Building,
  Check,
  X,
  Copy,
  Smartphone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
  Wallet,
  Globe
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export const ProviderPayoutModal: React.FC = () => {
  const { isPayoutModalOpen, setIsPayoutModalOpen, payoutConfig, updatePayoutConfig } = useApp();

  const [holder, setHolder] = useState(payoutConfig.accountHolder || 'Rahou Abdallah');
  const [iban, setIban] = useState(payoutConfig.iban || 'FR76 3000 4000 0000 1234 5678 901');
  const [bic, setBic] = useState(payoutConfig.bic || 'BNPAFRPPXXX');
  const [bank, setBank] = useState(payoutConfig.bankName || 'BNP Paribas & Algérie Poste');
  const [visaCard, setVisaCard] = useState(payoutConfig.visaCardNumber || '4970 **** **** 8888');
  const [ccpAccount, setCcpAccount] = useState(payoutConfig.ccpAccountNumber || '0012345678');
  const [ccpKey, setCcpKey] = useState(payoutConfig.ccpKey || '99');
  const [baridiMobRip, setBaridiMobRip] = useState(payoutConfig.baridiMobRip || '00799999001234567899');
  const [phone, setPhone] = useState(payoutConfig.phonePayment || '06 12 34 56 78');
  const [email, setEmail] = useState(payoutConfig.contactEmail || 'rahouabdallah27@gmail.com');

  const [isSaved, setIsSaved] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePayoutConfig({
      accountHolder: holder.trim(),
      iban: iban.trim().toUpperCase(),
      bic: bic.trim().toUpperCase(),
      bankName: bank.trim(),
      visaCardNumber: visaCard.trim(),
      ccpAccountNumber: ccpAccount.trim(),
      ccpKey: ccpKey.trim(),
      baridiMobRip: baridiMobRip.trim(),
      phonePayment: phone.trim(),
      contactEmail: email.trim(),
      whatsappNumber: payoutConfig.whatsappNumber || '+33612345678'
    });
    soundFX.playSuccessChime();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsPayoutModalOpen(false);
    }, 1500);
  };

  const copyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    soundFX.playHoverTick();
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <AnimatePresence>
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsPayoutModalOpen(false)}
            className="fixed inset-0 bg-[#020408]/85 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            className="bg-gradient-to-b from-[#0c1836]/95 via-[#071026]/98 to-[#030712] text-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 border border-cyan-400/30 z-10 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Top Liquid Mirror Line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-400 animate-mirror-sweep" />

            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-xs uppercase font-mono font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  <span>Réception des Paiements & Encaissement Direct</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                  Vos Coordonnées Bancaires & CCP Algérie
                </h2>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Tous les règlements des restaurants (100 € ou 27 700 DA) arrivent <strong>directement sur votre compte</strong> (Carte Visa, Virement SEPA ou CCP Algérie / BaridiMob).
                </p>
              </div>

              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSaved && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Coordonnées bancaires & CCP enregistrées et synchronisées avec succès !</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section 1 : Algérie Poste CCP & BaridiMob */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🇩🇿</span>
                    <span>Compte CCP Algérie & BaridiMob (Règlements en Dinars DA)</span>
                  </span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                    Virement CCP à CCP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-slate-300 block mb-1 font-bold">N° Compte CCP Algérie :</label>
                    <input
                      type="text"
                      value={ccpAccount}
                      onChange={e => setCcpAccount(e.target.value)}
                      placeholder="Ex: 0012345678"
                      className="w-full p-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-white font-mono font-bold focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-bold">Clé CCP :</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={ccpKey}
                      onChange={e => setCcpKey(e.target.value)}
                      placeholder="99"
                      className="w-full p-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-white font-mono font-bold text-center focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="text-slate-300 font-bold">RIP BaridiMob (20 chiffres) :</label>
                    <button
                      type="button"
                      onClick={() => copyText(baridiMobRip, 'rip')}
                      className="text-[10px] text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'rip' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'rip' ? 'Copié !' : 'Copier RIP'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={baridiMobRip}
                    onChange={e => setBaridiMobRip(e.target.value)}
                    placeholder="Ex: 00799999001234567899"
                    className="w-full p-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-white font-mono font-bold tracking-wider focus:ring-1 focus:ring-amber-400 text-xs"
                  />
                </div>
              </div>

              {/* Section 2 : Carte Visa & Virement Bancaire International */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span>Carte Visa & Virement Bancaire SEPA (EUR / $)</span>
                  </span>
                  <span className="text-[10px] text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-400/30 font-bold">
                    International
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-slate-300 block mb-1 font-bold">Nom du Titulaire :</label>
                    <input
                      type="text"
                      required
                      value={holder}
                      onChange={e => setHolder(e.target.value)}
                      placeholder="Ex: Rahou Abdallah"
                      className="w-full p-2.5 bg-slate-950/80 border border-cyan-400/40 rounded-xl text-white font-bold focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-bold">Email de Notification :</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="rahouabdallah27@gmail.com"
                      className="w-full p-2.5 bg-slate-950/80 border border-cyan-400/40 rounded-xl text-white font-mono focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold">Votre IBAN (Virements SEPA) :</label>
                    <button
                      type="button"
                      onClick={() => copyText(iban, 'iban')}
                      className="text-[10px] text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'iban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'iban' ? 'Copié !' : 'Copier IBAN'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={iban}
                    onChange={e => setIban(e.target.value)}
                    placeholder="FR76 3000 4000 0000 1234 5678 901"
                    className="w-full p-2.5 bg-slate-950/80 border border-white/20 rounded-xl text-white font-mono font-bold tracking-wider text-xs focus:ring-1 focus:ring-cyan-400 uppercase"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Fermer
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer mes Coordonnées</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
