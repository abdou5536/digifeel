import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { RegisteredNfcChip } from '../types';
import {
  Radio,
  Cpu,
  Smartphone,
  CheckCircle2,
  Users,
  QrCode,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Plus,
  Zap,
  X,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Link,
  HelpCircle,
  Edit3,
  Save,
  Layers,
  ArrowRight,
  Sliders,
  Store
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface NfcChipEnrollerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEditingChipId?: string | null;
}

export const NfcChipEnrollerModal: React.FC<NfcChipEnrollerModalProps> = ({
  isOpen,
  onClose,
  initialEditingChipId = null
}) => {
  const {
    restaurant,
    restaurants,
    waiters,
    tables,
    registeredNfcChips,
    registerNfcChip,
    updateNfcChip,
    deleteNfcChip,
    lastScannedChipAlert,
    setLastScannedChipAlert,
    triggerNfcChipScan,
    setMode,
    setSelectedWaiterId,
    setSelectedTableNumber
  } = useApp();

  const isHotel = restaurant.establishmentType === 'hotel';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Active view: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingChip, setEditingChip] = useState<RegisteredNfcChip | null>(null);

  // Form State for New / Edit Chip
  const [chipCustomName, setChipCustomName] = useState<string>('');
  const [selectedRestoId, setSelectedRestoId] = useState<string>(restaurant.id);
  const [targetType, setTargetType] = useState<'server' | 'table'>('server');
  const [selectedServerId, setSelectedServerId] = useState<string>(waiters[0]?.id || '');
  const [selectedTableNums, setSelectedTableNums] = useState<number[]>([1]);
  const [customUid, setCustomUid] = useState<string>('');

  // Scanning & Feedback State
  const [isScanningNfc, setIsScanningNfc] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [hasWebNfcSupport, setHasWebNfcSupport] = useState<boolean>(false);

  useEffect(() => {
    setHasWebNfcSupport(typeof window !== 'undefined' && 'NDEFReader' in window);
  }, []);

  useEffect(() => {
    if (initialEditingChipId) {
      const found = registeredNfcChips.find(c => c.id === initialEditingChipId);
      if (found) {
        startEditing(found);
      }
    }
  }, [initialEditingChipId, registeredNfcChips]);

  if (!isOpen) return null;

  const targetResto = restaurants.find(r => r.id === selectedRestoId) || restaurant;
  const currentServer = waiters.find(w => w.id === selectedServerId) || waiters[0];

  const generateSimulatedUid = () => {
    const bytes = Array.from({ length: 7 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
    );
    return bytes.join(':');
  };

  const getPayloadUrl = (uid: string, restoSlug: string, srvId?: string, tblNum?: number) => {
    if (targetType === 'server') {
      return `${baseUrl}/?resto=${restoSlug}&server=${srvId || currentServer?.id || 'waiter-1'}&nfc=${encodeURIComponent(uid)}`;
    }
    return `${baseUrl}/?resto=${restoSlug}&table=${tblNum || selectedTableNums[0] || 1}&nfc=${encodeURIComponent(uid)}`;
  };

  const startEditing = (chip: RegisteredNfcChip) => {
    setEditingChip(chip);
    setChipCustomName(chip.customName || chip.targetName);
    setSelectedRestoId(chip.restaurantId || restaurant.id);
    setTargetType(chip.targetType);
    setSelectedServerId(chip.assignedWaiterId || chip.targetId);
    setSelectedTableNums(chip.assignedTableNumbers || (chip.targetType === 'table' ? [parseInt(chip.targetId, 10) || 1] : [1]));
    setCustomUid(chip.uid);
    setViewMode('edit');
    soundFX.playHoverTick();
  };

  const startCreating = () => {
    setEditingChip(null);
    setChipCustomName(`Puce Porte-Clé #${registeredNfcChips.length + 1}`);
    setSelectedRestoId(restaurant.id);
    setTargetType('server');
    setSelectedServerId(waiters[0]?.id || '');
    setSelectedTableNums([1]);
    setCustomUid(generateSimulatedUid());
    setViewMode('create');
    soundFX.playHoverTick();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChip) return;

    const srv = waiters.find(w => w.id === selectedServerId);
    const targetName = targetType === 'server'
      ? `${srv?.name || 'Serveur'} (${srv?.role || 'Service'})`
      : `Table(s) ${selectedTableNums.join(', ')}`;

    const finalUrl = getPayloadUrl(editingChip.uid, targetResto.slug, srv?.id, selectedTableNums[0]);

    updateNfcChip(editingChip.id, {
      customName: chipCustomName.trim() || targetName,
      restaurantId: targetResto.id,
      restaurantName: targetResto.name,
      targetType,
      targetId: targetType === 'server' ? (srv?.id || 'waiter-1') : (selectedTableNums[0]?.toString() || '1'),
      targetName,
      assignedWaiterId: srv?.id,
      assignedTableNumbers: selectedTableNums,
      payloadUrl: finalUrl
    });

    soundFX.playSuccessChime();
    setViewMode('list');
    setScanMessage(`Puce "${chipCustomName}" modifiée et synchronisée avec succès !`);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = customUid.trim() || generateSimulatedUid();
    const srv = waiters.find(w => w.id === selectedServerId);
    const targetName = targetType === 'server'
      ? `${srv?.name || 'Serveur'} (${srv?.role || 'Service'})`
      : `Table(s) ${selectedTableNums.join(', ')}`;

    const finalUrl = getPayloadUrl(uid, targetResto.slug, srv?.id, selectedTableNums[0]);

    registerNfcChip({
      uid,
      customName: chipCustomName.trim() || targetName,
      restaurantId: targetResto.id,
      restaurantName: targetResto.name,
      targetType,
      targetId: targetType === 'server' ? (srv?.id || 'waiter-1') : (selectedTableNums[0]?.toString() || '1'),
      targetName,
      assignedWaiterId: srv?.id,
      assignedTableNumbers: selectedTableNums,
      payloadUrl: finalUrl,
      status: 'active'
    });

    soundFX.playSuccessChime();
    setViewMode('list');
    setScanMessage(`Nouvelle puce ${uid} enregistrée et assignée avec succès !`);
  };

  const handleSimulatePhysicalScan = () => {
    const randomUid = generateSimulatedUid();
    setIsScanningNfc(true);
    soundFX.playHoverTick();

    setTimeout(() => {
      setIsScanningNfc(false);
      const detected = triggerNfcChipScan(randomUid);
      soundFX.playSuccessChime();
      if (detected) {
        setScanMessage(`Puce NFC physique détectée ! UID: ${detected.uid} (${detected.customName || detected.targetName})`);
      }
    }, 600);
  };

  const toggleTableSelection = (tableNum: number) => {
    soundFX.playHoverTick();
    if (selectedTableNums.includes(tableNum)) {
      if (selectedTableNums.length > 1) {
        setSelectedTableNums(selectedTableNums.filter(n => n !== tableNum));
      }
    } else {
      setSelectedTableNums([...selectedTableNums, tableNum].sort((a, b) => a - b));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrlId(id);
    soundFX.playSuccessChime();
    setTimeout(() => setCopiedUrlId(null), 2500);
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Gestionnaire & Synchronisation NFC · Matériel Physique</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                <span>Gestionnaire des Puces NFC</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono font-bold">
                  {registeredNfcChips.length} Puces Actives
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Chaque puce a son identité : encodez le lien de l'application, scannez pour configurer, modifiez le serveur et les tables assignées.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'list' && (
                <button
                  type="button"
                  onClick={startCreating}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer une Puce</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live Scan Alert Banner */}
          {lastScannedChipAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-cyan-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-base shrink-0 animate-bounce">
                  ⚡
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                    <span>PUCE NFC DÉTECTÉE EN DIRECT !</span>
                    <span className="text-[10px] bg-cyan-400/20 px-2 py-0.2 rounded border border-cyan-400/30">
                      UID : {lastScannedChipAlert.uid}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {lastScannedChipAlert.customName || lastScannedChipAlert.targetName} · {lastScannedChipAlert.restaurantName || restaurant.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startEditing(lastScannedChipAlert)}
                  className="px-3 py-1.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier cette puce</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastScannedChipAlert(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {scanMessage && !lastScannedChipAlert && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
              <span>{scanMessage}</span>
              <button onClick={() => setScanMessage(null)} className="text-emerald-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* VIEW 1 : LIST OF REGISTERED NFC CHIPS */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Top Quick Actions Bar */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Test de Scan & Détection Physique</div>
                    <div className="text-[11px] text-slate-300">
                      {hasWebNfcSupport
                        ? 'Web NFC actif sur votre navigateur Android Chrome.'
                        : 'Simulateur physique NFC actif (compatible tout appareil).'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePhysicalScan}
                  disabled={isScanningNfc}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                >
                  <Radio className={`w-4 h-4 ${isScanningNfc ? 'animate-spin' : 'animate-pulse'}`} />
                  <span>{isScanningNfc ? 'Scan en cours...' : 'Simuler le Scan d\'une Puce'}</span>
                </button>
              </div>

              {/* Registered Chips Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Puces NFC configurées ({registeredNfcChips.length})</span>
                  <span>Cliquez sur "Modifier" pour changer l'assignation</span>
                </div>

                {registeredNfcChips.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
                    <Radio className="w-10 h-10 text-slate-500 mx-auto" />
                    <div className="text-sm font-bold text-white">Aucune puce NFC enregistrée pour le moment</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Enregistrez vos puces pour les associer à vos serveurs et tables.
                    </p>
                    <button
                      onClick={startCreating}
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter ma première puce</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {registeredNfcChips.map(chip => {
                      const isServer = chip.targetType === 'server';
                      const assignedTables = chip.assignedTableNumbers || (isServer ? [1, 2, 3] : [parseInt(chip.targetId, 10) || 1]);

                      return (
                        <div
                          key={chip.id}
                          className="p-4 rounded-2xl bg-gradient-to-br from-white/8 via-white/3 to-cyan-950/30 border border-cyan-400/20 hover:border-cyan-400/40 transition-all space-y-3 shadow-lg"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
                                isServer
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                              }`}>
                                {isServer ? '👨‍🍳' : '🪑'}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                                  <span>{chip.customName || chip.targetName}</span>
                                </h4>
                                <div className="text-[10px] font-mono text-cyan-300">
                                  UID : {chip.uid}
                                </div>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Active
                            </span>
                          </div>

                          {/* Identity Details */}
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-slate-300">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Store className="w-3 h-3 text-slate-400" />
                                Restaurant :
                              </span>
                              <span className="font-bold text-white truncate max-w-[180px]">
                                {chip.restaurantName || restaurant.name}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-300">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                Serveur assigné :
                              </span>
                              <span className="font-bold text-amber-300">
                                {chip.targetName}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-300">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-slate-400" />
                                Tables assignées :
                              </span>
                              <span className="font-mono text-cyan-300 font-bold">
                                {assignedTables.map(t => `T${t}`).join(', ')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-white/5">
                              <span>Total Scans : <strong className="text-white">{chip.totalScans || 1}</strong></span>
                              <span>{chip.encodedAt ? new Date(chip.encodedAt).toLocaleDateString() : 'Actif'}</span>
                            </div>
                          </div>

                          {/* Direct Dashboard Link for this Server */}
                          {isServer && (
                            <button
                              type="button"
                              onClick={() => {
                                if (chip.assignedWaiterId) {
                                  setSelectedWaiterId(chip.assignedWaiterId);
                                }
                                setMode('server');
                                onClose();
                                soundFX.playHoverTick();
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                            >
                              <Users className="w-3.5 h-3.5 text-amber-400" />
                              <span>Ouvrir le Dashboard de {chip.customName || chip.targetName}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(chip.payloadUrl, chip.id)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                              title="Copier l'URL encodée dans la puce NFC"
                            >
                              {copiedUrlId === chip.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedUrlId === chip.id ? 'Copié !' : 'Lien NFC'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditing(chip)}
                                className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Modifier</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteNfcChip(chip.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer"
                                title="Supprimer la puce"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2 : EDIT EXISTING CHIP */}
          {viewMode === 'edit' && editingChip && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1 cursor-pointer"
                  >
                    ← Retour à la liste
                  </button>
                  <span className="text-slate-600">/</span>
                  <span className="text-xs font-bold text-cyan-300 font-mono">
                    Modifier la Puce UID : {editingChip.uid}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nom de la puce */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Nom de la Puce NFC :
                  </label>
                  <input
                    type="text"
                    value={chipCustomName}
                    onChange={e => setChipCustomName(e.target.value)}
                    placeholder="Ex: Puce Porte-Clé #1 - David"
                    className="w-full bg-slate-950/80 border border-cyan-400/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Donnez un nom identifiable pour ne pas vous perdre.</p>
                </div>

                {/* 2. Restaurant auquel elle appartient */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Restaurant auquel elle appartient :
                  </label>
                  <select
                    value={selectedRestoId}
                    onChange={e => setSelectedRestoId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                        {r.name} ({r.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Serveur auquel elle appartient */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Serveur auquel elle appartient :
                  </label>
                  <select
                    value={selectedServerId}
                    onChange={e => setSelectedServerId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {waiters.map(w => (
                      <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                        {w.name} ({w.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Type de cible */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Type d'assignation :
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetType('server')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                        targetType === 'server'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      👨‍🍳 Serveur Physique
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType('table')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                        targetType === 'table'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      🪑 Table / Chevalet
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Tables Assignées (Sélection Multiple) */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tables Assignées à cette Puce :</span>
                  </label>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold">
                    {selectedTableNums.map(n => `T${n}`).join(', ')}
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {tables.map(t => {
                    const isSelected = selectedTableNums.includes(t.number);
                    return (
                      <button
                        key={t.number}
                        type="button"
                        onClick={() => toggleTableSelection(t.number)}
                        className={`py-2 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        T{t.number}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lien Encodé Synchronisé */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-400/30 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-0.5 truncate">
                  <div className="text-[10px] text-slate-400">Lien de l'application encodé dans la puce :</div>
                  <div className="text-cyan-300 truncate">
                    {getPayloadUrl(editingChip.uid, targetResto.slug, selectedServerId, selectedTableNums[0])}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(getPayloadUrl(editingChip.uid, targetResto.slug, selectedServerId, selectedTableNums[0]), editingChip.id)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </button>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3 : CREATE NEW CHIP */}
          {viewMode === 'create' && (
            <form onSubmit={handleSaveNew} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="text-xs text-slate-400 hover:text-white font-mono flex items-center gap-1 cursor-pointer"
                  >
                    ← Retour à la liste
                  </button>
                  <span className="text-slate-600">/</span>
                  <span className="text-xs font-bold text-cyan-300 font-mono">
                    Enregistrer & Coder une Nouvelle Puce NFC
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nom de la puce */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Nom de la Puce NFC :
                  </label>
                  <input
                    type="text"
                    value={chipCustomName}
                    onChange={e => setChipCustomName(e.target.value)}
                    placeholder="Ex: Puce Porte-Clé #3 - Serveur"
                    className="w-full bg-slate-950/80 border border-cyan-400/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    required
                  />
                </div>

                {/* 2. UID de la puce physique */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono flex items-center justify-between">
                    <span>Numéro de Série UID :</span>
                    <button
                      type="button"
                      onClick={() => setCustomUid(generateSimulatedUid())}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Générer UID aléatoire
                    </button>
                  </label>
                  <input
                    type="text"
                    value={customUid}
                    onChange={e => setCustomUid(e.target.value)}
                    placeholder="Ex: 04:A2:8B:19:64:30:80"
                    className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    required
                  />
                </div>

                {/* 3. Restaurant auquel elle appartient */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Restaurant auquel elle appartient :
                  </label>
                  <select
                    value={selectedRestoId}
                    onChange={e => setSelectedRestoId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                        {r.name} ({r.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Serveur auquel elle appartient */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Serveur auquel elle appartient :
                  </label>
                  <select
                    value={selectedServerId}
                    onChange={e => setSelectedServerId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {waiters.map(w => (
                      <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                        {w.name} ({w.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Tables Assignées */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 font-mono">
                    Tables assignées à cette puce :
                  </label>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold">
                    {selectedTableNums.map(n => `T${n}`).join(', ')}
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {tables.map(t => {
                    const isSelected = selectedTableNums.includes(t.number);
                    return (
                      <button
                        key={t.number}
                        type="button"
                        onClick={() => toggleTableSelection(t.number)}
                        className={`py-2 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        T{t.number}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lien d'encodage généré */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-400/30 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-0.5 truncate">
                  <div className="text-[10px] text-slate-400">Lien généré pour encodage dans votre puce NFC :</div>
                  <div className="text-cyan-300 truncate">
                    {getPayloadUrl(customUid.trim() || 'TAG-NEW', targetResto.slug, selectedServerId, selectedTableNums[0])}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(getPayloadUrl(customUid.trim() || 'TAG-NEW', targetResto.slug, selectedServerId, selectedTableNums[0]), 'new')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </button>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer la puce</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
