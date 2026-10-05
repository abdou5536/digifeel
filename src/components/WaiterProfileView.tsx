import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Radio, Star, Euro, Award, QrCode, Copy, Check, Sparkles, Smartphone, ArrowRight, Zap, ShieldCheck, Cpu, Waves, Camera } from 'lucide-react';
import type { Waiter } from '../types';

export const WaiterProfileView: React.FC = () => {
  const {
    restaurant,
    waiters,
    tables,
    selectedWaiterId,
    setSelectedWaiterId,
    reviews,
    setMode,
    setSelectedTableNumber,
    tipSharingConfig,
    tipDistribution
  } = useApp();

  const isHotel = restaurant.establishmentType === 'hotel';

  const currentWaiter: Waiter = waiters.find(w => w.id === selectedWaiterId) || waiters[0] || {
    id: 'waiter-default',
    restaurantId: restaurant.id,
    name: 'Serveur Principal',
    role: 'Chef de rang',
    ratingAverage: 5.0,
    totalReviews: 12,
    totalTips: 40,
    joinedDate: '2025-01-01',
    nfcUid: 'NFC-SRV-001',
    tablesAssigned: [1, 2, 3]
  };

  const waiterReviews = reviews.filter(r => r.waiterId === currentWaiter.id);
  const waiterDistribution = tipDistribution.distributions.find(d => d.waiterId === currentWaiter.id);

  const [copied, setCopied] = useState(false);
  const [nfcWritingStatus, setNfcWritingStatus] = useState<string | null>(null);
  const [isSimulatingWave, setIsSimulatingWave] = useState(false);

  const defaultTableNum = currentWaiter.tablesAssigned?.[0] || tables[0]?.number || 1;

  // Direct client link URL for this waiter
  const clientUrl = `${window.location.origin}/?resto=${restaurant.slug}&server=${currentWaiter.id}&table=${defaultTableNum}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestClientScan = (tableNum = defaultTableNum) => {
    setSelectedTableNumber(tableNum);
    setSelectedWaiterId(currentWaiter.id);
    setMode('client');
  };

  const handleTriggerWave = () => {
    setIsSimulatingWave(true);
    setTimeout(() => setIsSimulatingWave(false), 2500);
  };

  // Web NFC writing attempt
  const handleWriteNfc = async () => {
    if (!('NDEFReader' in window)) {
      setNfcWritingStatus('unsupported');
      return;
    }

    try {
      setNfcWritingStatus('writing');
      // @ts-expect-error - Web NFC API
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [{ recordType: 'url', data: clientUrl }]
      });
      setNfcWritingStatus('success');
      setTimeout(() => setNfcWritingStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setNfcWritingStatus('error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-mesh-dark text-white py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Waiter Switcher */}
      <div data-scroll-scene className="glass-card-dark rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="hud-bracket-tl"></div>
        <div className="hud-bracket-br"></div>

        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Puce Électronique Sans Contact · {restaurant.name}</span>
            <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
              NTAG213 · 13.56 MHz
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Badge NFC & Télémétrie de {currentWaiter.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {isHotel
              ? 'Chaque collaborateur de l\'hôtel dispose d\'une puce électronique individuelle encodée pour recevoir ses avis et gratifications en 1 tap.'
              : 'Chaque serveur dispose d\'une puce électronique individuelle encodée pour recevoir ses avis et pourboires en 1 tap sans monnaie.'}
          </p>
        </div>

        {/* Switch Waiter */}
        <div className="flex flex-wrap items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 self-start md:self-auto">
          <span className="text-xs font-mono text-slate-400 pl-2">
            {isHotel ? 'COLLABORATEUR :' : 'SERVEUR :'}
          </span>
          <div className="flex items-center gap-1">
            {waiters.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWaiterId(w.id)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all ${
                  w.id === currentWaiter.id
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div data-scroll-scene className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Holographic Cyber Badge */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cyber Glass NFC Card */}
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-slate-900 to-amber-950/80 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/40 glass-glow-amber group">
            <div className="hud-bracket-tl"></div>
            <div className="hud-bracket-br"></div>

            {/* Concentric Pulse Waves */}
            {isSimulatingWave && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 rounded-full border-2 border-amber-400/60 animate-radar-pulse"></div>
                <div className="w-32 h-32 rounded-full border-2 border-cyan-400/60 animate-radar-pulse-2"></div>
                <div className="w-32 h-32 rounded-full border-2 border-emerald-400/60 animate-radar-pulse-3"></div>
              </div>
            )}

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                <span className="text-[11px] font-mono tracking-widest uppercase text-amber-300 font-black">
                  {currentWaiter.nfcUid || 'NFC-2025-V1'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-mono font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <Radio className="w-4 h-4 animate-pulse text-amber-400" />
                <span>NFC LIVE</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4 relative z-10">
              {currentWaiter.avatarUrl ? (
                <img
                  src={currentWaiter.avatarUrl}
                  alt={currentWaiter.name}
                  className="w-22 h-22 rounded-2xl object-cover border-2 border-amber-400 shadow-2xl group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-22 h-22 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-3xl flex items-center justify-center border-2 border-amber-300 shadow-2xl">
                  {currentWaiter.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-xs text-amber-300 font-mono tracking-wider">{restaurant.name}</div>
                <div className="text-2xl sm:text-3xl font-black text-white text-holo">{currentWaiter.name}</div>
                <div className="text-xs text-slate-300 mt-0.5">{currentWaiter.role}</div>
                <div className="text-[11px] text-cyan-300 font-mono mt-1 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>
                    {isHotel ? 'Chambres assignées :' : 'Tables assignées :'} {currentWaiter.tablesAssigned?.map(n => isHotel ? `Ch.${n}` : `T${n}`).join(', ') || (isHotel ? '101 à 105' : '1 à 5')}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruction on badge */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
              <button
                type="button"
                onClick={handleTriggerWave}
                className="text-cyan-300 hover:text-white font-mono text-[11px] flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/20 transition-all"
              >
                <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Tester émission d'ondes NFC</span>
              </button>
              <span className="text-amber-300 font-mono font-black bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 shadow-xs">
                100% SANS CONTACT
              </span>
            </div>
          </div>

          {/* Quick testing actions */}
          <div className="glass-card-dark p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
              Actions rapides & Télémétrie
            </h3>
            
            <button
              onClick={() => handleTestClientScan(3)}
              className="w-full py-3.5 px-4 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Simuler un tap NFC de client sur mon badge</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/10"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Lien copié !' : 'Copier lien du badge'}</span>
              </button>

              <button
                onClick={() => setMode('studio')}
                className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                title="Générer QR code de table"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>QR Tables</span>
              </button>
            </div>

            {/* Hardware NFC Encodage info */}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>Spécifications de la Puce Physique</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">ISO 14443A</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Les 5 puces physiques fournies dans le pack de 100 € sont encodées par nos soins pour diriger instantanément vers votre profil serveur.
              </p>
              
              <button
                onClick={handleWriteNfc}
                className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/15"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Écrire l'URL sur une puce NFC (Web NFC)</span>
              </button>

              {nfcWritingStatus === 'unsupported' && (
                <div className="mt-2 p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-[11px]">
                  Web NFC est actif sur Android Chrome. Sur iPhone ou sans puce, utilisez l'application gratuite <strong>NFC Tools</strong> pour flasher l'URL en 5 secondes.
                </div>
              )}
              {nfcWritingStatus === 'writing' && (
                <div className="mt-2 p-2.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-xl text-[11px] animate-pulse">
                  Approchez votre puce ou badge NFC du dos du téléphone...
                </div>
              )}
              {nfcWritingStatus === 'success' && (
                <div className="mt-2 p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-[11px] font-bold">
                  ✓ Puce NFC programmée avec succès pour {currentWaiter.name} !
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Waiter's Performance & Feed */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card-dark p-5 rounded-3xl border border-white/10 shadow-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Note Moyenne</span>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div className="text-3xl font-black text-white tabular-nums font-mono">
                {currentWaiter.ratingAverage.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-bold">
                ★ 98% de satisfaction
              </div>
            </div>

            <div className="glass-card-dark p-5 rounded-3xl border border-white/10 shadow-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Avis Reçus</span>
                <Award className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-black text-white tabular-nums font-mono">
                {currentWaiter.totalReviews}
              </div>
              <div className="text-[11px] text-slate-400">
                via scan de table & NFC
              </div>
            </div>

            <div className="glass-card-dark p-5 rounded-3xl border border-white/10 shadow-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Pourboires Récoltés</span>
                <Euro className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 tabular-nums font-mono">
                {currentWaiter.totalTips} €
              </div>
              {waiterDistribution && tipSharingConfig.method !== 'individual' ? (
                <div className="text-[10px] text-amber-300 font-bold flex items-center justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-400">Quote-part redistribuée :</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {waiterDistribution.finalCalculatedPayout.toFixed(2)} €
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-300 font-bold">
                  100% direct serveur
                </div>
              )}
            </div>
          </div>

          {/* Customer Reviews Feed */}
          <div className="glass-card-dark rounded-3xl border border-white/10 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Derniers avis clients pour {currentWaiter.name}</h3>
                <p className="text-xs text-slate-400">Retours en direct enregistrés après le repas</p>
              </div>
              <span className="text-xs font-bold font-mono text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                {waiterReviews.length} avis
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {waiterReviews.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucun avis pour le moment pour ce serveur. Testez une évaluation depuis la vue client !
                </div>
              ) : (
                waiterReviews.map(r => (
                  <div key={r.id} className="p-5 space-y-2 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-white">Table {r.tableNumber}</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {r.tipAmount > 0 && (
                        <div className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                          + {r.tipAmount} € de pourboire
                        </div>
                      )}
                    </div>

                    {r.comment && (
                      <p className="text-xs text-slate-300 italic bg-white/5 p-2.5 rounded-xl border border-white/10">
                        "{r.comment}"
                      </p>
                    )}

                    {/* Customer Photo */}
                    {r.photoUrl && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-1.5 pr-3 w-fit">
                        <img
                          src={r.photoUrl}
                          alt="Photo plat"
                          className="w-10 h-10 rounded-lg object-cover border border-amber-500/40"
                        />
                        <div className="text-[10px]">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-amber-400" />
                            Photo du plat
                          </span>
                          <span className="text-slate-400">Prise par le client</span>
                        </div>
                      </div>
                    )}

                    {r.compliments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {r.compliments.map(c => (
                          <span
                            key={c}
                            className="text-[10px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-lg"
                          >
                            ✓ {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
