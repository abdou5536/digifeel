import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Printer,
  Download,
  Sparkles,
  Layers,
  Smartphone,
  Radio,
  Star,
  Check,
  Palette,
  FileText,
  Sliders,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Copy
} from 'lucide-react';
import { generateHighResQr, generateRestaurantPdf, QrPdfOptions } from '../utils/pdfGenerator';
import { ensureQrScanLink, ensureQrScanLinksForTables } from '../utils/scanTargetLinks';

interface BrandedQrModuleProps {
  embedded?: boolean;
}

export const BrandedQrModule: React.FC<BrandedQrModuleProps> = ({ embedded = false }) => {
  const { restaurant, tables, waiters, isDemoMode } = useApp();

  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [selectedFormat, setSelectedFormat] = useState<QrPdfOptions['format']>('a4_tent');
  const [selectedTheme, setSelectedTheme] = useState<QrPdfOptions['theme']>('gold_luxury');
  const [customSubtitle, setCustomSubtitle] = useState('EXPÉRIENCE DIGITALE & SATISFACTION CLIENT');
  const [ctaText, setCtaText] = useState('Scannez avec votre appareil photo');
  const [showNfcBadge, setShowNfcBadge] = useState(true);
  const [includeAllTables, setIncludeAllTables] = useState(true);
  
  const [singleQrDataUrl, setSingleQrDataUrl] = useState<string>('');
  const [currentTableUrl, setCurrentTableUrl] = useState('');
  const [scanLinkError, setScanLinkError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewMode, setPreviewMode] = useState<'tent' | 'card' | 'qr_only'>('tent');

  const baseUrl = window.location.origin;
  const legacyTableUrl = `${baseUrl}/?resto=${restaurant.slug}&table=${selectedTable}`;

  // Theme styling helpers
  const themeStyles = {
    gold_luxury: {
      name: 'Or Prestige & Nuit Étoilée',
      cardBg: 'bg-linear-to-b from-slate-950 via-slate-900 to-slate-950',
      border: 'border-amber-500/50',
      accentText: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      qrBg: 'bg-white',
      qrDark: '#050711'
    },
    cyber_dark: {
      name: 'Cyber Néon Électrique',
      cardBg: 'bg-linear-to-b from-slate-950 via-indigo-950/40 to-slate-950',
      border: 'border-cyan-500/50',
      accentText: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      qrBg: 'bg-white',
      qrDark: '#030712'
    },
    clean_minimal: {
      name: 'Blanc Épuré & Minimaliste',
      cardBg: 'bg-linear-to-b from-slate-100 via-white to-slate-100 text-slate-900',
      border: 'border-slate-300',
      accentText: 'text-slate-900',
      badgeBg: 'bg-slate-900 text-white border-slate-700',
      qrBg: 'bg-white',
      qrDark: '#0f172a'
    },
    emerald_prestige: {
      name: 'Émeraude Prestige & Or',
      cardBg: 'bg-linear-to-b from-slate-950 via-emerald-950/40 to-slate-950',
      border: 'border-emerald-500/50',
      accentText: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      qrBg: 'bg-white',
      qrDark: '#022c22'
    }
  };

  const activeStyle = themeStyles[selectedTheme];

  useEffect(() => {
    let cancelled = false;
    setScanLinkError('');
    if (isDemoMode) {
      setCurrentTableUrl(legacyTableUrl);
      return () => { cancelled = true; };
    }
    setCurrentTableUrl('');
    void ensureQrScanLink(restaurant, 'table', String(selectedTable), `Table ${selectedTable}`)
      .then(url => {
        if (!cancelled) setCurrentTableUrl(url);
      })
      .catch(error => {
        if (!cancelled) setScanLinkError(error instanceof Error ? error.message : 'Le lien QR n’a pas pu être enregistré.');
      });
    return () => { cancelled = true; };
  }, [isDemoMode, legacyTableUrl, restaurant, selectedTable]);

  // Generate High-Res QR code
  useEffect(() => {
    if (!currentTableUrl) {
      setSingleQrDataUrl('');
      return;
    }
    generateHighResQr(currentTableUrl, {
      colorDark: activeStyle.qrDark,
      colorLight: '#ffffff',
      size: 900
    })
      .then(url => setSingleQrDataUrl(url))
      .catch(error => {
        console.error('Le QR code de présentation n’a pas pu être généré.', error);
        setScanLinkError('Le QR code n’a pas pu être généré. Réessayez.');
      });
  }, [currentTableUrl, selectedTheme, activeStyle.qrDark]);

  // Handle PDF Export
  const handleDownloadPdf = async (all: boolean = includeAllTables) => {
    setIsGeneratingPdf(true);
    try {
      const targetTableNumbers = all
        ? tables.map(t => t.number)
        : [selectedTable];
      const tableUrls = isDemoMode
        ? undefined
        : await ensureQrScanLinksForTables(restaurant, tables, targetTableNumbers);

      await generateRestaurantPdf(restaurant, tables, targetTableNumbers, {
        format: selectedFormat,
        theme: selectedTheme,
        customSubtitle,
        ctaText,
        showNfcMention: showNfcBadge,
        tableUrls
      });

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setScanLinkError(err instanceof Error ? err.message : 'Le PDF n’a pas pu être généré.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy direct table review link
  const handleCopyLink = async () => {
    if (!currentTableUrl) return;
    try {
      await navigator.clipboard.writeText(currentTableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('La copie du lien QR a échoué.', error);
      setScanLinkError('Copie impossible dans ce navigateur. Sélectionnez le lien affiché et copiez-le.');
    }
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'p-4 sm:p-6 max-w-7xl mx-auto'}`}>
      {/* Header Banner */}
      <div className="glass-card-dark rounded-3xl p-6 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="hud-bracket-tl"></div>
        <div className="hud-bracket-br"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold">
                Module Studio d'Impression & QR Codes Haute Résolution
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Générateur de Chevalets de Table & Supports Imprimables
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Créez des QR codes ultra haute définition personnalisés aux couleurs de <strong className="text-white">{restaurant.name}</strong> avec gabarits PDF vectoriels prêts pour l'impression, la plastification ou l'insertion en chevalet plexiglas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleDownloadPdf(true)}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Génération du PDF...' : 'Télécharger PDF (Toutes les Tables)'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimer direct</span>
            </button>
          </div>
        </div>

        {pdfSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-semibold"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Votre fichier PDF haute définition a été généré avec succès ! Prêt pour impression 300 DPI.</span>
          </motion.div>
        )}
      </div>

      {/* Main Studio Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Format Selection Card */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>1. Format d'Impression du Gabarit PDF</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setSelectedFormat('a4_tent')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'a4_tent'
                    ? 'border-amber-400 bg-amber-500/15 text-white shadow-md shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Chevalet A4 Pliable</span>
                  {selectedFormat === 'a4_tent' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  2 faces avec pli central. Idéal à poser sur table.
                </div>
              </button>

              <button
                onClick={() => setSelectedFormat('a6_standee')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'a6_standee'
                    ? 'border-amber-400 bg-amber-500/15 text-white shadow-md shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Chevalet A6 Plexi</span>
                  {selectedFormat === 'a6_standee' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Format 10x15cm pour porte-menu ou présentoir.
                </div>
              </button>

              <button
                onClick={() => setSelectedFormat('a4_sheet')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'a4_sheet'
                    ? 'border-amber-400 bg-amber-500/15 text-white shadow-md shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Planche A4 (4 Tables)</span>
                  {selectedFormat === 'a4_sheet' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  4 chevalets par feuille avec lignes de découpe ✂.
                </div>
              </button>

              <button
                onClick={() => setSelectedFormat('table_stickers')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'table_stickers'
                    ? 'border-amber-400 bg-amber-500/15 text-white shadow-md shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Stickers de Table</span>
                  {selectedFormat === 'table_stickers' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  6 adhésifs carrés 8x8cm par page.
                </div>
              </button>
            </div>
          </div>

          {/* Theme & Branding Controls */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>2. Thème Graphique & Personnalisation</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(themeStyles) as Array<keyof typeof themeStyles>).map(themeKey => (
                <button
                  key={themeKey}
                  onClick={() => setSelectedTheme(themeKey)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    selectedTheme === themeKey
                      ? 'border-amber-400 bg-white/15 text-white font-bold'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{themeStyles[themeKey].name}</span>
                  {selectedTheme === themeKey && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </button>
              ))}
            </div>

            {/* Text Inputs */}
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Slogan ou sous-titre de l'établissement
                </label>
                <input
                  type="text"
                  value={customSubtitle}
                  onChange={e => setCustomSubtitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Texte d'appel à l'action (Call-to-Action)
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={e => setCtaText(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="text-slate-300 text-xs font-semibold flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showNfcBadge}
                    onChange={e => setShowNfcBadge(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 bg-white/10 border-white/20"
                  />
                  <span>Afficher la mention Sans Contact NFC</span>
                </label>
              </div>
            </div>
          </div>

          {/* Table Switcher & Direct Download Actions */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>3. Sélection de Table & Export</span>
              </div>
              <span className="text-xs font-mono text-slate-400">{tables.length} tables configurées</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold shrink-0">Table active :</span>
              <select
                value={selectedTable}
                onChange={e => setSelectedTable(parseInt(e.target.value, 10))}
                className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 font-bold text-white focus:outline-none cursor-pointer"
              >
                {tables.map(t => (
                  <option key={t.number} value={t.number} className="bg-slate-950 text-white">
                    Table {t.number} ({t.zone}) · {t.totalScans} scans enregistrés
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleDownloadPdf(false)}
                disabled={isGeneratingPdf}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger PDF Table N°{selectedTable} ({selectedFormat.toUpperCase()})</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {singleQrDataUrl && (
                  <a
                    href={singleQrDataUrl}
                    download={`qrcode-table-${selectedTable}-${restaurant.slug}-hd.png`}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-white/10 text-center"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PNG HD (1200px)</span>
                  </a>
                )}

                <button
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Lien copié !' : 'Copier lien table'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live High-Resolution Standee Simulation */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card-dark rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="hud-bracket-tl"></div>
            <div className="hud-bracket-br"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400">
                    Aperçu Haute Définition en Temps Réel
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                    300 DPI Vectoriel
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Rendu Physique Chevalet · Table N°{selectedTable}
                </h3>
              </div>

              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setPreviewMode('tent')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    previewMode === 'tent' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Chevalet 3D
                </button>
                <button
                  onClick={() => setPreviewMode('card')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    previewMode === 'card' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Face Plane
                </button>
                <button
                  onClick={() => setPreviewMode('qr_only')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    previewMode === 'qr_only' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  QR Seul
                </button>
              </div>
            </div>

            {/* Standee Mockup Container */}
            <div className="flex items-center justify-center p-4 sm:p-8 bg-slate-950/60 rounded-3xl border border-white/10 min-h-[520px]">
              {previewMode === 'tent' ? (
                /* Foldable Table Tent Double-Face Perspective */
                <div className="w-full max-w-lg space-y-4">
                  <div className="text-center text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-center gap-2">
                    <span>✂ Ligne de pliage centrale (Chevalet double face)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Face 1 */}
                    <div
                      className={`rounded-3xl p-5 border-2 ${activeStyle.cardBg} ${activeStyle.border} shadow-2xl text-center space-y-3 relative overflow-hidden`}
                    >
                      <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                        Face Client 1
                      </div>
                      <div className="w-8 h-0.5 bg-amber-400 mx-auto rounded-full"></div>
                      <div className="text-base font-black tracking-tight text-white uppercase">
                        {restaurant.name}
                      </div>

                      <div className="inline-block bg-amber-500 text-slate-950 font-mono text-[11px] font-black px-3 py-0.5 rounded-full shadow-xs">
                        TABLE N° {selectedTable}
                      </div>

                      <div className="p-2.5 bg-white rounded-2xl inline-block shadow-xl my-1">
                        {singleQrDataUrl ? (
                          <img
                            src={singleQrDataUrl}
                            alt={`QR Code Table ${selectedTable}`}
                            className="w-32 h-32 object-contain mx-auto"
                          />
                        ) : (
                          <div className="w-32 h-32 flex items-center justify-center text-xs text-slate-900">
                            Génération...
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[11px] font-bold text-white">
                          {ctaText}
                        </div>
                        <div className="text-amber-400 text-xs font-bold">
                          ★ ★ ★ ★ ★
                        </div>
                      </div>

                      {showNfcBadge && (
                        <div className="pt-2 border-t border-white/10 text-[9px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1">
                          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                          <span>TOUCHER SANS CONTACT NFC</span>
                        </div>
                      )}
                    </div>

                    {/* Face 2 */}
                    <div
                      className={`rounded-3xl p-5 border-2 ${activeStyle.cardBg} ${activeStyle.border} shadow-2xl text-center space-y-3 relative overflow-hidden`}
                    >
                      <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                        Face Client 2
                      </div>
                      <div className="w-8 h-0.5 bg-amber-400 mx-auto rounded-full"></div>
                      <div className="text-base font-black tracking-tight text-white uppercase">
                        {restaurant.name}
                      </div>

                      <div className="inline-block bg-amber-500 text-slate-950 font-mono text-[11px] font-black px-3 py-0.5 rounded-full shadow-xs">
                        TABLE N° {selectedTable}
                      </div>

                      <div className="p-2.5 bg-white rounded-2xl inline-block shadow-xl my-1">
                        {singleQrDataUrl ? (
                          <img
                            src={singleQrDataUrl}
                            alt={`QR Code Table ${selectedTable}`}
                            className="w-32 h-32 object-contain mx-auto"
                          />
                        ) : (
                          <div className="w-32 h-32 flex items-center justify-center text-xs text-slate-900">
                            Génération...
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[11px] font-bold text-white">
                          {ctaText}
                        </div>
                        <div className="text-amber-400 text-xs font-bold">
                          ★ ★ ★ ★ ★
                        </div>
                      </div>

                      {showNfcBadge && (
                        <div className="pt-2 border-t border-white/10 text-[9px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1">
                          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                          <span>TOUCHER SANS CONTACT NFC</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : previewMode === 'card' ? (
                /* Flat A6 / Standee Preview */
                <div
                  className={`w-full max-w-xs rounded-3xl p-6 border-2 ${activeStyle.cardBg} ${activeStyle.border} shadow-2xl text-center space-y-3.5 relative overflow-hidden`}
                >
                  <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                    BIENVENUE AU
                  </div>
                  <div className="text-lg font-black tracking-tight text-white uppercase">
                    {restaurant.name}
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium">
                    {customSubtitle}
                  </div>

                  <div className="inline-block bg-amber-500 text-slate-950 font-mono text-xs font-black px-3.5 py-1 rounded-full shadow-xs">
                    TABLE N° {selectedTable}
                  </div>

                  <div className="p-3 bg-white rounded-2xl inline-block shadow-2xl my-2">
                    {singleQrDataUrl && (
                      <img
                        src={singleQrDataUrl}
                        alt={`QR Code Table ${selectedTable}`}
                        className="w-44 h-44 object-contain mx-auto"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">
                      {ctaText}
                    </div>
                    <div className="text-amber-400 text-sm font-bold">
                      ★ ★ ★ ★ ★
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Redirection automatique 5 étoiles sur Google Maps
                    </div>
                  </div>

                  {showNfcBadge && (
                    <div className="pt-3 border-t border-white/10 text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span>SANS CONTACT NFC & SCAN QR IMMÉDIAT</span>
                    </div>
                  )}
                </div>
              ) : (
                /* QR Only High-Res View */
                <div className="p-8 bg-white rounded-3xl shadow-2xl text-center space-y-4">
                  {singleQrDataUrl && (
                    <img
                      src={singleQrDataUrl}
                      alt={`QR Code Table ${selectedTable}`}
                      className="w-64 h-64 object-contain mx-auto"
                    />
                  )}
                  <div className="text-slate-950 font-black text-sm">
                    {restaurant.name} · TABLE {selectedTable}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Help & Quick Testing Bar */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  Le QR code pointe directement sur votre système de pourboire et d'évaluation avec le serveur affecté à la table.
                </span>
              </div>

              <a
                href={currentTableUrl}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!currentTableUrl}
                onClick={event => { if (!currentTableUrl) event.preventDefault(); }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors flex items-center gap-1 shrink-0 self-start sm:self-auto aria-disabled:opacity-50"
              >
                <span>Tester le scan</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              </a>
            </div>
            {scanLinkError && <p className="text-sm text-red-300" role="alert">{scanLinkError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
