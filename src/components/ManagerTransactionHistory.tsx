import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Review, Waiter, TableItem } from '../types';
import { formatCurrency, getCurrencyInfo, WORLD_CURRENCIES } from '../utils/currencyUtils';
import { exportTransactionsToCsv, exportAccountingPdf } from '../utils/accountingExport';
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  Star,
  Euro,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle2,
  Radio,
  ArrowUpRight,
  TrendingUp,
  Award,
  Sparkles,
  Camera,
  X,
  CreditCard,
  Zap,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export const ManagerTransactionHistory: React.FC = () => {
  const {
    restaurant,
    reviews,
    waiters,
    tables,
    displayCurrency,
    setDisplayCurrency,
    addReview
  } = useApp();

  const isHotel = restaurant.establishmentType === 'hotel';

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedWaiter, setSelectedWaiter] = useState<string>('all');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'tips_only' | 'five_stars'>('all');

  // Detail Modal Transaction State
  const [selectedTransaction, setSelectedTransaction] = useState<Review | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Chronologically sorted reviews (Newest first)
  const sortedReviews = useMemo(() => {
    return [...reviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [reviews]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sortedReviews.filter(r => {
      // Restaurant match
      if (r.restaurantId && r.restaurantId !== restaurant.id) return false;

      // Search match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchWaiter = r.waiterName.toLowerCase().includes(query);
        const matchTable = `table ${r.tableNumber}`.toLowerCase().includes(query) || `chambre ${r.tableNumber}`.toLowerCase().includes(query) || r.tableNumber.toString() === query;
        const matchComment = r.comment?.toLowerCase().includes(query);
        const matchCompliment = r.compliments?.some(c => c.toLowerCase().includes(query));
        if (!matchWaiter && !matchTable && !matchComment && !matchCompliment) return false;
      }

      // Waiter match
      if (selectedWaiter !== 'all' && r.waiterId !== selectedWaiter) return false;

      // Table match
      if (selectedTableFilter !== 'all' && r.tableNumber.toString() !== selectedTableFilter) return false;

      // Type filter
      if (selectedTypeFilter === 'tips_only' && (r.tipAmount || 0) <= 0) return false;
      if (selectedTypeFilter === 'five_stars' && r.rating < 4.5) return false;

      // Period match
      const txTime = new Date(r.createdAt).getTime();
      if (selectedPeriod === 'today' && txTime < todayStart) return false;
      if (selectedPeriod === 'week' && txTime < weekStart) return false;
      if (selectedPeriod === 'month' && txTime < monthStart) return false;

      return true;
    });
  }, [sortedReviews, restaurant.id, searchTerm, selectedWaiter, selectedTableFilter, selectedTypeFilter, selectedPeriod]);

  // Key KPI Calculations based on filtered dataset
  const totalTipsSum = useMemo(() => {
    return filteredTransactions.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
  }, [filteredTransactions]);

  const tipTransactionsCount = useMemo(() => {
    return filteredTransactions.filter(r => (r.tipAmount || 0) > 0).length;
  }, [filteredTransactions]);

  const avgTipAmount = tipTransactionsCount > 0 ? totalTipsSum / tipTransactionsCount : 0;

  // Top Server in dataset
  const topWaiter = useMemo(() => {
    const waiterMap: Record<string, { name: string; tips: number }> = {};
    filteredTransactions.forEach(r => {
      if (!waiterMap[r.waiterId]) {
        waiterMap[r.waiterId] = { name: r.waiterName, tips: 0 };
      }
      waiterMap[r.waiterId].tips += r.tipAmount || 0;
    });
    const sorted = Object.values(waiterMap).sort((a, b) => b.tips - a.tips);
    return sorted[0] || null;
  }, [filteredTransactions]);

  // Top Generous Table in dataset
  const topTable = useMemo(() => {
    const tableMap: Record<number, number> = {};
    filteredTransactions.forEach(r => {
      if (!tableMap[r.tableNumber]) tableMap[r.tableNumber] = 0;
      tableMap[r.tableNumber] += r.tipAmount || 0;
    });
    const sorted = Object.entries(tableMap).sort((a, b) => Number(b[1]) - Number(a[1]));
    return sorted[0] ? { tableNumber: Number(sorted[0][0]), totalTips: Number(sorted[0][1]) } : null;
  }, [filteredTransactions]);

  // Relative time helper (ex: "il y a 8 min")
  const getRelativeTime = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffHour < 24) return `il y a ${diffHour} h`;
    if (diffDay === 1) return 'Hier';
    return `il y a ${diffDay} j`;
  };

  // Simulate Live Tip Action
  const handleSimulateTip = () => {
    if (waiters.length === 0) return;
    const randomWaiter = waiters[Math.floor(Math.random() * waiters.length)];
    const randomTable = randomWaiter.tablesAssigned && randomWaiter.tablesAssigned.length > 0
      ? randomWaiter.tablesAssigned[Math.floor(Math.random() * randomWaiter.tablesAssigned.length)]
      : Math.floor(Math.random() * 12) + 1;

    const presetTips = [3, 5, 8.50, 10, 12, 15];
    const tip = presetTips[Math.floor(Math.random() * presetTips.length)];

    const compliments = ['Service parfait', 'Sourire & Chaleur', 'Très réactif', 'Ambiance au top'];
    const comments = [
      'Paiement du pourboire ultra simple via le badge NFC !',
      'Excellente expérience en salle, bravo au serveur.',
      'Rien à redire, rapidité et gentillesse.',
      'Super moment passé en famille.'
    ];

    addReview({
      restaurantId: restaurant.id,
      waiterId: randomWaiter.id,
      waiterName: randomWaiter.name,
      tableNumber: randomTable,
      rating: 5.0,
      compliments: [compliments[Math.floor(Math.random() * compliments.length)]],
      comment: comments[Math.floor(Math.random() * comments.length)],
      tipAmount: tip,
      googleReviewClicked: true
    });

    soundFX.playNotificationAlert();
  };

  const handleCopyTxId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    soundFX.playSuccessChime();
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="glass-card-dark rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold">
                Historique Chronologique des Transactions & Pourboires
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                Puces NFC 13.56 MHz & QR Code
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Journal Inaltérable des Pourboires Versés En Salle
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Consultez le fil horodaté en temps réel de tous les règlements sans contact reçus par l'équipe de <strong className="text-white">{restaurant.name}</strong> avec horodatage certifié, serveur récompensé, numéro de table et commentaires clients.
            </p>
          </div>

          {/* Quick Actions & Simulation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSimulateTip}
              className="px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Simuler immédiatement une nouvelle transaction de pourboire"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Simuler Pourboire Live</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportTransactionsToCsv(restaurant, filteredTransactions, waiters, { period: selectedPeriod, waiterId: selectedWaiter });
                soundFX.playHoverTick();
              }}
              className="px-3.5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Exporter les transactions filtrées au format CSV pour Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV (Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportAccountingPdf(restaurant, filteredTransactions, waiters, { period: selectedPeriod, waiterId: selectedWaiter });
                soundFX.playHoverTick();
              }}
              className="px-3.5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Générer un rapport PDF officiel pour la comptabilité et l'URSSAF"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Rapport PDF Comptable</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tips Volume */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] font-mono">
              Volume Total Pourboires
            </span>
            <Euro className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {formatCurrency(totalTipsSum, displayCurrency, { showDualEquivalent: true })}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Sur {tipTransactionsCount} versements validés</span>
          </div>
        </div>

        {/* Transactions Count & Average */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] font-mono">
              Moyenne / Transaction
            </span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
            {formatCurrency(avgTipAmount, displayCurrency)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{filteredTransactions.length} transactions au total</span>
          </div>
        </div>

        {/* Top Server */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[10px] font-mono">
              Top Serveur Récompensé
            </span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-black text-white truncate">
            {topWaiter ? topWaiter.name : 'Aucun'}
          </div>
          <div className="text-[11px] text-cyan-300 font-bold font-mono">
            {topWaiter ? `${formatCurrency(topWaiter.tips, displayCurrency)} récoltés` : '-'}
          </div>
        </div>

        {/* Top Generous Table */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px] font-mono">
              {isHotel ? 'Chambre la Plus Généreuse' : 'Table la Plus Généreuse'}
            </span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-black text-white font-mono">
            {topTable ? (isHotel ? `Chambre ${topTable.tableNumber}` : `Table ${topTable.tableNumber}`) : 'Aucune'}
          </div>
          <div className="text-[11px] text-purple-300 font-bold font-mono">
            {topTable ? `${formatCurrency(topTable.totalTips, displayCurrency)} versés` : '-'}
          </div>
        </div>
      </div>

      {/* Multi-Criteria Filters Bar */}
      <div className="glass-card-dark p-4 rounded-3xl border border-white/10 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher par serveur, numéro de table, commentaire..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Currency Switcher Pill */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] text-slate-400 font-mono font-bold px-2">Devise :</span>
            {['EUR', 'DZD', 'TND', 'USD', 'MAD'].map(code => (
              <button
                key={code}
                onClick={() => {
                  setDisplayCurrency(code);
                  soundFX.playHoverTick();
                }}
                className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  displayCurrency === code ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {WORLD_CURRENCIES[code]?.flag} {code}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Waiter Filter */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Serveur / Collaborateur :</label>
            <select
              value={selectedWaiter}
              onChange={e => setSelectedWaiter(e.target.value)}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">Tous les serveurs ({waiters.length})</option>
              {waiters.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>
          </div>

          {/* Table Filter */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
              {isHotel ? 'Chambre / Suite :' : 'Table :'}
            </label>
            <select
              value={selectedTableFilter}
              onChange={e => setSelectedTableFilter(e.target.value)}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">Toutes les tables</option>
              {tables.map(t => (
                <option key={t.number} value={t.number.toString()}>
                  {isHotel ? `Chambre ${t.number}` : `Table N°${t.number}`} ({t.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Période :</label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value as any)}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">Historique complet</option>
              <option value="today">Aujourd'hui uniquement</option>
              <option value="week">7 derniers jours</option>
              <option value="month">Ce mois-ci</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Filtre Type :</label>
            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value as any)}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">Tous les enregistrements</option>
              <option value="tips_only">Pourboires uniquement (&gt; 0 €)</option>
              <option value="five_stars">Avis 5 Étoiles ★★★★★</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Transactions Feed Table */}
      <div className="glass-card-dark rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span>Transactions Horodatées ({filteredTransactions.length})</span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            Trié du plus récent au plus ancien
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <History className="w-10 h-10 text-slate-600 mx-auto opacity-40" />
            <p className="text-sm font-medium text-slate-400">Aucune transaction trouvée pour ces critères.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedWaiter('all');
                setSelectedTableFilter('all');
                setSelectedPeriod('all');
                setSelectedTypeFilter('all');
              }}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-x-auto">
            {filteredTransactions.map((tx, index) => {
              const dateObj = new Date(tx.createdAt);
              const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
              const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              const waiter = waiters.find(w => w.id === tx.waiterId);

              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    setSelectedTransaction(tx);
                    soundFX.playHoverTick();
                  }}
                  className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs group"
                >
                  {/* Left Info: Timestamp + Server + Table */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Icon Avatar */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
                      tx.tipAmount > 0
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    }`}>
                      {tx.tipAmount > 0 ? (
                        <Euro className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      {/* Server name and table badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {tx.waiterName}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-full border border-white/10">
                          {isHotel ? `Ch. ${tx.tableNumber}` : `Table N°${tx.tableNumber}`}
                        </span>
                        {tx.googleReviewClicked && (
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                            ★ Google Review
                          </span>
                        )}
                      </div>

                      {/* Timestamp & Relative time */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formattedDate} à {formattedTime}</span>
                        <span className="text-amber-400/80 font-bold">({getRelativeTime(tx.createdAt)})</span>
                      </div>

                      {/* Compliments / Comments preview */}
                      {tx.compliments && tx.compliments.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {tx.compliments.map((c, i) => (
                            <span key={i} className="text-[9px] bg-white/5 text-slate-300 px-1.5 py-0.5 rounded-md border border-white/5">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {tx.comment && (
                        <p className="text-[11px] text-slate-300 italic line-clamp-1 max-w-lg">
                          "{tx.comment}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Info: Rating + Tip Amount Badge */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    {/* Star Rating */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-amber-400 text-xs font-bold">
                        <span>{tx.rating.toFixed(1)}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Satisfaction
                      </span>
                    </div>

                    {/* Tip Amount Badge */}
                    <div className="text-right">
                      {tx.tipAmount > 0 ? (
                        <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black font-mono text-sm shadow-sm flex items-center gap-1">
                          <span>+{formatCurrency(tx.tipAmount, displayCurrency, { showDualEquivalent: true })}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-slate-500 italic">Sans pourboire</span>
                      )}
                      <span className="text-[9px] text-emerald-400/80 font-mono block mt-0.5">
                        NFC Certifié
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Audit Detail Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransaction(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#090d18] border border-amber-500/40 rounded-3xl p-6 text-white shadow-2xl space-y-5 my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-sm text-white">Récépissé de Transaction NFC</h3>
                    <p className="text-[10px] text-slate-400 font-mono">ID : {selectedTransaction.id}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Details Box */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Horodatage :</span>
                  <span className="text-white font-bold">
                    {new Date(selectedTransaction.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Établissement :</span>
                  <span className="text-white font-bold">{restaurant.name}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Emplacement :</span>
                  <span className="text-amber-300 font-bold">
                    {isHotel ? `Chambre ${selectedTransaction.tableNumber}` : `Table N°${selectedTransaction.tableNumber}`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Serveur Référent :</span>
                  <span className="text-white font-bold">{selectedTransaction.waiterName}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400 border-t border-white/10 pt-2">
                  <span>Note Client :</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    {selectedTransaction.rating.toFixed(1)} / 5.0 ★
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400 border-t border-white/10 pt-2">
                  <span>Pourboire Versé :</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {formatCurrency(selectedTransaction.tipAmount, displayCurrency, { showDualEquivalent: true })}
                  </span>
                </div>
              </div>

              {/* Compliments & Comments */}
              {selectedTransaction.compliments && selectedTransaction.compliments.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">Compliments sélectionnés :</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTransaction.compliments.map((c, i) => (
                      <span key={i} className="text-xs bg-white/10 text-amber-300 px-2.5 py-1 rounded-xl border border-white/10 font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransaction.comment && (
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">Commentaire client :</span>
                  <p className="text-xs text-slate-200 italic bg-black/40 p-3 rounded-2xl border border-white/10">
                    "{selectedTransaction.comment}"
                  </p>
                </div>
              )}

              {selectedTransaction.photoUrl && (
                <div className="space-y-1">
                  <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Photo du plat jointe :
                  </span>
                  <img
                    src={selectedTransaction.photoUrl}
                    alt="Avis client"
                    className="w-full max-h-48 object-cover rounded-2xl border border-amber-500/40"
                  />
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyTxId(selectedTransaction.id)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'ID copié !' : 'Copier ID TX'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
