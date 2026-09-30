import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Printer,
  Download,
  Radio,
  Check,
  Copy,
  Cpu,
  Smartphone,
  ShieldCheck,
  Zap,
  ArrowRight,
  QrCode,
  Layers,
  Palette,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { BrandedQrModule } from './BrandedQrModule';
import { DynamicTableQrStudio } from './DynamicTableQrStudio';
import { soundFX } from '../utils/soundEffects';

export const QrNfcStudio: React.FC = () => {
  const {
    restaurant,
    tables,
    waiters,
    setMode,
    visibleRestaurants,
    currentRestaurantId,
    setCurrentRestaurantId
  } = useApp();

  const [activeTab, setActiveTab] = useState<'dynamic_qr' | 'pdf_templates' | 'nfc_encoding'>('dynamic_qr');
  const [selectedServerForNfc, setSelectedServerForNfc] = useState<string>(waiters[0]?.id || 'waiter-david');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const activeServer = waiters.find(w => w.id === selectedServerForNfc) || waiters[0];
  const nfcPayloadUrl = `${baseUrl}/?resto=${restaurant.slug}&server=${activeServer?.id || 'waiter-1'}`;

  const handleCopyNfcUrl = () => {
    navigator.clipboard.writeText(nfcPayloadUrl);
    setCopiedUrl(true);
    soundFX.playSuccessChime();
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-mesh-dark text-white py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Studio Navigation Bar */}
      <div className="glass-card-dark p-2 rounded-2xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto p-1 text-xs">
          <button
            onClick={() => {
              setActiveTab('dynamic_qr');
              soundFX.playHoverTick();
            }}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dynamic_qr'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Générateur de QR Code (Par Table)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pdf_templates');
              soundFX.playHoverTick();
            }}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pdf_templates'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gabarits PDF & Chevalets d'Impression</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('nfc_encoding');
              soundFX.playHoverTick();
            }}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'nfc_encoding'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Station d'Encodage NFC Serveurs</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          {visibleRestaurants.length > 1 && (
            <select
              value={currentRestaurantId}
              onChange={e => {
                setCurrentRestaurantId(e.target.value);
                soundFX.playHoverTick();
              }}
              className="bg-slate-900 border border-white/20 text-white font-bold text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              {visibleRestaurants.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-950 text-white">
                  {r.establishmentType === 'hotel' ? '🏨' : '🍽️'} {r.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setMode('manager')}
            className="px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10 cursor-pointer"
          >
            Retour Dashboard Manager
          </button>
        </div>
      </div>

      {/* Tab 1: Dynamic Custom QR Code Generator per Table with Branding */}
      {activeTab === 'dynamic_qr' && (
        <DynamicTableQrStudio embedded={false} />
      )}

      {/* Tab 2: PDF Vectorial Templates Engine */}
      {activeTab === 'pdf_templates' && (
        <BrandedQrModule embedded={false} />
      )}

      {/* Tab 3: NFC Hardware & Chip Programming */}
      {activeTab === 'nfc_encoding' && (
        <div className="glass-card-dark rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="hud-bracket-tl"></div>
          <div className="hud-bracket-br"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono tracking-widest text-cyan-400 font-bold">
                    Encodage Électronique
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                    Puces 13.56 MHz NTAG 213/215
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  Programmateur des Badges & Puces NFC Serveurs
                </h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Active Server Selector */}
            <div className="lg:col-span-5 glass-card-dark p-5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Serveur à programmer :</span>
                <select
                  value={selectedServerForNfc}
                  onChange={e => setSelectedServerForNfc(e.target.value)}
                  className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 font-bold text-white focus:outline-none cursor-pointer"
                >
                  {waiters.map(w => (
                    <option key={w.id} value={w.id} className="bg-slate-950 text-white">
                      {w.name} ({w.role}) · {w.nfcUid}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-slate-400 block">
                  URL NDEF encodée sur la puce de {activeServer?.name || 'Serveur'} :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={nfcPayloadUrl}
                    className="w-full text-xs font-mono bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-amber-300 select-all"
                  />
                  <button
                    onClick={handleCopyNfcUrl}
                    className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shrink-0 transition-colors cursor-pointer"
                    title="Copier l'URL NDEF"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  La puce NFC est encodée à vie. Dès qu'un client approche son smartphone, la page du serveur s'ouvre sans application.
                </span>
              </div>
            </div>

            {/* 3 Step Protocol */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs border border-amber-500/40">
                  1
                </div>
                <div className="font-bold text-amber-400">Ouvrez NFC Tools</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sur iPhone ou Android, téléchargez l'app gratuite NFC Tools et appuyez sur <em>Écrire / Ajouter un enregistrement / URL</em>.
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 font-black flex items-center justify-center text-xs border border-cyan-500/40">
                  2
                </div>
                <div className="font-bold text-cyan-400">Collez l'URL NDEF</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Copiez-collez l'adresse sécurisée générée ci-contre pour le serveur sélectionné.
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs border border-emerald-500/40">
                  3
                </div>
                <div className="font-bold text-emerald-400">Approchez la puce</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Touchez le badge ou sticker NFC avec le haut de votre téléphone. L'écriture prend 1 seconde !
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
