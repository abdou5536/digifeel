import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Star,
  Info,
  Building
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';
import {
  exportTransactionsToCsv,
  exportServerPayrollToCsv,
  exportAccountingPdf,
  filterReviewsForExport,
  ExportFilterOptions
} from '../utils/accountingExport';

interface ManagerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerExportModal: React.FC<ManagerExportModalProps> = ({ isOpen, onClose }) => {
  const { restaurant, reviews, waiters } = useApp();

  const [period, setPeriod] = useState<ExportFilterOptions['period']>('all');
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFilter: ExportFilterOptions = {
    period,
    waiterId: selectedWaiterId
  };

  const filteredReviews = filterReviewsForExport(reviews, currentFilter);
  const totalTips = filteredReviews.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
  const avgRating = filteredReviews.length > 0
    ? (filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length).toFixed(1)
    : '5.0';
  const googleReviewsCount = filteredReviews.filter(r => r.googleReviewClicked).length;

  const handleExportCsvTransactions = () => {
    setIsGenerating('csv_tx');
    soundFX.playHoverTick();
    setTimeout(() => {
      exportTransactionsToCsv(restaurant, reviews, waiters, currentFilter);
      setIsGenerating(null);
      soundFX.playSuccessChime();
      setDownloadSuccess('Fichier CSV des transactions exporté avec succès !');
      setTimeout(() => setDownloadSuccess(null), 3500);
    }, 400);
  };

  const handleExportCsvPayroll = () => {
    setIsGenerating('csv_payroll');
    soundFX.playHoverTick();
    setTimeout(() => {
      exportServerPayrollToCsv(restaurant, waiters, reviews, currentFilter);
      setIsGenerating(null);
      soundFX.playSuccessChime();
      setDownloadSuccess('Bilan de paie serveurs CSV exporté !');
      setTimeout(() => setDownloadSuccess(null), 3500);
    }, 400);
  };

  const handleExportPdfReport = async () => {
    setIsGenerating('pdf');
    soundFX.playHoverTick();
    try {
      await exportAccountingPdf(restaurant, reviews, waiters, currentFilter);
      soundFX.playSuccessChime();
      setDownloadSuccess('Rapport comptable officiel PDF généré et téléchargé !');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-2xl w-full text-white space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Export Comptable & Statistiques</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    CONFORME URSSAF
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {restaurant.name} · Justificatif pourboires sans contact & avis clients
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playHoverTick();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto flex-1 pr-1 text-xs">
            
            {/* Filter Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
              {/* Period Filter */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Période des données :</span>
                </label>
                <select
                  value={period}
                  onChange={e => {
                    setPeriod(e.target.value as ExportFilterOptions['period']);
                    soundFX.playHoverTick();
                  }}
                  className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-medium outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-950">Tout l'historique ({reviews.length} avis)</option>
                  <option value="month" className="bg-slate-950">Ce mois-ci (Mois en cours)</option>
                  <option value="week" className="bg-slate-950">7 derniers jours</option>
                  <option value="today" className="bg-slate-950">Aujourd'hui uniquement</option>
                </select>
              </div>

              {/* Waiter Filter */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>{restaurant.establishmentType === 'hotel' ? 'Personnel / Collaborateur :' : 'Serveur / Membre d\'équipe :'}</span>
                </label>
                <select
                  value={selectedWaiterId}
                  onChange={e => {
                    setSelectedWaiterId(e.target.value);
                    soundFX.playHoverTick();
                  }}
                  className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-medium outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-950">{restaurant.establishmentType === 'hotel' ? 'Tout le personnel' : 'Tous les serveurs'} ({waiters.length})</option>
                  {waiters.map(w => (
                    <option key={w.id} value={w.id} className="bg-slate-950">
                      {w.name} ({w.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Filtered Preview KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Pourboires</div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  {totalTips.toFixed(2)} €
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Avis Filtrés</div>
                <div className="text-lg font-black text-white font-mono mt-0.5">
                  {filteredReviews.length}
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Note Moyenne</div>
                <div className="text-lg font-black text-amber-400 font-mono mt-0.5 flex items-center gap-1">
                  <span>{avgRating}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Avis Google</div>
                <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                  {googleReviewsCount}
                </div>
              </div>
            </div>

            {/* Export Format Cards */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Sélectionnez le format d'export :
              </div>

              {/* 1. PDF Accounting & Performance Statement */}
              <div className="p-4 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">Rapport Comptable Officiel & Bilan Mensuel (PDF A4)</h4>
                    <p className="text-[11px] text-slate-300">
                      Document certifié prêt pour votre expert-comptable avec ventilation par serveur et note fiscale.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportPdfReport}
                  disabled={isGenerating !== null}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGenerating === 'pdf' ? 'Génération...' : 'Télécharger PDF'}</span>
                </button>
              </div>

              {/* 2. CSV Transactions Data (Excel) */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">Grand Livre des Transactions & Avis (CSV Excel)</h4>
                    <p className="text-[11px] text-slate-400">
                      {restaurant.establishmentType === 'hotel'
                        ? 'Toutes les lignes brutes avec horodatage, chambre/suite, pourboire, puce NFC et avis client.'
                        : 'Toutes les lignes brutes avec horodatage, table, pourboire, puce NFC et commentaire client.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportCsvTransactions}
                  disabled={isGenerating !== null}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isGenerating === 'csv_tx' ? 'Export...' : 'Exporter CSV'}</span>
                </button>
              </div>

              {/* 3. CSV Payroll & Waiter Tip Breakdown */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">
                      {restaurant.establishmentType === 'hotel'
                        ? 'Bilan de Redistribution Paie Personnel (CSV)'
                        : 'Bilan de Redistribution Paie Serveurs (CSV)'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {restaurant.establishmentType === 'hotel'
                        ? 'Récapitulatif par collaborateur avec total des pourboires à reverser pour la fiche de paie.'
                        : 'Récapitulatif par serveur avec total des pourboires à reverser pour la fiche de paie.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportCsvPayroll}
                  disabled={isGenerating !== null}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isGenerating === 'csv_payroll' ? 'Export...' : 'Exporter Bilan Paie'}</span>
                </button>
              </div>
            </div>

            {/* Success Toast */}
            {downloadSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{downloadSuccess}</span>
              </motion.div>
            )}

            {/* Legal Notice */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex items-start gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Exonération Fiscale :</strong> Les pourboires dématérialisés sans contact sont exonérés de cotisations sociales et d'impôt sur le revenu pour vos salariés (seuil légal standard).
              </span>
            </div>

          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-400 text-[11px]">
              Encodage UTF-8 universel (Microsoft Excel, Numbers, Google Sheets)
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
