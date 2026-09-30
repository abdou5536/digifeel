import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  Store,
  MapPin,
  Star,
  Globe,
  QrCode,
  Printer,
  Sparkles,
  Check,
  X,
  ExternalLink,
  Layers,
  ShieldCheck,
  Radio,
  Sliders,
  Copy
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';
import { generateRestaurantPdf } from '../utils/pdfGenerator';

interface DemoRestaurantSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoRestaurantSetupModal: React.FC<DemoRestaurantSetupModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    restaurant,
    updateRestaurant,
    tables,
    registeredNfcChips,
    displayCurrency
  } = useApp();

  // Form State - start with current values or empty if user wishes
  const [appName, setAppName] = useState<string>(restaurant?.name || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>(restaurant?.googleMapsUrl || '');
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>(restaurant?.googleReviewUrl || '');
  const [googlePlaceId, setGooglePlaceId] = useState<string>(restaurant?.googlePlaceId || '');
  const [tableCount, setTableCount] = useState<number>(restaurant?.tableCount || 12);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // QR Code Preview State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [selectedTableForQr, setSelectedTableForQr] = useState<number | 'direct_google'>('direct_google');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (restaurant) {
      setAppName(restaurant.name);
      setGoogleMapsUrl(restaurant.googleMapsUrl || '');
      setGoogleReviewUrl(restaurant.googleReviewUrl || '');
      setGooglePlaceId(restaurant.googlePlaceId || '');
      setTableCount(restaurant.tableCount || 12);
    }
  }, [restaurant]);

  // Generate dynamic QR Code for preview
  useEffect(() => {
    const targetUrl = selectedTableForQr === 'direct_google'
      ? (googleReviewUrl || `https://maps.google.com/?q=${encodeURIComponent(appName || 'Restaurant')}`)
      : `${baseUrl}/?resto=${restaurant.slug}&table=${selectedTableForQr}`;

    QRCode.toDataURL(targetUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#030712',
        light: '#ffffff'
      }
    }).then(url => setQrCodeDataUrl(url)).catch(console.error);
  }, [selectedTableForQr, googleReviewUrl, appName, restaurant.slug, baseUrl]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRestaurant({
      name: appName.trim() || 'Mon Restaurant',
      googleMapsUrl: googleMapsUrl.trim(),
      googleReviewUrl: googleReviewUrl.trim() || `https://maps.google.com/?q=${encodeURIComponent(appName || 'Restaurant')}`,
      googlePlaceId: googlePlaceId.trim(),
      tableCount: Number(tableCount) || 12
    });

    soundFX.playSuccessChime();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePrintTableQrs = async () => {
    setIsGeneratingPdf(true);
    soundFX.playHoverTick();
    try {
      await generateRestaurantPdf(
        restaurant,
        tables,
        tables.map(t => t.number),
        {
          theme: 'cyber_dark',
          format: 'a4_tent',
          customTitle: 'VOTRE AVIS COMPTE POUR NOTRE ÉQUIPE',
          ctaText: 'Scannez le QR Code pour évaluer & laisser votre avis Google',
          showNfcMention: true,
          showGoogleLogo: true
        }
      );
      soundFX.playSuccessChime();
    } catch (err) {
      console.error('PDF error:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyReviewLink = () => {
    const link = googleReviewUrl || `https://maps.google.com/?q=${encodeURIComponent(appName || 'Restaurant')}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    soundFX.playSuccessChime();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-auto flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020408]/85 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl bg-gradient-to-b from-[#0c1836]/95 via-[#071026]/98 to-[#030712] border border-cyan-400/30 rounded-3xl p-6 sm:p-8 text-white shadow-[0_25px_80px_rgba(0,240,255,0.18)] my-6 overflow-hidden space-y-6 max-h-[92vh] overflow-y-auto"
        >
          {/* Top Liquid Mirror Shimmer Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-400 animate-mirror-sweep" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] tracking-normal">
                  DÉMO
                </span>
                <span>Configuration Établissement & Google Reviews</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                <span>Personnalisation & Intégration Google</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Saisissez les informations réelles de votre restaurant, votre fiche Google Maps et votre lien direct Google Avis.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Informations synchronisées avec succès sur l'ensemble de l'application !</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form: Informations Restaurant & Google (7 cols) */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
                <div className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-cyan-400" />
                  <span>1. Nom de votre Application / Restaurant</span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">
                    Nom visible par les clients lors du scan :
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    placeholder="Ex: Le Bistrot Gourmand, La Table d'Or..."
                    className="w-full bg-slate-950/80 border border-cyan-400/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* Google Integration Block */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent border border-amber-500/30 space-y-3.5">
                <div className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>2. Vos Liens & Fiches Google</span>
                </div>

                {/* Google Review Direct Link */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                    <span>Lien direct Google Avis (Redirection 5 Étoiles) :</span>
                    <span className="text-[10px] text-amber-300 font-mono">Crucial</span>
                  </label>
                  <input
                    type="url"
                    value={googleReviewUrl}
                    onChange={e => setGoogleReviewUrl(e.target.value)}
                    placeholder="Ex: https://g.page/r/votreresto/review ou https://maps.app.goo.gl/..."
                    className="w-full bg-slate-950/80 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    C'est l'URL qui s'ouvrira quand le client clique sur "Publier sur Google Avis".
                  </p>
                </div>

                {/* Google Maps Page */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-200">
                    Lien de votre Fiche Google Maps :
                  </label>
                  <input
                    type="url"
                    value={googleMapsUrl}
                    onChange={e => setGoogleMapsUrl(e.target.value)}
                    placeholder="Ex: https://maps.google.com/?cid=123456789 ou https://goo.gl/maps/..."
                    className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                {/* Google Place ID */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                    <span>Google Place ID (Optionnel) :</span>
                    <span className="text-[10px] text-slate-400 font-mono">ChId...</span>
                  </label>
                  <input
                    type="text"
                    value={googlePlaceId}
                    onChange={e => setGooglePlaceId(e.target.value)}
                    placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83frY4"
                    className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>

              {/* Table Count */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white font-mono">Nombre de Tables en Salle & Terrasse :</div>
                  <div className="text-[11px] text-slate-400">Génère automatiquement la liste des QR Codes de table.</div>
                </div>

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tableCount}
                  onChange={e => setTableCount(parseInt(e.target.value, 10) || 1)}
                  className="w-20 bg-slate-950/80 border border-cyan-400/40 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer & Synchroniser l'Application</span>
              </button>
            </form>

            {/* Right Column: QR Code Studio & Print Ready for Tables (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-white/10 to-cyan-950/40 border border-cyan-400/30 text-center space-y-4 shadow-xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    QR CODE AVIS & TABLES
                  </span>
                  <span className="text-slate-400">Prêt à Imprimer</span>
                </div>

                {/* Target Selector: Direct Google vs Table Specific */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedTableForQr('direct_google')}
                    className={`py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTableForQr === 'direct_google'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    ⭐ Avis Google Direct
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTableForQr(1)}
                    className={`py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTableForQr !== 'direct_google'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    🪑 Par Table (T1..T{tableCount})
                  </button>
                </div>

                {/* QR Code Graphic Frame */}
                <div className="p-4 bg-white rounded-2xl shadow-2xl inline-block mx-auto border-4 border-slate-950">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code Avis Google"
                      className="w-44 h-44 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-44 h-44 bg-slate-100 flex items-center justify-center text-slate-400 font-mono text-xs">
                      Génération du QR...
                    </div>
                  )}

                  <div className="pt-2 text-[10px] font-black text-slate-950 font-mono uppercase tracking-tight">
                    {selectedTableForQr === 'direct_google' ? '⭐ AVIS GOOGLE DIRECT' : `TABLE N°${selectedTableForQr}`}
                  </div>
                </div>

                {/* Quick copy & test actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyReviewLink}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Lien Copié !' : 'Copier le lien'}</span>
                    </button>

                    <a
                      href={googleReviewUrl || `https://maps.google.com/?q=${encodeURIComponent(appName || 'Restaurant')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono flex items-center gap-1"
                    >
                      <span>Tester Google</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Print All Tables PDF Button */}
                  <button
                    type="button"
                    onClick={handlePrintTableQrs}
                    disabled={isGeneratingPdf}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isGeneratingPdf ? 'Génération du PDF...' : 'Imprimer les QR Codes pour les Tables (PDF)'}</span>
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Génère la planche A4 pliable avec tous les QR codes de tables prêts à découper.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
