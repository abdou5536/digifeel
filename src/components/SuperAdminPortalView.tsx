import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantConfig, EquipmentChoice, HardwareStatus, EmailLog, EstablishmentType } from '../types';
import { DEFAULT_STAR_TIERS } from '../data/mockData';
import {
  Crown,
  Building,
  Store,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Truck,
  Radio,
  QrCode,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Layers,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const SuperAdminPortalView: React.FC = () => {
  const {
    restaurants,
    visibleRestaurants,
    currentRestaurantId,
    setCurrentRestaurantId,
    createRestaurant,
    deleteRestaurant,
    updateHardwareStatus,
    setMode,
    getRestaurantDashboardUrl,
    payoutConfig,
    setIsPayoutModalOpen,
    showDemoAccount,
    setShowDemoAccount,
    superAdminEmail,
    emailLogs,
    sendOnboardingEmail,
    setActiveEmailModal
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [establishmentFilter, setEstablishmentFilter] = useState<'all' | 'restaurant' | 'hotel'>('all');
  const [establishmentType, setEstablishmentType] = useState<EstablishmentType>('restaurant');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedIban, setCopiedIban] = useState(false);

  // Batch Generation State
  const [batchCount, setBatchCount] = useState<number>(20);
  const [batchPrefix, setBatchPrefix] = useState<string>('PARIS');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [latestBatch, setLatestBatch] = useState<{ batchId: string; chips: any[] } | null>(null);

  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    try {
      const res = await fetch('/api/admin/chips/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: batchCount, prefix: batchPrefix })
      });
      if (res.ok) {
        const data = await res.json();
        setLatestBatch(data);
      } else {
        // Local generation fallback
        const batchId = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const chips = [];
        for (let i = 1; i <= batchCount; i++) {
          const chipId = `chip-df-${Math.floor(10000 + Math.random() * 90000)}`;
          const activationCode = `DF-${Math.floor(1000 + Math.random() * 9000)}-${batchPrefix}`;
          chips.push({ id: chipId, uid: `04:${Math.floor(10 + Math.random() * 89)}:A2:8B:19:64:30`, activation_code: activationCode, batch_id: batchId });
        }
        setLatestBatch({ batchId, chips });
      }
    } catch {
      // Local generation fallback
      const batchId = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const chips = [];
      for (let i = 1; i <= batchCount; i++) {
        const chipId = `chip-df-${Math.floor(10000 + Math.random() * 90000)}`;
        const activationCode = `DF-${Math.floor(1000 + Math.random() * 9000)}-${batchPrefix}`;
        chips.push({ id: chipId, uid: `04:${Math.floor(10 + Math.random() * 89)}:A2:8B:19:64:30`, activation_code: activationCode, batch_id: batchId });
      }
      setLatestBatch({ batchId, chips });
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleExportBatchCsv = () => {
    if (!latestBatch) return;
    const headers = ['Batch ID', 'Puce ID', 'NFC UID (NTAG)', 'Code Activation Imprimé', 'URL Scan Client', 'Statut'];
    const rows = latestBatch.chips.map(c => [
      `"${latestBatch.batchId}"`,
      `"${c.id}"`,
      `"${c.uid || '04:A2:8B:19:64:30'}"`,
      `"${c.activation_code || c.activationCode}"`,
      `"${window.location.origin}/r/${c.id}"`,
      `"NON_ASSIGNE"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Digifeel_Lot_${latestBatch.batchId}_Puces_NFC.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // New restaurant state
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [tableCount, setTableCount] = useState(12);
  const [equipmentChoice, setEquipmentChoice] = useState<EquipmentChoice>('full_pack');
  const [hasWebsite, setHasWebsite] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');

  const handleCopyLink = (restoId: string) => {
    const url = getRestaurantDashboardUrl(restoId);
    navigator.clipboard.writeText(url);
    setCopiedId(restoId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyIban = () => {
    navigator.clipboard.writeText(payoutConfig.iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleSelectAndGoToDashboard = (restoId: string) => {
    setCurrentRestaurantId(restoId);
    setMode('manager');
  };

  const handleResendEmail = (resto: RestaurantConfig) => {
    const email = sendOnboardingEmail(resto);
    setActiveEmailModal(email);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 16);
    const newResto = createRestaurant({
      establishmentType,
      slug,
      username: slug,
      name: name.trim(),
      ownerName: ownerName.trim() || 'Gérant',
      email: email.trim() || `${slug}@restaurant.fr`,
      city: city.trim() || 'France',
      address: address.trim() || 'Rue du Restaurant',
      googleReviewUrl: googleReviewUrl || `https://g.page/r/${slug}/review`,
      setupKitCost: equipmentChoice === 'full_pack' ? 100 : equipmentChoice === 'nfc_servers_only' ? 60 : 50,
      tableCount,
      currency: '€',
      baselineRating: 2.0,
      starTiers: DEFAULT_STAR_TIERS,
      hasWebsite,
      websiteUrl: hasWebsite ? websiteUrl : '',
      equipmentChoice,
      shippingPreference: 'on_site',
      hardwareStatus: 'pending_encoding',
      accessPin: Math.floor(1000 + Math.random() * 9000).toString()
    });

    setIsCreateModalOpen(false);
    setName('');
    setOwnerName('');
    setEmail('');
    setCity('');
    setAddress('');
  };

  const totalCollectedRevenue = restaurants.reduce((sum, r) => sum + (r.setupKitCost || 100), 0);
  const totalNfcPucks = restaurants.length * 5;
  const totalQrChevalets = restaurants.reduce((sum, r) => sum + (r.tableCount || 10), 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-mesh-dark text-white py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Super Admin Top Header */}
      <div className="glass-card-dark rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-400 text-xs font-bold">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Compte Fondateur & Super-Admin · {superAdminEmail}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Espace Administrateur Unique (Votre Plateforme)
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Vous avez le contrôle total sur l'ensemble de vos restaurants clients. Chaque entreprise dispose d'un espace 100% privé et reçoit automatiquement ses identifiants par email après son paiement de 100 €.
            </p>
          </div>

          {/* Quick Actions & Demo Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Demo Account Toggle */}
            <div className="glass-card-dark px-4 py-2.5 rounded-2xl border border-white/15 flex items-center gap-3">
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  {showDemoAccount ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Compte Démo (Bistro)</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {showDemoAccount ? 'Visible pour démonstrations' : 'Masqué (Mode production pur)'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDemoAccount(!showDemoAccount)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  showDemoAccount ? 'bg-amber-500' : 'bg-slate-700'
                }`}
                title="Activer ou désactiver l'affichage du compte démo"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    showDemoAccount ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="px-4 py-2.5 glass-card-dark hover:bg-white/10 text-emerald-300 font-bold text-xs rounded-2xl border border-emerald-500/30 transition-all flex items-center gap-2 shadow-xs"
            >
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Mon RIB d'Encaissement</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Restaurant Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* Business Comparison & Strategy Spotlight: Why this beats dropshipping clothes from China */}
      <div className="glass-card-dark rounded-3xl p-6 border border-emerald-500/30 relative overflow-hidden space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Votre Avantage Business : NFC Resto vs Import de Vêtements de Chine
            </h2>
            <p className="text-[11px] text-slate-300">
              Pourquoi cette activité est 10x plus rentable et moins risquée pour vous.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/20 space-y-2">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ce Business NFC Resto (SaaS + Puces) :</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li>✓ <strong>100 € encaissés directement</strong> par virement/Wero par restaurant le jour même.</li>
              <li>✓ <strong>Marge brute de 85% à 95%</strong> (coût de 5 puces NFC + 10 chevalets : moins de 15 €).</li>
              <li>✓ <strong>Zéro risque d'invendus</strong>, zéro problème de tailles, zéro retour colis.</li>
              <li>✓ Relation de confiance locale avec les restaurateurs & revenus récurrents.</li>
            </ul>
          </div>

          <div className="p-4 bg-red-950/20 rounded-2xl border border-red-500/20 space-y-2">
            <div className="font-bold text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Import Vêtements de Chine (Beaucoup plus difficile) :</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li>✗ Bloquage de trésorerie sur des stocks de vêtements volumineux.</li>
              <li>✗ Délais de livraison longs (douanes, taxes d'importation, SAV).</li>
              <li>✗ Taux de retours élevé (problèmes de taille, coupe, déceptions clients).</li>
              <li>✗ Concurrence féroce des géants comme Shein, Zara et Temu.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Global Revenue & Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-card-dark p-5 rounded-3xl border border-white/10 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Encaissé (Kits 100 €)</div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {totalCollectedRevenue} €
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% net sur votre compte bancaire</span>
          </div>
        </div>

        <div className="glass-card-dark p-5 rounded-3xl border border-white/10 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Restaurants Clients</div>
          <div className="text-3xl font-black text-white font-mono">
            {restaurants.length}
          </div>
          <div className="text-[11px] text-slate-400">
            {showDemoAccount ? 'Compte démo inclus' : 'Clients réels uniquement'}
          </div>
        </div>

        <div className="glass-card-dark p-5 rounded-3xl border border-white/10 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Puces NFC Déployées</div>
          <div className="text-3xl font-black text-cyan-400 font-mono">
            {totalNfcPucks}
          </div>
          <div className="text-[11px] text-slate-400">
            5 puces par restaurant (NTAG213)
          </div>
        </div>

        <div className="glass-card-dark p-5 rounded-3xl border border-white/10 space-y-1">
          <div className="text-xs font-semibold text-slate-400">Emails Onboarding Envoyés</div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {emailLogs.length}
          </div>
          <div className="text-[11px] text-slate-400">
            Identifiants & guides délivrés
          </div>
        </div>
      </div>

      {/* Super Admin Batch Generator for NFC Chips */}
      <div className="glass-card-dark rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Générateur de Lots de Puces NFC & Codes d'Activation
              </h3>
              <p className="text-xs text-slate-400">
                Générez des séries de puces avec codes sécurisés (DF-XXXX) prêts pour encodage usine NTAG et impression.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={batchCount}
              onChange={e => setBatchCount(Number(e.target.value))}
              className="px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white"
            >
              <option value={10} className="bg-slate-900">10 Puces</option>
              <option value={20} className="bg-slate-900">20 Puces</option>
              <option value={50} className="bg-slate-900">50 Puces</option>
              <option value={100} className="bg-slate-900">100 Puces</option>
            </select>

            <input
              type="text"
              value={batchPrefix}
              onChange={e => setBatchPrefix(e.target.value.toUpperCase())}
              placeholder="PREFIXE"
              className="w-24 px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white font-mono uppercase"
            />

            <button
              type="button"
              disabled={isGeneratingBatch}
              onClick={handleGenerateBatch}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingBatch ? 'Génération...' : 'Générer Lot'}</span>
            </button>
          </div>
        </div>

        {latestBatch && (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                <span className="font-bold">Lot ID: {latestBatch.batchId}</span>
                <span>• {latestBatch.chips.length} puces générées</span>
              </div>
              <button
                type="button"
                onClick={handleExportBatchCsv}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Télécharger Tableur CSV Encodage</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
              {latestBatch.chips.slice(0, 8).map(chip => (
                <div key={chip.id} className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                  <div className="text-white font-bold">{chip.id}</div>
                  <div className="text-amber-400 font-semibold">{chip.activation_code || chip.activationCode}</div>
                  <div className="text-slate-400 text-[10px] truncate">{chip.uid}</div>
                </div>
              ))}
            </div>
            {latestBatch.chips.length > 8 && (
              <div className="text-[11px] text-slate-400 text-center">
                + {latestBatch.chips.length - 8} autres puces incluses dans le lot et le fichier CSV.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurant & Hotel Accounts Management Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>Gestion des Établissements Clients ({visibleRestaurants.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Comptes Restaurants & Hôtels avec identifiants secrets, puces NFC et dashboards privés.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons: Tous / Restaurants / Hôtels */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setEstablishmentFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  establishmentFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tous ({visibleRestaurants.length})
              </button>

              <button
                type="button"
                onClick={() => setEstablishmentFilter('restaurant')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  establishmentFilter === 'restaurant'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🍽️ Restaurants ({visibleRestaurants.filter(r => r.establishmentType !== 'hotel').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setEstablishmentFilter('hotel')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  establishmentFilter === 'hotel'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏨 Hôtels ({visibleRestaurants.filter(r => r.establishmentType === 'hotel').length})</span>
              </button>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvel Établissement</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleRestaurants
            .filter(r => {
              if (establishmentFilter === 'restaurant') return r.establishmentType !== 'hotel';
              if (establishmentFilter === 'hotel') return r.establishmentType === 'hotel';
              return true;
            })
            .map(r => {
            const isSelected = r.id === currentRestaurantId;
            const isDemo = r.id === 'resto-demo' || r.id === 'hotel-demo';
            const isHotel = r.establishmentType === 'hotel';
            return (
              <div
                key={r.id}
                className={`glass-card-dark rounded-3xl p-6 border transition-all space-y-4 relative ${
                  isSelected
                    ? 'border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Status Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isHotel ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        <span>{isHotel ? '🏨 Hôtel & Palace' : '🍽️ Restaurant'}</span>
                      </span>

                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded-full font-bold border border-white/15">
                        ID: {r.slug}
                      </span>
                      {isDemo ? (
                        <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Démo Test</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Client Encaissé
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1.5">{r.name}</h3>
                    <div className="text-xs text-slate-400">{r.address}, {r.city}</div>
                  </div>

                  <span className="text-xs font-bold font-mono text-amber-300 bg-white/10 px-2.5 py-1 rounded-xl shrink-0">
                    {r.setupKitCost || 100} €
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/10 text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isHotel ? 'Directeur' : 'Gérant'}</span>
                    <span className="font-semibold text-white truncate block">{r.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Code PIN secret</span>
                    <span className="font-mono font-bold text-amber-400">{r.accessPin || '2025'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Puces & {isHotel ? 'Chambres' : 'Tables'}</span>
                    <span className="font-semibold text-white">
                      5 Puces NFC · {r.tableCount} {isHotel ? 'chambres' : 'tables'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mode livraison</span>
                    <span className="font-semibold text-white">
                      {r.shippingPreference === 'on_site' ? 'Sur place' : 'La Poste'}
                    </span>
                  </div>
                </div>

                {/* Hardware Status Selector */}
                <div className="space-y-1.5 text-xs">
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Statut Puces & Matériel :</span>
                    <span className="text-[10px] font-mono text-amber-400">
                      {r.hardwareStatus === 'installed_on_site' ? '✓ Installé' : r.hardwareStatus === 'shipped' ? '📦 Expédié' : '⚙️ Encodage'}
                    </span>
                  </div>
                  <select
                    value={r.hardwareStatus || 'pending_encoding'}
                    onChange={e => updateHardwareStatus(r.id, e.target.value as HardwareStatus)}
                    className="w-full text-xs font-semibold bg-white/10 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="pending_encoding" className="bg-slate-900 text-white">⚙️ Puces NFC en cours d'encodage</option>
                    <option value="encoded" className="bg-slate-900 text-white">✅ 5 Puces prêtes & vérifiées</option>
                    <option value="shipped" className="bg-slate-900 text-white">📦 Expédié par Colissimo / La Poste</option>
                    <option value="installed_on_site" className="bg-slate-900 text-white">🌟 Installé sur place dans le restaurant</option>
                  </select>
                </div>

                {/* Dashboard Private Link */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Lien d'accès privé à donner au gérant :</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={getRestaurantDashboardUrl(r.id)}
                      className="w-full text-[11px] font-mono bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(r.id)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl transition-colors shrink-0"
                      title="Copier le lien"
                    >
                      {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Actions & Resend Email */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleResendEmail(r)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-white/10"
                    title="Renvoyer l'email d'onboarding avec les identifiants"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Email reçu</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {!isDemo && (
                      <button
                        type="button"
                        onClick={() => deleteRestaurant(r.id)}
                        className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                        title="Supprimer ce restaurant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSelectAndGoToDashboard(r.id)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                    >
                      <span>Ouvrir Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated Email History Log Drawer */}
      <div className="glass-card-dark rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Historique des Emails Automatiques d'Onboarding
              </h3>
              <p className="text-[11px] text-slate-400">
                Chaque restaurant reçoit immédiatement ses identifiants et instructions de pose.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">{emailLogs.length} envoyés</span>
        </div>

        <div className="divide-y divide-white/5">
          {emailLogs.map(log => (
            <div
              key={log.id}
              className="py-3 flex items-center justify-between gap-4 hover:bg-white/5 px-2 rounded-xl transition-colors text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    {log.restaurantName} · <span className="font-normal text-slate-400">{log.to}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Identifiant : <span className="font-mono text-amber-300">{log.slug}</span> (PIN: {log.pin}) · {log.chipsCount} puces
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {new Date(log.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveEmailModal(log)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Voir l'email</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Create New Restaurant */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-white/20 shadow-2xl relative animate-in fade-in my-8 space-y-4 glass-glow-amber">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Installer un Nouveau Restaurant (100 €)</h3>
                <p className="text-xs text-slate-400">Crée son espace privé, ses 5 puces NFC et envoie l'email automatique</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Nom de l'établissement</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Le Palais Gourmand"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Nom du gérant</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: David, Mehdi, Sarah..."
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Email du gérant</label>
                  <input
                    type="email"
                    required
                    placeholder="gerant@restaurant.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Ville</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Paris (75002)"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Adresse complète</label>
                  <input
                    type="text"
                    required
                    placeholder="12 rue de la Paix"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Nombre de tables</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tableCount}
                    onChange={e => setTableCount(parseInt(e.target.value, 10) || 10)}
                    className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Formule d'équipement matériel</label>
                <select
                  value={equipmentChoice}
                  onChange={e => setEquipmentChoice(e.target.value as EquipmentChoice)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                >
                  <option value="full_pack" className="bg-slate-900 text-white">Pack Complet : 5 Puces NFC Serveurs + QR Tables (100 €)</option>
                  <option value="nfc_servers_only" className="bg-slate-900 text-white">Uniquement les Puces NFC Serveurs (60 €)</option>
                  <option value="qr_tables_only" className="bg-slate-900 text-white">Uniquement les Chevalets QR Tables (50 €)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Créer & Envoyer l'Email d'Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
