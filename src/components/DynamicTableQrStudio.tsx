import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Sparkles,
  Palette,
  Eye,
  Layers,
  Printer,
  Smartphone,
  ShieldCheck,
  Sliders,
  ExternalLink,
  RefreshCw,
  Zap,
  Cpu,
  LayoutGrid,
  FileImage,
  Flame,
  Radio,
  Share2
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';
import { generateRestaurantPdf, QrPdfOptions } from '../utils/pdfGenerator';

export interface DynamicTableQrStudioProps {
  embedded?: boolean;
}

export type QrStyleTheme = 'gold_obsidian' | 'cyber_cyan' | 'emerald_luxury' | 'pure_minimal' | 'royal_ruby' | 'custom';
export type QrFrameShape = 'rounded' | 'square' | 'shield' | 'circle';

export const formatLabels: Record<QrPdfOptions['format'], { name: string; desc: string; badge: string; icon: string }> = {
  a4_tent: {
    name: 'Chevalet A4 Pliable 3D',
    desc: 'Format 297x210mm pliable double-face (3D standing tent)',
    badge: '3D Chevalet',
    icon: '🪧'
  },
  a6_standee: {
    name: 'Modèle Standard A6',
    desc: 'Format 105x148mm pour présentoir plexiglas & porte-menu',
    badge: 'Standard A6',
    icon: '📐'
  },
  a4_sheet: {
    name: 'Carte de Visite & Découpe',
    desc: 'Planche A4 de 4 cartes/chasse-cartes avec tirets de découpe ✂',
    badge: 'Carte / Découpe',
    icon: '💳'
  },
  table_stickers: {
    name: 'Stickers & Autocollants',
    desc: 'Planche A4 de 6 autocollants carrés de table 75x75mm',
    badge: 'Autocollants',
    icon: '🏷️'
  }
};

export const DynamicTableQrStudio: React.FC<DynamicTableQrStudioProps> = ({ embedded = false }) => {
  const {
    restaurant,
    tables,
    waiters,
    setMode,
    setSelectedTableNumber,
    visibleRestaurants,
    currentRestaurantId,
    setCurrentRestaurantId
  } = useApp();

  const isHotel = restaurant.establishmentType === 'hotel';
  const [selectedTable, setSelectedTable] = useState<number>(() => {
    return tables[0]?.number || 1;
  });
  const [customTableInput, setCustomTableInput] = useState<string>('');
  const [pdfFormat, setPdfFormat] = useState<QrPdfOptions['format']>('a4_tent');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Keep selectedTable in sync when switching between restaurant and hotel accounts
  useEffect(() => {
    if (tables.length > 0 && !tables.some(t => t.number === selectedTable)) {
      setSelectedTable(tables[0].number);
    }
  }, [tables, selectedTable]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [qrTheme, setQrTheme] = useState<QrStyleTheme>('gold_obsidian');
  const [customDarkColor, setCustomDarkColor] = useState<string>('#d97706');
  const [customLightColor, setCustomLightColor] = useState<string>('#ffffff');
  const [frameShape, setFrameShape] = useState<QrFrameShape>('rounded');
  const [includeCenterLogo, setIncludeCenterLogo] = useState<boolean>(true);
  const [centerLogoType, setCenterLogoType] = useState<'initial' | 'star' | 'nfc' | 'qr'>('initial');
  const [headerTagline, setHeaderTagline] = useState<string>('VOTRE AVIS COMPTE POUR NOTRE ÉQUIPE');
  const [ctaBottomText, setCtaBottomText] = useState<string>('Scannez pour évaluer & régler en 1 clic');
  const [showTableNumberBadge, setShowTableNumberBadge] = useState<boolean>(true);
  const [showNfcInductionTag, setShowNfcInductionTag] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'branded_card' | 'pure_qr' | 'tent_3d' | 'all_tables_grid'>('branded_card');

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const activeTableItem = tables.find(t => t.number === selectedTable) || tables[0] || {
    number: 1,
    zone: 'Salle Principale',
    totalScans: 42,
    restaurantId: restaurant.id
  };
  const assignedWaiter = waiters.find(w => w.id === activeTableItem.assignedWaiterId) || waiters[0];
  const tableUrl = `${baseUrl}/?resto=${restaurant.slug}&table=${selectedTable}&ref=qr_dynamic`;

  // Themes mapping
  const THEMES: Record<QrStyleTheme, { name: string; dark: string; light: string; accent: string; border: string; bg: string; badge: string }> = {
    gold_obsidian: {
      name: 'Or Somptueux & Obsidienne',
      dark: '#d97706',
      light: '#0a0f1d',
      accent: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'from-slate-950 via-slate-900 to-slate-950',
      badge: 'bg-amber-500 text-slate-950'
    },
    cyber_cyan: {
      name: 'Cyber Néon Électrique',
      dark: '#06b6d4',
      light: '#030712',
      accent: 'text-cyan-400',
      border: 'border-cyan-500/40',
      bg: 'from-slate-950 via-cyan-950/30 to-slate-950',
      badge: 'bg-cyan-500 text-slate-950'
    },
    emerald_luxury: {
      name: 'Émeraude Prestige & Or',
      dark: '#10b981',
      light: '#022c22',
      accent: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'from-slate-950 via-emerald-950/30 to-slate-950',
      badge: 'bg-emerald-500 text-slate-950'
    },
    royal_ruby: {
      name: 'Rubis Impérial & Cuivre',
      dark: '#e11d48',
      light: '#1f090d',
      accent: 'text-rose-400',
      border: 'border-rose-500/40',
      bg: 'from-slate-950 via-rose-950/30 to-slate-950',
      badge: 'bg-rose-500 text-white'
    },
    pure_minimal: {
      name: 'Blanc Platine & Titane',
      dark: '#0f172a',
      light: '#f8fafc',
      accent: 'text-slate-900',
      border: 'border-slate-300',
      bg: 'from-slate-100 via-white to-slate-100 text-slate-900',
      badge: 'bg-slate-900 text-white'
    },
    custom: {
      name: 'Palette Personnalisée',
      dark: customDarkColor,
      light: customLightColor,
      accent: 'text-amber-400',
      border: 'border-white/20',
      bg: 'from-slate-950 via-slate-900 to-slate-950',
      badge: 'bg-amber-500 text-slate-950'
    }
  };

  const currentTheme = THEMES[qrTheme];

  // Draw High-Res Branded QR Code on Canvas with center Monogram Logo
  useEffect(() => {
    let isCancelled = false;
    const renderBrandedQr = async () => {
      setIsGenerating(true);
      try {
        const darkColor = qrTheme === 'custom' ? customDarkColor : currentTheme.dark;
        const lightColor = '#ffffff'; // Best contrast for physical scanning

        // Generate base QR as data URL
        const rawQrDataUrl = await QRCode.toDataURL(tableUrl, {
          width: 1000,
          margin: 2,
          errorCorrectionLevel: 'H', // High error correction to allow center logo
          color: {
            dark: darkColor,
            light: lightColor
          }
        });

        if (isCancelled) return;

        // Render to canvas with branded center badge & rounded eye styling
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
          if (isCancelled) return;
          ctx.clearRect(0, 0, 1000, 1000);

          // Draw base white background with rounded corners
          ctx.fillStyle = '#ffffff';
          if (frameShape === 'rounded') {
            roundRect(ctx, 0, 0, 1000, 1000, 48);
            ctx.fill();
          } else {
            ctx.fillRect(0, 0, 1000, 1000);
          }

          // Draw QR Image
          ctx.drawImage(img, 0, 0, 1000, 1000);

          // Draw Center Logo / Monogram Badge
          if (includeCenterLogo) {
            const centerSize = 220;
            const centerPos = (1000 - centerSize) / 2;

            // Outer Glow & Shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.35)';
            ctx.shadowBlur = 24;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 8;

            // Badge Background
            ctx.fillStyle = '#0f172a'; // Deep obsidian
            roundRect(ctx, centerPos, centerPos, centerSize, centerSize, 36);
            ctx.fill();
            ctx.restore();

            // Gold/Accent Border
            ctx.strokeStyle = darkColor;
            ctx.lineWidth = 8;
            roundRect(ctx, centerPos, centerPos, centerSize, centerSize, 36);
            ctx.stroke();

            // Inner Ring
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 3;
            roundRect(ctx, centerPos + 10, centerPos + 10, centerSize - 20, centerSize - 20, 26);
            ctx.stroke();

            // Center Content
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (centerLogoType === 'initial') {
              const letter = (restaurant.name || 'D').charAt(0).toUpperCase();
              ctx.font = 'bold 110px "Inter", sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(letter, 500, 495);

              ctx.font = 'bold 22px "Inter", sans-serif';
              ctx.fillStyle = darkColor;
              ctx.fillText(`TABLE ${selectedTable}`, 500, 565);
            } else if (centerLogoType === 'star') {
              ctx.font = 'bold 84px "Inter", sans-serif';
              ctx.fillStyle = '#fbbf24';
              ctx.fillText('★', 500, 485);

              ctx.font = 'bold 24px "Inter", sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.fillText('5.0 AVIS', 500, 555);
            } else if (centerLogoType === 'nfc') {
              ctx.font = 'bold 50px "Inter", sans-serif';
              ctx.fillStyle = '#34d399';
              ctx.fillText('NFC', 500, 475);

              ctx.font = 'bold 20px "Inter", sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.fillText('13.56 MHz', 500, 545);
            } else {
              ctx.font = 'bold 54px "Inter", sans-serif';
              ctx.fillStyle = darkColor;
              ctx.fillText('QR', 500, 480);

              ctx.font = 'bold 22px "Inter", sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(`N° ${selectedTable}`, 500, 545);
            }
          }

          const finalData = canvas.toDataURL('image/png');
          setQrDataUrl(finalData);
          setIsGenerating(false);
        };
        img.src = rawQrDataUrl;
      } catch (err) {
        console.error('QR Render Error:', err);
        setIsGenerating(false);
      }
    };

    renderBrandedQr();
    return () => {
      isCancelled = true;
    };
  }, [tableUrl, qrTheme, customDarkColor, customLightColor, frameShape, includeCenterLogo, centerLogoType, restaurant.name, selectedTable, currentTheme.dark]);

  // Helper for rounded canvas rect
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Copy Direct Table Review URL
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopiedLink(true);
    soundFX.playSuccessChime();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy QR Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopiedImage(true);
      soundFX.playSuccessChime();
      setTimeout(() => setCopiedImage(false), 2500);
    } catch {
      // Fallback to downloading
      handleDownloadImage();
    }
  };

  // Download Single Table QR Image
  const handleDownloadImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Table_${selectedTable}_${restaurant.slug}_HD.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundFX.playNotificationAlert();
    setDownloadSuccess(`QR Code Table ${selectedTable} téléchargé en Haute Définition !`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Download Single Table Printable PDF based on chosen format
  const handleDownloadSingleTablePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateRestaurantPdf(restaurant, tables, [selectedTable], {
        format: pdfFormat,
        theme: 'gold_luxury',
        customTitle: headerTagline,
        ctaText: ctaBottomText,
        showNfcMention: showNfcInductionTag
      });
      soundFX.playNotificationAlert();
      setDownloadSuccess(`PDF Table ${selectedTable} généré au format ${formatLabels[pdfFormat].name} !`);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('PDF Single Table error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download All Tables Printable PDF Batch based on chosen format
  const handleDownloadAllTablesPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const tableNums = tables.map(t => t.number);
      await generateRestaurantPdf(restaurant, tables, tableNums, {
        format: pdfFormat,
        theme: 'gold_luxury',
        customTitle: headerTagline,
        ctaText: ctaBottomText,
        showNfcMention: showNfcInductionTag
      });
      soundFX.playNotificationAlert();
      setDownloadSuccess(`Pack PDF (${tables.length} tables) généré au format ${formatLabels[pdfFormat].name} !`);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('PDF All Tables error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Table Test in Customer View
  const handleTestInCustomerView = () => {
    setSelectedTableNumber(selectedTable);
    setMode('client');
    soundFX.playNfcTap();
  };

  // Unique Zones
  const zones = Array.from(new Set(tables.map(t => t.zone || 'Salle Principale')));
  const filteredTables = selectedZone === 'all' ? tables : tables.filter(t => t.zone === selectedZone);

  return (
    <div className="space-y-6">
      {/* Hidden Canvas for QR Rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Studio Toolbar & Table Navigator */}
      <div className="glass-card-dark rounded-3xl p-6 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="hud-bracket-tl"></div>
        <div className="hud-bracket-br"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold">
                Générateur de QR Codes Dynamiques par Table
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                300 DPI Vectoriel
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Studio de Personnalisation & Branding des QR Codes
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Générez instantanément des QR codes dynamiques personnalisés pour chaque table de <strong className="text-white">{restaurant.name}</strong> avec monogramme central, logo d'établissement, couleurs signature et liens sécurisés.
            </p>

            {/* Restaurant Switcher inside Generator */}
            {visibleRestaurants.length > 1 && (
              <div className="pt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Établissement sélectionné :</span>
                <select
                  value={currentRestaurantId}
                  onChange={e => {
                    setCurrentRestaurantId(e.target.value);
                    soundFX.playHoverTick();
                  }}
                  className="bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-amber-300 font-bold focus:outline-none cursor-pointer"
                >
                  {visibleRestaurants.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-950 text-white">
                      {r.establishmentType === 'hotel' ? '🏨' : '🍽️'} {r.name} ({r.city})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTestInCustomerView}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Ouvrir la vue scan client pour tester cette table"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Tester Table N°{selectedTable}</span>
            </button>

            <button
              onClick={handleDownloadSingleTablePdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              title="Télécharger le fichier PDF imprimable du chevalet A4 double-face"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Chevalet PDF (A4)</span>
            </button>

            <button
              onClick={handleDownloadAllTablesPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              title="Télécharger le pack PDF complet pour toutes les tables"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Pack PDF ({tables.length} Tables)</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="px-4 py-2.5 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Image PNG (Table {selectedTable})</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-semibold"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </motion.div>
        )}
      </div>

      {/* Main Studio Interactive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls & Table Selector */}
        <div className="lg:col-span-5 space-y-6">
          {/* Table Selector Box */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>1. Choix de la {isHotel ? 'Chambre / Suite' : 'Table'}</span>
              </div>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {tables.length} {isHotel ? 'Chambres & Suites' : 'Tables'} au total
              </span>
            </div>

            {/* Zone Filter Pill */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedZone('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedZone === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Toutes les zones
              </button>
              {zones.map(z => (
                <button
                  key={z}
                  onClick={() => setSelectedZone(z)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedZone === z
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>

            {/* Table Buttons Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {filteredTables.map(t => {
                const isSelected = selectedTable === t.number;
                return (
                  <button
                    key={t.number}
                    onClick={() => {
                      setSelectedTable(t.number);
                      soundFX.playHoverTick();
                    }}
                    className={`py-2 px-2 rounded-xl flex flex-col items-center justify-center font-mono transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/20 scale-105'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    <span className="text-xs font-black">{isHotel ? `Ch. ${t.number}` : `T${t.number}`}</span>
                    <span className={`text-[9px] ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                      {t.totalScans} scans
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Manual Custom Table/Room Number Entry */}
            <div className="p-3 bg-black/40 rounded-2xl border border-white/10 space-y-1.5">
              <label className="text-[11px] font-bold text-amber-300 block">
                Saisir un numéro spécifique (ex: {isHotel ? 'Chambre 204' : 'Table 15'}) :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={selectedTable}
                  onChange={e => {
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num) && num > 0) {
                      setSelectedTable(num);
                    }
                  }}
                  className="w-28 p-2 bg-white/10 border border-amber-500/40 rounded-xl text-amber-300 font-mono font-bold text-xs focus:ring-1 focus:ring-amber-400 outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  Génère automatiquement l'URL QR unique pour ce numéro
                </span>
              </div>
            </div>

            {/* Table Details Mini Bar */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Affectation & Zone :</span>
                <span className="text-white font-bold">Table N°{selectedTable} · {activeTableItem.zone || 'Salle'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block">Serveur référent :</span>
                <span className="text-amber-300 font-bold">{assignedWaiter?.name || 'Équipe'}</span>
              </div>
            </div>
          </div>

          {/* Format Selection Card (Modèles: Chevalet, Standard A6, Carte de Visite, Stickers) */}
          <div className="glass-card-dark rounded-3xl p-5 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>2. Format du Modèle & Support PDF</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                {formatLabels[pdfFormat].badge}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(formatLabels) as QrPdfOptions['format'][]).map(fmtKey => {
                const fmt = formatLabels[fmtKey];
                const isSelected = pdfFormat === fmtKey;
                return (
                  <button
                    key={fmtKey}
                    type="button"
                    onClick={() => {
                      setPdfFormat(fmtKey);
                      soundFX.playHoverTick();
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs flex items-center gap-1.5 text-white">
                        <span>{fmt.icon}</span>
                        <span>{fmt.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      {fmt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme & Color Customization */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>3. Thème Graphique & Palette Couleur</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(THEMES) as QrStyleTheme[]).map(key => {
                const isSelected = qrTheme === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setQrTheme(key);
                      soundFX.playHoverTick();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-white/15 text-white font-bold shadow-xs'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate">{THEMES[key].name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Pickers */}
            {qrTheme === 'custom' && (
              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Couleur du QR :</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customDarkColor}
                      onChange={e => setCustomDarkColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-xs text-white">{customDarkColor}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center Logo & Monogram Customization */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>4. Monogramme & Logo Central</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeCenterLogo}
                  onChange={e => setIncludeCenterLogo(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 bg-white/10 border-white/20"
                />
                <span className="text-slate-300 font-semibold">Activer logo</span>
              </label>
            </div>

            {includeCenterLogo && (
              <div className="space-y-3 pt-1 text-xs">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCenterLogoType('initial')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      centerLogoType === 'initial'
                        ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-base font-black font-mono">"{restaurant.name.charAt(0)}"</span>
                    <span className="text-[9px] mt-0.5">Initiale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCenterLogoType('star')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      centerLogoType === 'star'
                        ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-base font-black text-amber-400">★</span>
                    <span className="text-[9px] mt-0.5">5 Étoiles</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCenterLogoType('nfc')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      centerLogoType === 'nfc'
                        ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span className="text-[9px] mt-0.5">Puce NFC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCenterLogoType('qr')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      centerLogoType === 'qr'
                        ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    <span className="text-[9px] mt-0.5">Table N°</span>
                  </button>
                </div>
              </div>
            )}

            {/* Custom Text Inscriptions */}
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  En-tête de la carte de table :
                </label>
                <input
                  type="text"
                  value={headerTagline}
                  onChange={e => setHeaderTagline(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Appel à l'action sous le QR :
                </label>
                <input
                  type="text"
                  value={ctaBottomText}
                  onChange={e => setCtaBottomText(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={showNfcInductionTag}
                    onChange={e => setShowNfcInductionTag(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 bg-white/10 border-white/20"
                  />
                  <span>Afficher badge Sans Contact 13.56 MHz</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: High-Res Real-Time Preview & Export Options */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card-dark rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="hud-bracket-tl"></div>
            <div className="hud-bracket-br"></div>

            {/* Preview Viewport Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400">
                    Prévisualisation Vectorielle HD
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Table N°{selectedTable}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Rendu Graphique pour Impression & Présentoir
                </h3>
              </div>

              {/* View Mode Tabs */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('branded_card')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    previewTab === 'branded_card' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Chevalet Table
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('pure_qr')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    previewTab === 'pure_qr' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Image QR Pure
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('all_tables_grid')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    previewTab === 'all_tables_grid' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Toutes Tables ({tables.length})</span>
                </button>
              </div>
            </div>

            {/* Central Canvas / Image Preview Container */}
            <div className="flex items-center justify-center p-6 sm:p-10 bg-slate-950/80 rounded-3xl border border-white/10 min-h-[460px] relative">
              {isGenerating ? (
                <div className="text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">Calcul vectoriel du QR code...</p>
                </div>
              ) : previewTab === 'branded_card' ? (
                /* Luxury Physical Table Card / Standee Mockup */
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`w-full max-w-sm rounded-[32px] p-6 border-2 ${currentTheme.border} bg-linear-to-b ${currentTheme.bg} shadow-2xl shadow-amber-500/10 text-center space-y-4 relative overflow-hidden`}
                >
                  {/* Specular Ambient Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  {/* Header Tagline */}
                  <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                    {headerTagline}
                  </div>

                  {/* Restaurant Name */}
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">
                      {restaurant.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">{restaurant.address}, {restaurant.city}</p>
                  </div>

                  {/* Dynamic Table Badge */}
                  {showTableNumberBadge && (
                    <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-linear-to-r from-amber-400 to-amber-500 text-slate-950 font-black font-mono text-xs shadow-md shadow-amber-500/30">
                      <span>TABLE N° {selectedTable}</span>
                      <span className="text-[10px] text-slate-900 font-medium">({activeTableItem.zone})</span>
                    </div>
                  )}

                  {/* Branded QR Code Display */}
                  <div className="p-3 bg-white rounded-3xl inline-block shadow-2xl border-4 border-slate-950 my-1">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code Table ${selectedTable}`}
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto rounded-2xl"
                      />
                    )}
                  </div>

                  {/* Call to Action */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white leading-tight">
                      {ctaBottomText}
                    </p>
                    <div className="text-amber-400 text-xs font-bold tracking-widest">
                      ★ ★ ★ ★ ★
                    </div>
                  </div>

                  {/* NFC Dual Induction Mention */}
                  {showNfcInductionTag && (
                    <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-mono font-bold">
                      <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span>OU APPROCHEZ VOTRE SMARTPHONE (PUCE NFC)</span>
                    </div>
                  )}
                </motion.div>
              ) : previewTab === 'pure_qr' ? (
                /* Pure QR Code Image View */
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-6 bg-white rounded-3xl shadow-2xl text-center space-y-3"
                >
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code Table ${selectedTable}`}
                      className="w-64 h-64 sm:w-80 sm:h-80 object-contain mx-auto rounded-2xl"
                    />
                  )}
                  <div className="text-slate-900 font-mono font-bold text-xs">
                    {restaurant.name} · Table N°{selectedTable} · 1000 x 1000px HD
                  </div>
                </motion.div>
              ) : (
                /* All Tables Matrix Grid View */
                <div className="w-full max-h-[500px] overflow-y-auto space-y-4 pr-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
                    <span>Grille Générale des QR Codes ({tables.length} tables configurées)</span>
                    <span className="text-amber-400 font-mono">1-Clic pour tester ou exporter</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {tables.map(t => (
                      <div
                        key={t.number}
                        onClick={() => setSelectedTable(t.number)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-center space-y-2 ${
                          selectedTable === t.number
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-black text-amber-400">TABLE {t.number}</span>
                          <span className="text-[10px] text-slate-400">{t.zone}</span>
                        </div>

                        {qrDataUrl && selectedTable === t.number ? (
                          <img src={qrDataUrl} alt={`QR ${t.number}`} className="w-24 h-24 mx-auto rounded-xl bg-white p-1" />
                        ) : (
                          <div className="w-24 h-24 mx-auto rounded-xl bg-white/10 flex items-center justify-center font-mono text-xs text-slate-400">
                            Table {t.number}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 font-mono">
                          {t.totalScans} scans · Note {t.lastRating ? `${t.lastRating}★` : '5.0★'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Bar for Table QR */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="truncate max-w-xs">{tableUrl}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  title="Copier l'URL directe de la table"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Lien copié !' : 'Copier URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  title="Copier l'image du QR code dans le presse-papiers"
                >
                  {copiedImage ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <FileImage className="w-3.5 h-3.5" />}
                  <span>{copiedImage ? 'Image copiée !' : 'Copier Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
