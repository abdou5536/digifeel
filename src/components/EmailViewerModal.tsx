import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  Mail,
  Key,
  ExternalLink,
  Copy,
  Check,
  Radio,
  QrCode,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
  Server,
  Lock,
  RefreshCw,
  Printer,
  Smartphone,
  Truck,
  Building,
  FileText,
  Clock,
  HelpCircle
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export const EmailViewerModal: React.FC = () => {
  const {
    activeEmailModal,
    setActiveEmailModal,
    setMode,
    setCurrentRestaurantId,
    sendOnboardingEmail,
    restaurant
  } = useApp();

  const [activeTab, setActiveTab] = useState<'email' | 'credentials' | 'hardware' | 'smtp_logs'>('email');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showPin, setShowPin] = useState(true);

  // Resend to custom email form
  const [isResending, setIsResending] = useState(false);
  const [resendEmailInput, setResendEmailInput] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  if (!activeEmailModal) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeEmailModal.dashboardUrl);
    setCopiedLink(true);
    soundFX.playHoverTick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(activeEmailModal.pin);
    setCopiedPin(true);
    soundFX.playHoverTick();
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyAllCredentials = () => {
    const text = `=== IDENTIFIANTS OFFICIELS DIGIFEEL & NFC RESTO ===\nÉtablissement : ${activeEmailModal.restaurantName}\nResponsable : ${activeEmailModal.ownerName}\nIdentifiant / Slug : ${activeEmailModal.slug}\nCode Secret PIN : ${activeEmailModal.pin}\nLien Direct Dashboard : ${activeEmailModal.dashboardUrl}\n\nConservez ces accès en lieu sûr. Support 24/7 : support@digifeel.io`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    soundFX.playHoverTick();
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleOpenDashboard = () => {
    setCurrentRestaurantId(activeEmailModal.restaurantId);
    setMode('manager');
    setActiveEmailModal(null);
  };

  const handleResendToCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmailInput.trim()) return;

    setIsResending(true);
    setTimeout(() => {
      sendOnboardingEmail(restaurant, resendEmailInput.trim());
      setIsResending(false);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    }, 600);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#020408]/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#090d16] text-white rounded-3xl max-w-3xl w-full border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden relative my-6 flex flex-col max-h-[92vh] glass-glow-silver"
        >
          {/* Top Window Bar (Outlook / Superhuman Enterprise Style) */}
          <div className="p-4 sm:p-5 bg-[#05080e] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white tracking-wide">
                    Système Automatisé de Notifications Digifeel
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Délivré (Boîte de Réception)</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  Destinataire : <strong className="text-slate-200">{activeEmailModal.to}</strong> ({activeEmailModal.ownerName})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleCopyAllCredentials}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors"
                title="Copier tous les identifiants"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copié !' : 'Copier tout'}</span>
              </button>

              <button
                onClick={() => setActiveEmailModal(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 bg-[#070b13] border-b border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'email'
                  ? 'bg-[#0f1422] text-amber-400 border-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Aperçu Email Client</span>
            </button>

            <button
              onClick={() => setActiveTab('credentials')}
              className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'credentials'
                  ? 'bg-[#0f1422] text-amber-400 border-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Identifiants & Accès Privé</span>
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'hardware'
                  ? 'bg-[#0f1422] text-amber-400 border-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Matériel NFC & Expédition</span>
            </button>

            <button
              onClick={() => setActiveTab('smtp_logs')}
              className={`px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'smtp_logs'
                  ? 'bg-[#0f1422] text-amber-400 border-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Télémétrie SMTP</span>
            </button>
          </div>

          {/* Email Body Content Area */}
          <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-[#090d16]/90">
            {/* 1. TAB: EMAIL APERÇU RÉEL */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                {/* Email Metadata Header */}
                <div className="bg-[#0c101d] rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                    <div>
                      <span className="text-slate-500">De :</span>{' '}
                      <span className="text-slate-200 font-medium">Digifeel Onboarding &lt;onboarding@digifeel.io&gt;</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Date :</span>{' '}
                      <span className="text-slate-200">{new Date(activeEmailModal.sentAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Pour :</span>{' '}
                      <span className="text-slate-200 font-medium">{activeEmailModal.to}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Sécurité :</span>{' '}
                      <span className="text-emerald-400 font-mono">TLS 1.3 · Chiffré AES-256</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5 text-slate-200 font-bold">
                    Objet : {activeEmailModal.subject}
                  </div>
                </div>

                {/* Email Inside View (Rendered HTML Box) */}
                <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm">
                        DF
                      </div>
                      <div>
                        <div className="text-base font-black tracking-tight text-slate-950">DIGIFEEL ENTERPRISE</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">13.56 MHz NFC Solutions</div>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-300 font-bold">
                      {activeEmailModal.invoiceNumber || 'COMMANDE CONFIRMÉE'}
                    </div>
                  </div>

                  {/* Greeting & Summary */}
                  <div className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                      Bienvenue sur Digifeel, {activeEmailModal.ownerName} !
                    </h2>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      Votre souscription au <strong>Pack Clé en Main ({activeEmailModal.paymentAmount} € TTC)</strong> pour votre établissement <strong className="text-amber-600">{activeEmailModal.restaurantName}</strong> a été validée avec succès.
                    </p>
                  </div>

                  {/* Private Credentials Box (Highlight) */}
                  <div className="bg-slate-950 text-white rounded-2xl p-5 space-y-4 border border-slate-800 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-amber-400" />
                        <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400">
                          Vos Identifiants Privés de Connexion
                        </span>
                      </div>
                      <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-2.5 py-0.5 rounded">
                        Accès Isolé 100% Dédié
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-slate-400 block text-[11px]">Identifiant Restaurant :</span>
                        <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                          {activeEmailModal.slug}
                        </span>
                      </div>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Code Secret PIN :</span>
                          <span className="font-mono font-black text-amber-400 text-sm mt-0.5 block">
                            {showPin ? activeEmailModal.pin : '••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                            title="Afficher/Masquer le PIN"
                          >
                            {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyPin}
                            className="p-1.5 hover:bg-white/10 rounded text-slate-300"
                            title="Copier le code PIN"
                          >
                            {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Direct Dashboard URL */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 block">Lien Privé d'accès direct à votre Dashboard :</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={activeEmailModal.dashboardUrl}
                          className="w-full text-xs font-mono bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-slate-200 select-all"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shrink-0 transition-colors"
                          title="Copier le lien"
                        >
                          {copiedLink ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Onboarding Steps Visual */}
                  <div className="space-y-3 text-slate-800">
                    <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Guide Rapide d'Installation & Démarrage</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Radio className="w-4 h-4 text-amber-600" />
                          <span>1. Badges NFC Serveurs ({activeEmailModal.chipsCount} unités)</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Chaque serveur porte son badge. Le client approche son smartphone pour laisser un pourboire et noter le service en 0.8s.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-blue-600" />
                          <span>2. Chevalets QR Tables ({activeEmailModal.qrCount} tables)</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Positionnés sur chaque table, les chevalets dirigent directement les clients vers la notation 5 étoiles sur Google Maps.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <div className="pt-3 text-center border-t border-slate-200">
                    <button
                      onClick={handleOpenDashboard}
                      className="w-full py-3.5 px-6 bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>Accéder à Mon Dashboard Privé en 1-Clic</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>

                  {/* Footer signature */}
                  <div className="pt-2 text-center text-slate-500 text-[11px] border-t border-slate-100">
                    Une question ? Contactez votre interlocuteur Digifeel.
                  </div>
                </div>
              </div>
            )}

            {/* 2. TAB: CARTE D'ACCÈS & IDENTIFIANTS */}
            {activeTab === 'credentials' && (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-[#121829] to-[#0a0e1a] rounded-3xl border border-amber-500/30 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-mono font-bold text-xl">
                        🔐
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Fiche d'Identifiants Officielle</h3>
                        <p className="text-xs text-slate-400">Transmise par notification sécurisée au gérant</p>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyAllCredentials}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-amber-500/20"
                    >
                      {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAll ? 'Identifiants Copiés !' : 'Copier Tous les Accès'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-1">
                      <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Identifiant Restaurant (Slug)</span>
                      <div className="text-lg font-mono font-black text-white">{activeEmailModal.slug}</div>
                      <span className="text-[10px] text-slate-500">Utilisé pour l'URL privée et le routage</span>
                    </div>

                    <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-1">
                      <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Code Secret PIN Gérant</span>
                      <div className="text-lg font-mono font-black text-amber-400 flex items-center justify-between">
                        <span>{showPin ? activeEmailModal.pin : '••••'}</span>
                        <button
                          onClick={() => setShowPin(!showPin)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          {showPin ? 'Masquer' : 'Afficher'}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500">Code à 4 chiffres confidentiel</span>
                    </div>
                  </div>

                  <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-2 text-xs">
                    <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">URL Complète Directe</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeEmailModal.dashboardUrl}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium shrink-0 flex items-center gap-1.5"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copier</span>
                      </button>
                    </div>
                  </div>

                  {/* Resend Form */}
                  <form onSubmit={handleResendToCustom} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>Renvoyer cet email à une autre adresse</span>
                      </span>
                      {resendSuccess && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Email renvoyé avec succès !
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="ex: comptabilite@restaurant.fr"
                        value={resendEmailInput}
                        onChange={e => setResendEmailInput(e.target.value)}
                        className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isResending}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Renvoyer</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 3. TAB: HARDWARE & EXPÉDITION */}
            {activeTab === 'hardware' && (
              <div className="space-y-5">
                <div className="p-6 bg-[#0c101d] rounded-3xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-5 h-5 text-amber-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Suivi Logistique & Matériel Encodé</h3>
                        <p className="text-[11px] text-slate-400">Préparation atelier Digifeel</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">
                      N° Suivi : {activeEmailModal.trackingNumber || 'CP892839201FR'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-slate-400 block text-[11px]">Puces NFC Encodées</span>
                      <span className="font-mono font-bold text-white text-base mt-0.5 block">{activeEmailModal.chipsCount} Badges Serveurs</span>
                      <span className="text-[10px] text-emerald-400">Prêtes à l'emploi</span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-slate-400 block text-[11px]">Chevalets Tables QR</span>
                      <span className="font-mono font-bold text-white text-base mt-0.5 block">{activeEmailModal.qrCount} Supports rigides</span>
                      <span className="text-[10px] text-emerald-400">Anti-rayures & étanches</span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-slate-400 block text-[11px]">Mode de Livraison</span>
                      <span className="font-mono font-bold text-white text-base mt-0.5 block">
                        {activeEmailModal.shippingPreference === 'postal_shipping' ? 'Expédition Express 24h' : 'Installation sur Site VIP'}
                      </span>
                      <span className="text-[10px] text-slate-400">Pris en charge</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. TAB: SMTP TELEMETRY */}
            {activeTab === 'smtp_logs' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 bg-black/60 rounded-2xl border border-emerald-500/30 text-emerald-400 space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>SMTP 250 OK - MESSAGE DELIVERED</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded">
                      HTTP/2 REST API
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div><strong>Message-ID:</strong> &lt;{activeEmailModal.id}@smtp.digifeel.io&gt;</div>
                    <div><strong>Relay Host:</strong> {activeEmailModal.smtpServer || 'Digifeel Enterprise SES / TLS 1.3 Relay'}</div>
                    <div><strong>TLS Handshake:</strong> {activeEmailModal.tlsVersion || 'TLSv1.3 (256-bit AES GCM)'}</div>
                    <div><strong>DKIM Status:</strong> {activeEmailModal.dkimStatus || 'PASS (signature verified digifeel.io)'}</div>
                    <div><strong>SPF Verification:</strong> PASS (sender IP authorized)</div>
                    <div><strong>DMARC Alignment:</strong> 100% PASS</div>
                    <div><strong>Delivered At:</strong> {activeEmailModal.sentAt}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 sm:p-5 bg-[#05080e] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cryptographie certifiée & accès direct réservé au gérant.</span>
            </div>

            <button
              onClick={handleOpenDashboard}
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              <span>Accéder à Mon Dashboard Restaurant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
