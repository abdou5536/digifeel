import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Star,
  Award,
  TrendingUp,
  Users,
  DollarSign,
  Filter,
  Plus,
  Settings,
  QrCode,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  MapPin,
  Truck,
  MessageCircle,
  Copy,
  Radio,
  Mail,
  Key,
  Crown,
  Printer,
  Download,
  FileText,
  Sparkles,
  Layers,
  Palette,
  RefreshCw,
  Eye,
  HelpCircle,
  FileSpreadsheet,
  Camera,
  ArrowRightLeft,
  Bell,
  History,
  Compass,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { getUnlockedTier, getNextTier, getTierProgress } from '../utils/tierUtils';
import { StarTier } from '../types';
import { ManagerExportModal } from './ManagerExportModal';
import { ManagerNotificationToast } from './ManagerNotificationToast';
import { ManagerNotificationDrawer } from './ManagerNotificationDrawer';
import { RestaurantOwnerTutorialModal } from './RestaurantOwnerTutorialModal';
import { NfcChipEnrollerModal } from './NfcChipEnrollerModal';
import { DemoRestaurantSetupModal } from './DemoRestaurantSetupModal';
import { formatCurrency, getCurrencyInfo } from '../utils/currencyUtils';
import { MIRROR_THEMES } from '../utils/mirrorThemeUtils';
import { soundFX } from '../utils/soundEffects';
import { ensureQrScanLinksForTables } from '../utils/scanTargetLinks';
import LiveManagerWorkspace from './LiveManagerWorkspace';

const BrandedQrModule = lazy(() => import('./BrandedQrModule').then(module => ({ default: module.BrandedQrModule })));
const DynamicTableQrStudio = lazy(() => import('./DynamicTableQrStudio').then(module => ({ default: module.DynamicTableQrStudio })));
const ManagerFaqManager = lazy(() => import('./ManagerFaqManager').then(module => ({ default: module.ManagerFaqManager })));
const ManagerAnalyticsD3 = lazy(() => import('./ManagerAnalyticsD3').then(module => ({ default: module.ManagerAnalyticsD3 })));
const ManagerLiveStatsRecharts = lazy(() => import('./ManagerLiveStatsRecharts').then(module => ({ default: module.ManagerLiveStatsRecharts })));
const ManagerTipSharingConfig = lazy(() => import('./ManagerTipSharingConfig').then(module => ({ default: module.ManagerTipSharingConfig })));
const ManagerTransactionHistory = lazy(() => import('./ManagerTransactionHistory').then(module => ({ default: module.ManagerTransactionHistory })));
const ScanTargetManager = lazy(() => import('./ScanTargetManager').then(module => ({ default: module.ScanTargetManager })));

export const ManagerDashboard: React.FC = () => {
  const {
    restaurant,
    isDemoMode,
    updateRestaurant,
    updateRestaurantGoogleUrl,
    waiters,
    addWaiter,
    reviews,
    tables,
    addReview,
    setMode,
    setSelectedWaiterId,
    setSelectedTableNumber,
    sendOnboardingEmail,
    setActiveEmailModal,
    emailLogs,
    faqItems,
    currentRestaurantId,
    setCurrentRestaurantId,
    visibleRestaurants,
    managerNotifications,
    displayCurrency,
    registeredNfcChips,
    currentMirrorTheme,
    isSpecularMirrorActive,
    setIsMirrorModalOpen
  } = useApp();

  const isHotel = restaurant.establishmentType === 'hotel';
  const activeMirrorConfig = MIRROR_THEMES[currentMirrorTheme] || MIRROR_THEMES.amber_gold;

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'live_stats' | 'tip_sharing' | 'analytics' | 'qr_studio' | 'tiers' | 'staff' | 'onboarding' | 'faq'>('overview');
  const tabNavigationRef = useRef<HTMLDivElement>(null);
  const hasSelectedTab = useRef(false);
  const [filterServer, setFilterServer] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddWaiterOpen, setIsAddWaiterOpen] = useState<boolean>(false);
  const [isEditRestoOpen, setIsEditRestoOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isNfcEnrollerOpen, setIsNfcEnrollerOpen] = useState<boolean>(false);
  const [isDemoSetupOpen, setIsDemoSetupOpen] = useState<boolean>(false);
  const [isGeneratingQuickPdf, setIsGeneratingQuickPdf] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('digifeel_tutorial_seen') !== 'true';
    } catch {
      return false;
    }
  });
  const [isDidacticielBannerDismissed, setIsDidacticielBannerDismissed] = useState<boolean>(false);

  const unreadCount = managerNotifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!hasSelectedTab.current) {
      hasSelectedTab.current = true;
      return;
    }

    window.requestAnimationFrame(() => {
      tabNavigationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeTab]);

  // Live scan simulation helper for Recharts component
  const handleSimulateLiveScan = () => {
    if (waiters.length === 0) return;
    const randomWaiter = waiters[Math.floor(Math.random() * waiters.length)];
    const randomTable = randomWaiter.tablesAssigned && randomWaiter.tablesAssigned.length > 0
      ? randomWaiter.tablesAssigned[Math.floor(Math.random() * randomWaiter.tablesAssigned.length)]
      : Math.floor(Math.random() * 12) + 1;
    const tipOptions = [2, 3, 4.5, 5, 6, 8, 10];
    const randomTip = tipOptions[Math.floor(Math.random() * tipOptions.length)];
    const complimentsList = ['Service rapide', 'Souriant & Chaleureux', 'Très bons conseils', 'Ambiance parfaite'];

    addReview({
      restaurantId: restaurant.id,
      waiterId: randomWaiter.id,
      waiterName: randomWaiter.name,
      tableNumber: randomTable,
      rating: 5,
      compliments: [complimentsList[Math.floor(Math.random() * complimentsList.length)]],
      comment: 'Scan NFC instantané en direct ! Super service.',
      tipAmount: randomTip,
      googleReviewClicked: true
    });
  };

  // Simulation state for star progression
  const [simulatedRating, setSimulatedRating] = useState<number | null>(null);

  // New waiter form state
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newWaiterRole, setNewWaiterRole] = useState('Serveur');
  const [newWaiterTables, setNewWaiterTables] = useState('1, 2, 3');

  // Edit resto form state
  const [editName, setEditName] = useState(restaurant.name);
  const [editAddress, setEditAddress] = useState(restaurant.address);
  const [editCity, setEditCity] = useState(restaurant.city);
  const [editGoogleUrl, setEditGoogleUrl] = useState(restaurant.googleReviewUrl);

  // Tier pricing state for edit
  const tier1 = restaurant.starTiers?.find(t => t.stars === 1);
  const tier2 = restaurant.starTiers?.find(t => t.stars === 2);
  const tier3 = restaurant.starTiers?.find(t => t.stars === 3);
  const tier35 = restaurant.starTiers?.find(t => t.stars === 3.5);
  const tier4 = restaurant.starTiers?.find(t => t.stars === 4);
  const tier5 = restaurant.starTiers?.find(t => t.stars === 5);

  const [t1Price, setT1Price] = useState(tier1?.servicePrice ?? 100);
  const [t2Price, setT2Price] = useState(tier2?.servicePrice ?? 200);
  const [t3Price, setT3Price] = useState(tier3?.servicePrice ?? 300);
  const [t35Price, setT35Price] = useState(tier35?.servicePrice ?? 350);
  const [t4Price, setT4Price] = useState(tier4?.servicePrice ?? 400);
  const [t5Price, setT5Price] = useState(tier5?.servicePrice ?? 500);

  const [baselineRating, setBaselineRating] = useState(restaurant.baselineRating ?? 2.0);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Metrics calculations
  const totalReviewsCount = reviews.length;
  const avgRating = totalReviewsCount > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1)
    : '5.0';
  const totalTipsSum = reviews.reduce((acc, r) => acc + r.tipAmount, 0);
  const totalGoogleBoosterClicks = reviews.filter(r => r.googleReviewClicked).length;

  const currentRatingNum = parseFloat(avgRating);
  const effectiveRating = simulatedRating !== null ? simulatedRating : currentRatingNum;
  const activeTier = getUnlockedTier(effectiveRating, restaurant.starTiers || []);
  const nextTier = getNextTier(effectiveRating, restaurant.starTiers || []);
  const tierProgress = getTierProgress(effectiveRating, activeTier, nextTier);

  const ratingGain = (effectiveRating - (restaurant.baselineRating || 2.0)).toFixed(1);

  const restaurantEmails = emailLogs.filter(e => e.restaurantId === restaurant.id || e.slug === restaurant.slug);

  const handleCopyCredentials = () => {
    const text = `Identifiants Restaurant ${restaurant.name} :\nIdentifiant : ${restaurant.username || restaurant.slug}\nCode PIN : ${restaurant.accessPin || '2025'}\nLien direct : ${window.location.origin}/?resto=${restaurant.slug}&view=manager`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  const handleViewWelcomeEmail = () => {
    const email = sendOnboardingEmail(restaurant);
    setActiveEmailModal(email);
  };

  // Filter reviews
  const filteredReviews = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const rating = filterRating === 'all' ? null : Number.parseInt(filterRating, 10);

    return reviews.filter(review => {
      if (filterServer !== 'all' && review.waiterId !== filterServer) return false;
      if (rating !== null && review.rating !== rating) return false;
      if (!query) return true;
      return review.comment?.toLowerCase().includes(query) ||
        review.waiterName.toLowerCase().includes(query) ||
        `table ${review.tableNumber}`.includes(query);
    });
  }, [reviews, filterServer, filterRating, searchTerm]);

  const handleCreateWaiter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWaiterName.trim()) return;
    const tableNums = newWaiterTables
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));
    addWaiter(newWaiterName.trim(), newWaiterRole, tableNums.length > 0 ? tableNums : [1, 2]);
    setNewWaiterName('');
    setIsAddWaiterOpen(false);
  };

  const handleSaveResto = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTiers: StarTier[] = (restaurant.starTiers || []).map(tier => {
      if (tier.stars === 1) return { ...tier, servicePrice: Number(t1Price) };
      if (tier.stars === 2) return { ...tier, servicePrice: Number(t2Price) };
      if (tier.stars === 3) return { ...tier, servicePrice: Number(t3Price) };
      if (tier.stars === 3.5) return { ...tier, servicePrice: Number(t35Price) };
      if (tier.stars === 4) return { ...tier, servicePrice: Number(t4Price) };
      if (tier.stars === 5) return { ...tier, servicePrice: Number(t5Price) };
      return tier;
    });

    updateRestaurant({
      name: editName,
      address: editAddress,
      city: editCity,
      googleReviewUrl: editGoogleUrl,
      baselineRating: Number(baselineRating),
      starTiers: updatedTiers
    });
    setIsEditRestoOpen(false);
  };

  const handleQuickDownloadPdf = async () => {
    setIsGeneratingQuickPdf(true);
    try {
      const { generateRestaurantPdf } = await import('../utils/pdfGenerator');
      const tableUrls = isDemoMode
        ? undefined
        : await ensureQrScanLinksForTables(restaurant, tables, tables.map(table => table.number));
      await generateRestaurantPdf(restaurant, tables, tables.map(t => t.number), {
        format: 'a4_tent',
        theme: 'gold_luxury',
        showNfcMention: true,
        tableUrls
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingQuickPdf(false);
    }
  };

  if (!isDemoMode) return <LiveManagerWorkspace />;

  return (
    <div className="manager-dashboard min-h-[calc(100vh-4rem)] bg-mesh-dark text-white py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div data-scroll-scene className="glass-card-dark rounded-3xl p-6 sm:p-7 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isHotel ? 'Tableau de Bord Privé Hôtel 5★ & Palace' : 'Tableau de Bord Privé Restaurant'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            {restaurant.name} · Suivi Qualité & Pourboires
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {isHotel
              ? 'Données en temps réel transmises par les puces NFC du personnel et les chevalets connectés des chambres & suites.'
              : 'Données en temps réel transmises par les 5 puces NFC de vos serveurs et les QR codes de table.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Notification Bell Center */}
          <button
            onClick={() => {
              setIsNotificationDrawerOpen(true);
              soundFX.playHoverTick();
            }}
            className="relative px-3.5 py-2 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Ouvrir le centre de notifications pourboires & avis"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Alertes Live</span>
            {unreadCount > 0 ? (
              <span className="ml-1 bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono animate-pulse">
                {unreadCount}
              </span>
            ) : (
              <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            )}
          </button>

          {/* Quick Fast Switcher Button between Restaurant and Hotel */}
          {!isDemoMode && visibleRestaurants.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const target = isHotel
                  ? visibleRestaurants.find(r => r.establishmentType !== 'hotel') || visibleRestaurants[0]
                  : visibleRestaurants.find(r => r.establishmentType === 'hotel') || visibleRestaurants[0];
                if (target) {
                  setCurrentRestaurantId(target.id);
                  soundFX.playSuccessChime();
                }
              }}
              className="px-3.5 py-2 text-xs font-black rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-sm active:scale-95"
              title={isHotel ? "Basculer immédiatement sur le compte Restaurant" : "Basculer immédiatement sur le compte Hôtel 5★"}
            >
              <span>{isHotel ? '🍽️ Vers Compte Restaurant' : '🏨 Vers Compte Hôtel 5★'}</span>
            </button>
          )}

          {/* Restaurant Owner Didacticiel Button */}
          <button
            onClick={() => {
              setIsTutorialModalOpen(true);
              soundFX.playHoverTick();
            }}
            className="px-3.5 py-2 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Ouvrir le guide didacticiel pas à pas pour votre établissement"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Didacticiel Resto</span>
          </button>

          {/* Demo & Google Integration Setup Button */}
          <button
            onClick={() => {
              setIsDemoSetupOpen(true);
              soundFX.playHoverTick();
            }}
            className="px-3.5 py-2 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Saisir vos informations démo, votre fiche Google Maps, votre lien Google Avis et générer les QR codes de tables"
          >
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded text-[10px]">DÉMO</span>
            <span>Google & QR Tables</span>
          </button>

          {/* Accounting Export Button */}
          <button
            onClick={() => {
              setIsNfcEnrollerOpen(true);
              soundFX.playHoverTick();
            }}
            className="px-3.5 py-2 text-xs font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Prendre votre téléphone pour scanner et enregistrer les puces NFC physiques du restaurant"
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Scanner mes Puces NFC</span>
            <span className="bg-cyan-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-md font-black">
              {registeredNfcChips.length}
            </span>
          </button>

          <button
            onClick={() => {
              setIsExportModalOpen(true);
              soundFX.playHoverTick();
            }}
            className="px-3.5 py-2 text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Exporter les statistiques et pourboires au format CSV ou PDF pour la comptabilité"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Comptable (CSV / PDF)</span>
          </button>

          <button
            onClick={() => setActiveTab('qr_studio')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qr_studio'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{isHotel ? 'Studio QR & Chambres' : 'Studio QR & PDF Tables'}</span>
          </button>

          <button
            onClick={() => setIsEditRestoOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </button>

          {/* Effet Miroir Pro Button */}
          <button
            onClick={() => {
              setIsMirrorModalOpen(true);
              soundFX.playHoverTick();
            }}
            className="px-3.5 py-2 text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 animate-mirror-sweep"
            title={`Changer l'effet miroir (${activeMirrorConfig.name}) - Métamorphose tout le site`}
          >
            <Palette className="w-4 h-4" />
            <span>Effet Miroir</span>
          </button>

          <button
            onClick={() => setIsAddWaiterOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isHotel ? 'Nouveau Collaborateur NFC' : 'Nouveau Serveur NFC'}</span>
          </button>
        </div>
      </div>

      {/* RESTAURANT OWNER DIDACTICIEL BANNER (Glass Form Pro) */}
      {!isDidacticielBannerDismissed && (
        <div data-scroll-scene className="relative rounded-3xl p-5 sm:p-6 bg-[#0b0f19]/90 backdrop-blur-xl border border-amber-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Didacticiel Établissement · Prise en Main Accompagnée</span>
                <span className="hidden sm:inline text-slate-500">·</span>
                <span className="hidden sm:inline text-slate-400 font-normal">Mise en service en 4 étapes</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Guide de Démarrage & Mise en Service de {restaurant.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Découvrez comment vos puces NFC génèrent +40% de pourboires sans monnaie, comment vos QR codes bloquent les avis négatifs en interne, et comment exporter vos justificatifs comptables en 1 clic.
              </p>

              {/* 4 Steps Checklist Pill Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                  <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span className="truncate text-[11px] font-medium">Puces & QR Tables</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                  <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span className="truncate text-[11px] font-medium">Serveurs & Pourboires</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                  <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                  <span className="truncate text-[11px] font-medium">Filtre Avis Google 5★</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                  <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">4</span>
                  <span className="truncate text-[11px] font-medium">Export Comptabilité</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap lg:flex-col items-stretch gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsTutorialModalOpen(true);
                  soundFX.playHoverTick();
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Compass className="w-4 h-4" />
                <span>Ouvrir le Didacticiel (2 min)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTableNumber(4);
                  if (waiters.length > 0) setSelectedWaiterId(waiters[0].id);
                  setMode('client');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Tester le Scan Client (Table 4)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDidacticielBannerDismissed(true)}
                className="text-[11px] text-slate-500 hover:text-slate-400 text-center py-1 transition-colors cursor-pointer"
              >
                Masquer la bannière
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation Bar (Simplified into 4 Core Tabs + Live Stats) */}
      <div ref={tabNavigationRef} data-scroll-scene className="manager-tabs flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Avis & Activité</span>
          </button>

          {/* Chronological Transaction History Tab */}
          <button
            onClick={() => {
              setActiveTab('transactions');
              soundFX.playHoverTick();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
            title="Consulter le journal chronologique inaltérable de tous les pourboires versés en salle"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Historique Transactions</span>
            <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-md font-black">
              {reviews.length}
            </span>
          </button>

          {/* Live Stats Recharts Tab */}
          <button
            onClick={() => {
              setActiveTab('live_stats');
              soundFX.playHoverTick();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'live_stats'
                ? 'bg-linear-to-r from-emerald-500 to-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
            title="Visualisation Recharts des pics d'affluence et des flux de pourboires en temps réel"
          >
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span>Live Stats (Recharts)</span>
          </button>

          {/* Automated Tip Sharing Tab */}
          <button
            onClick={() => {
              setActiveTab('tip_sharing');
              soundFX.playHoverTick();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'tip_sharing'
                ? 'bg-linear-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
            title="Règles de partage de pourboires automatiques (temps de service, volume clients par table, hybride)"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Partage Pourboires</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Équipe ({waiters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qr_studio')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'qr_studio'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Codes & PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQ Clients</span>
            <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-md font-black">
              {faqItems.length}
            </span>
          </button>
        </div>

        {/* Secondary Views (Analytics D3 & Onboarding) */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-cyan-300 bg-white/5 hover:bg-white/10'
            }`}
            title="Afficher les graphiques avancés D3.js"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>D3.js</span>
          </button>

          <button
            onClick={() => setActiveTab('onboarding')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'onboarding'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-amber-300 bg-white/5 hover:bg-white/10'
            }`}
            title="Consulter les emails d'onboarding"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Emails</span>
          </button>
        </div>
      </div>

      {/* RENDER CHRONOLOGICAL TRANSACTION HISTORY TAB */}
      {activeTab === 'transactions' && (
        <div data-scroll-scene>
          <Suspense fallback={<div className="min-h-80" role="status">Chargement de l’historique…</div>}>
            <ManagerTransactionHistory />
          </Suspense>
        </div>
      )}

      {/* RENDER RECHARTS LIVE STATS TAB */}
      {activeTab === 'live_stats' && (
        <div data-scroll-scene>
          <Suspense fallback={<div className="min-h-80" role="status">Chargement des statistiques…</div>}>
            <ManagerLiveStatsRecharts
              restaurant={restaurant}
              reviews={reviews}
              waiters={waiters}
              onSimulateLiveScan={handleSimulateLiveScan}
            />
          </Suspense>
        </div>
      )}

      {/* RENDER TIP SHARING TAB */}
      {activeTab === 'tip_sharing' && (
        <div data-scroll-scene>
          <Suspense fallback={<div className="min-h-80" role="status">Chargement du partage…</div>}>
            <ManagerTipSharingConfig />
          </Suspense>
        </div>
      )}

      {/* RENDER D3 ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div data-scroll-scene>
          <Suspense fallback={<div className="min-h-80" role="status">Chargement des analyses…</div>}>
            <ManagerAnalyticsD3
              restaurant={restaurant}
              reviews={reviews}
              waiters={waiters}
            />
          </Suspense>
        </div>
      )}

      {/* RENDER QR STUDIO TAB */}
      {activeTab === 'qr_studio' && (
        <div data-scroll-scene>
          <Suspense fallback={<div className="min-h-80" role="status">Chargement du studio QR…</div>}>
            <BrandedQrModule embedded={true} />
          </Suspense>
        </div>
      )}

      {/* RENDER OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Dedicated NFC Chips & Google Reviews Management Card */}
          <div data-scroll-scene className="glass-card-noir rounded-3xl p-5 sm:p-6 border border-cyan-500/30 shadow-2xl bg-linear-to-r from-cyan-950/40 via-slate-900/80 to-amber-950/30 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-mono font-bold text-cyan-400">
                      Écosystème Puces NFC & Redirection Google Avis
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                      {registeredNfcChips.length} puces actives
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    Enregistrement de vos Puces NFC & Fiche Google Maps
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Scannez chaque puce NFC avec votre propre téléphone pour l'enregistrer dans l'application. Quand le client scanne la puce en salle, il note le travail du serveur, puis reçoit directement le lien vers votre fiche Google Avis !
                  </p>
                </div>
              </div>

              {/* Quick Actions for NFC & Google */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsNfcEnrollerOpen(true);
                    soundFX.playHoverTick();
                  }}
                  className="px-4 py-2.5 bg-linear-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>📲 Scanner une Puce avec mon Téléphone</span>
                </button>

                <a
                  href={restaurant.googleReviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center gap-2"
                  title="Vérifier la fiche Google Maps enregistrée"
                >
                  <span>Tester le Lien Google Avis</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
              </div>
            </div>

            {/* Current Google Review URL & Flow Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Fiche Google Avis Enregistrée :</span>
                  <span className="font-mono text-amber-300 text-xs truncate block font-bold mt-0.5">
                    {restaurant.googleReviewUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditRestoOpen(true)}
                  className="text-[11px] text-slate-300 hover:text-white bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 shrink-0 cursor-pointer"
                >
                  Modifier
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Parcours Client Automatique :</span>
                  <span className="text-emerald-400 text-xs font-bold block mt-0.5">
                    Scan NFC → Note Serveur → Redirection Google (100% Connecté)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableNumber(4);
                    if (waiters.length > 0) setSelectedWaiterId(waiters[0].id);
                    setMode('client');
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/30 shrink-0 font-bold cursor-pointer"
                >
                  Simuler Scan Client
                </button>
              </div>
            </div>
          </div>

          {/* Quick-Access Branded QR & Printable PDF Banner */}
          <div className="glass-card-dark rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-xl bg-linear-to-r from-amber-500/10 via-slate-900/60 to-cyan-500/10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono font-bold text-amber-400">
                    Gabarits d'Impression pour Restaurant
                  </span>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    300 DPI Haute Définition
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Chevalets de Table & QR Codes Personnalisés
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Générez instantanément le PDF prêt pour impression (chevalets A4 pliables, standees A6 en plexiglas, stickers ou planches multi-tables) pour toutes les tables de {restaurant.name}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
              <button
                onClick={handleQuickDownloadPdf}
                disabled={isGeneratingQuickPdf}
                className="px-4 py-2.5 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingQuickPdf ? 'Génération...' : 'Télécharger PDF Chevalets A4 (Toutes Tables)'}</span>
              </button>

              <button
                onClick={() => setActiveTab('qr_studio')}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-colors flex items-center gap-1.5"
              >
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>Ouvrir le Customizer</span>
              </button>
            </div>
          </div>

          {/* Restaurant Credentials & Private Identity Banner */}
          <div className="glass-card-dark rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold">
                  Identifiants & Identité Propre du Restaurant
                </span>
                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">
                  {restaurant.shippingPreference === 'on_site' ? 'Installation sur place' : 'Envoi La Poste'}
                </span>
              </div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{restaurant.name}</span>
                <span className="text-slate-400 text-xs font-normal">({restaurant.address}, {restaurant.city})</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[10px]">Identifiant :</span>
                <span className="font-mono font-bold text-amber-300">{restaurant.username || restaurant.slug}</span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[10px]">Code PIN secret :</span>
                <span className="font-mono font-bold text-amber-300">{restaurant.accessPin || '2025'}</span>
              </div>
              <button
                onClick={handleCopyCredentials}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCreds ? 'Identifiants copiés !' : 'Copier mes identifiants'}</span>
              </button>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="glass-card-dark p-5 rounded-3xl border border-white/10 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Note Moyenne Globale</span>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tabular-nums">{avgRating}</span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{ratingGain}★ depuis installation NFC</span>
              </div>
            </div>

            <div className="glass-card-dark p-5 rounded-3xl border border-white/10 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Avis Récoltés</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tabular-nums">{totalReviewsCount}</span>
                <span className="text-xs text-slate-400">retours</span>
              </div>
              <div className="text-[11px] text-slate-400">
                100% collectés via QR & NFC
              </div>
            </div>

            <div className="glass-card-dark p-5 rounded-3xl border border-white/10 shadow-lg space-y-1 relative">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Pourboires Équipe</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
                  {formatCurrency(totalTipsSum, displayCurrency, { showDualEquivalent: true })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-300 font-semibold">100% serveurs ({displayCurrency})</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportModalOpen(true);
                    soundFX.playHoverTick();
                  }}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Exporter</span>
                </button>
              </div>
            </div>

            <div className="glass-card-dark p-5 rounded-3xl border border-white/10 shadow-lg space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Google Maps Boostés</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-purple-400 tabular-nums">{totalGoogleBoosterClicks}</span>
                <span className="text-xs text-slate-400">redirections 5★</span>
              </div>
              <div className="text-[11px] text-purple-300 font-semibold">
                Filtrage intelligent positif
              </div>
            </div>
          </div>

          {/* Quick Live Stats Recharts Callout Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-emerald-950/40 via-slate-900/80 to-amber-950/30 border border-emerald-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-60"></span>
                <TrendingUp className="w-5 h-5 relative z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Monitoring en Direct · Pics d'Affluence & Pourboires (Recharts)</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30 font-bold">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisez les rushs de service (12h-14h & 19h30-22h30) et la cadence des scans NFC par table.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('live_stats');
                soundFX.playHoverTick();
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer active:scale-95"
            >
              <span>Ouvrir Live Stats</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Tip Sharing Rules Callout Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-amber-950/40 via-slate-900/80 to-indigo-950/30 border border-amber-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Partage Automatique des Pourboires</span>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.2 rounded-full border border-amber-500/30 font-bold">
                    Prorata Temps & Volume
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Répartissez automatiquement selon le temps de service (heures) ou le volume de clients par table avec quote-part cuisine/bar.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('tip_sharing');
                soundFX.playHoverTick();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer active:scale-95"
            >
              <span>Configurer les Règles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </>
      )}

      {/* RENDER TIERS TAB */}
      {activeTab === 'tiers' && (
        <div data-scroll-scene className="glass-card-dark rounded-3xl border border-white/10 shadow-xl p-6 sm:p-7 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-400">
                  Grille Tarifaire Indexée sur les Étoiles
                </span>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                  Actif : {activeTier ? activeTier.name : 'Palier de base'} ({activeTier ? activeTier.servicePrice : 100} €)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Évolution de la Note du Restaurant & Tarification
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Le restaurant était à <strong className="text-white">{restaurant.baselineRating || 2.0} étoiles</strong> au départ. Grâce aux avis récoltés par chaque serveur avec les puces NFC et QR codes, il est monté à <strong className="text-amber-400">{avgRating} étoiles</strong>.
              </p>
            </div>

            <div className="glass-card-dark border border-white/15 p-4 rounded-2xl flex items-center gap-4 text-xs shrink-0 shadow-lg">
              <div>
                <div className="text-slate-400 font-medium">
                  {simulatedRating !== null ? 'Note simulée :' : 'Note actuelle :'}
                </div>
                <div className="text-xl font-black text-white flex items-center gap-1.5 mt-0.5">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="tabular-nums font-mono">{effectiveRating.toFixed(1)} / 5.0</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                  Départ : {restaurant.baselineRating || 2.0}★
                </div>
              </div>
            </div>
          </div>

          {/* 6 Star Tier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(restaurant.starTiers || []).map(tier => {
              const isUnlocked = effectiveRating >= tier.stars;
              const isCurrent = activeTier?.id === tier.id;
              return (
                <div
                  key={tier.id}
                  className={`relative rounded-3xl p-5 border transition-all ${
                    isCurrent
                      ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : isUnlocked
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/10 bg-white/5 opacity-70'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                      Palier Actuel Débloqué
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400 font-black text-sm">
                      {Array.from({ length: Math.floor(tier.stars) }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                      {tier.stars % 1 !== 0 && (
                        <Star className="w-4 h-4 fill-amber-400/50" />
                      )}
                      <span className="ml-1 text-xs text-white font-bold">
                        {tier.stars} {tier.stars === 1 ? 'étoile' : 'étoiles'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-slate-300">
                      {tier.badge}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-white">{tier.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{tier.tagline}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tarif fixé :</span>
                      <span className="font-bold text-amber-400 font-mono text-base">
                        {tier.servicePrice} €
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Prime serveurs :</span>
                      <span className="font-bold text-emerald-400 font-mono text-xs">
                        +{tier.serverBonus} €
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER STAFF & TABLES TAB OR OVERVIEW SECTION */}
      {(activeTab === 'overview' || activeTab === 'staff') && (
        <div data-scroll-scene className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Waiter Leaderboard */}
          <div className="lg:col-span-7 glass-card-dark rounded-3xl border border-white/10 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Équipe en salle ({waiters.length} serveurs)</h2>
                <p className="text-xs text-slate-400">Puces NFC individuelles et pourboires collectés</p>
              </div>
              <button
                onClick={() => setIsAddWaiterOpen(true)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {waiters.map((w, index) => (
                <div
                  key={w.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-6 text-xs font-mono font-bold text-slate-500">
                      #{index + 1}
                    </div>
                    {w.avatarUrl ? (
                      <img
                        src={w.avatarUrl}
                        alt={w.name}
                        className="w-11 h-11 rounded-2xl object-cover border border-amber-400/40"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm">
                        {w.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{w.name}</span>
                        <span className="text-[10px] font-mono bg-white/10 text-amber-300 px-1.5 py-0.5 rounded">
                          {w.nfcUid}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{w.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center justify-end gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="tabular-nums font-mono">{w.ratingAverage.toFixed(1)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{w.totalReviews} avis</div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                        {w.totalTips} €
                      </div>
                      <div className="text-[11px] text-slate-400">pourboires</div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedWaiterId(w.id);
                        setMode('server');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      Badge NFC
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table / Room Map Grid */}
          <div className="lg:col-span-5 glass-card-dark rounded-3xl border border-white/10 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  {isHotel ? `Activité des Chambres & Suites (${tables.length})` : `Activité des Tables (1 à ${restaurant.tableCount || 12})`}
                </h2>
                <p className="text-xs text-slate-400">
                  {isHotel ? 'Scans des chevalets connectés & conciergerie' : 'Scans QR et liaison avec serveurs'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('qr_studio')}
                className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{isHotel ? 'Générer Chevalets' : 'Générer QR'}</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              {tables.map(t => {
                const assignedWaiter = waiters.find(w => w.id === t.assignedWaiterId);
                return (
                  <div
                    key={t.number}
                    className="p-2.5 rounded-2xl border border-white/10 bg-white/5 hover:border-amber-400/60 transition-colors flex flex-col justify-between h-20 text-center cursor-pointer"
                    onClick={() => setActiveTab('qr_studio')}
                    title={`${isHotel ? 'Chambre' : 'Table'} ${t.number} (${t.zone || ''}) - Cliquer pour ouvrir le studio`}
                  >
                    <div className="text-xs font-bold text-white">
                      {isHotel ? `Ch. ${t.number}` : `T${t.number}`}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {assignedWaiter?.name || 'Libre'}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 rounded py-0.5">
                      {t.totalScans} scans
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER REVIEWS FEED ON OVERVIEW */}
      {activeTab === 'overview' && (
        <div data-scroll-scene className="glass-card-dark rounded-3xl border border-white/10 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Journal en direct des avis clients</h2>
              <p className="text-xs text-slate-400">Retours instantanés récoltés par vos serveurs</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterServer}
                  onChange={e => setFilterServer(e.target.value)}
                  className="bg-transparent font-semibold text-slate-200 focus:outline-none"
                >
                  <option value="all" className="bg-slate-900 text-white">Tous les serveurs</option>
                  {waiters.map(w => (
                    <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={filterRating}
                onChange={e => setFilterRating(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none"
              >
                <option value="all" className="bg-slate-900 text-white">Toutes les notes</option>
                <option value="5" className="bg-slate-900 text-white">★ 5 étoiles uniquement</option>
                <option value="4" className="bg-slate-900 text-white">★ 4 étoiles</option>
                <option value="3" className="bg-slate-900 text-white">★ 3 étoiles</option>
              </select>

              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher table, mot..."
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {filteredReviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun avis correspondant aux critères de filtre.
              </div>
            ) : (
              filteredReviews.map(r => (
                <div key={r.id} className="p-5 hover:bg-white/5 transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                      <span className="text-xs font-bold text-white">
                        Table {r.tableNumber} · Serveur : {r.waiterName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {r.googleReviewClicked && (
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                          Google Reviews ↗
                        </span>
                      )}
                      {r.tipAmount > 0 && (
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
                          + {r.tipAmount} €
                        </span>
                      )}
                    </div>
                  </div>

                  {r.comment && (
                    <p className="text-xs text-slate-300 italic bg-white/5 p-2.5 rounded-xl border border-white/10">
                      "{r.comment}"
                    </p>
                  )}

                  {/* Customer Dish Photo & Compliments */}
                  {(r.photoUrl || (r.compliments && r.compliments.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {r.photoUrl && (
                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-1.5 pr-3">
                          <img
                            src={r.photoUrl}
                            alt="Plat capturé par le client"
                            className="w-10 h-10 rounded-lg object-cover border border-amber-500/40 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(r.photoUrl, '_blank')}
                            title="Cliquer pour agrandir la photo"
                          />
                          <div className="text-[10px]">
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <Camera className="w-3 h-3 text-amber-400" />
                              Photo du convive
                            </span>
                            <span className="text-slate-400">Plat / Ambiance table {r.tableNumber}</span>
                          </div>
                        </div>
                      )}

                      {r.compliments && r.compliments.map(comp => (
                        <span
                          key={comp}
                          className="text-[10px] font-medium bg-white/5 border border-white/10 text-slate-300 px-2 py-0.5 rounded-lg"
                        >
                          ✓ {comp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RENDER QR STUDIO & BRANDING TAB */}
      {activeTab === 'qr_studio' && (
        <div data-scroll-scene className="space-y-6">
          <Suspense fallback={<div className="min-h-80" role="status">Chargement des codes QR…</div>}>
            <DynamicTableQrStudio embedded={true} />
          </Suspense>
          <Suspense fallback={<div className="min-h-40" role="status">Chargement des liens de scan…</div>}>
            <ScanTargetManager />
          </Suspense>
        </div>
      )}

      {/* RENDER ONBOARDING & NOTIFICATIONS TAB */}
      {activeTab === 'onboarding' && (
        <div data-scroll-scene className="space-y-6">
          {/* Top Info Banner */}
          <div className="p-6 bg-gradient-to-br from-[#121829] via-[#0b101c] to-[#060911] rounded-3xl border border-amber-500/30 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-400 text-xs font-bold font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Système de Notification Automatisé Digifeel</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Centre d'Onboarding & Notifications Gérant
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Dès votre souscription au pack clé en main, un email d'accueil certifié contenant vos identifiants secrets et le lien direct vers votre dashboard est expédié automatiquement.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewWelcomeEmail}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all shrink-0"
                >
                  <Mail className="w-4 h-4" />
                  <span>Ouvrir l'Email d'Accueil</span>
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="glass-card-dark rounded-3xl p-6 border border-white/10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Identifiants Confidentiels du Gérant</h3>
                  <p className="text-xs text-slate-400">Transmis par email lors de l'activation</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCreds ? 'Copié !' : 'Copier les Accès'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[11px]">Identifiant Restaurant :</span>
                <span className="font-mono font-bold text-white text-base block">{restaurant.slug}</span>
                <span className="text-[10px] text-slate-500">Nom d'utilisateur unique</span>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[11px]">Code Secret PIN :</span>
                <span className="font-mono font-black text-amber-400 text-base block">{restaurant.accessPin || '2025'}</span>
                <span className="text-[10px] text-slate-500">Accès sécurisé gérant</span>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[11px]">Email de Réception :</span>
                <span className="font-mono font-bold text-cyan-300 text-sm block truncate">{restaurant.email || `${restaurant.slug}@restaurant.fr`}</span>
                <span className="text-[10px] text-slate-500">Adresse notifiée lors de l'achat</span>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-1.5 text-xs">
              <span className="text-slate-400 block text-[11px]">Lien direct d'accès à votre Dashboard privé :</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?resto=${restaurant.slug}&view=manager`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs select-all"
                />
                <button
                  onClick={handleCopyCredentials}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shrink-0 transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </button>
              </div>
            </div>
          </div>

          {/* Email Logs History Table */}
          <div className="glass-card-dark rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>Historique des Notifications Automatisées Envoyées</span>
                </h3>
                <p className="text-xs text-slate-400">Journal d'expédition des communications transactionnelles</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const sent = sendOnboardingEmail(restaurant);
                  setActiveEmailModal(sent);
                }}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Renvoyer l'Email d'Accueil</span>
              </button>
            </div>

            <div className="divide-y divide-white/10 border border-white/10 rounded-2xl overflow-hidden bg-black/20">
              {restaurantEmails.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Aucun email archivé pour cet établissement.
                </div>
              ) : (
                restaurantEmails.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{log.subject}</span>
                        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {log.status === 'delivered' ? 'Délivré 250 OK' : 'Envoyé'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Envoyé à : <strong className="text-slate-200">{log.to}</strong></span>
                        <span>•</span>
                        <span>{new Date(log.sentAt).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveEmailModal(log)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Prévisualiser l'Email</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER FAQ & CUSTOMER HELP MANAGER TAB */}
      {activeTab === 'faq' && (
        <div data-scroll-scene>
          <Suspense fallback={<div className="min-h-80" role="status">Chargement des questions…</div>}>
            <ManagerFaqManager />
          </Suspense>
        </div>
      )}

      {/* Modal: Add Waiter */}
      {isAddWaiterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-white/15">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {isHotel ? 'Ajouter un collaborateur / membre d\'équipe' : 'Ajouter un nouveau serveur NFC'}
              </h3>
              <button
                onClick={() => setIsAddWaiterOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWaiter} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  {isHotel ? 'Prénom & Nom du collaborateur' : 'Prénom & Nom du serveur'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isHotel ? "Ex : Alexandre, Camille, Maxime..." : "Ex : Maxime, Emma, Lucas..."}
                  value={newWaiterName}
                  onChange={e => setNewWaiterName(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Rôle / Poste</label>
                <select
                  value={newWaiterRole}
                  onChange={e => setNewWaiterRole(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                >
                  {isHotel ? (
                    <>
                      <option value="Chef Concierge Clefs d'Or" className="bg-slate-900 text-white">Chef Concierge Clefs d'Or</option>
                      <option value="Responsable Réception & Guest Relations" className="bg-slate-900 text-white">Responsable Réception & Guest Relations</option>
                      <option value="Responsable Room Service & Bar de Nuit" className="bg-slate-900 text-white">Responsable Room Service & Bar de Nuit</option>
                      <option value="Gouvernante Principale d'Étage" className="bg-slate-900 text-white">Gouvernante Principale d'Étage</option>
                      <option value="Voiturier & Bagagiste" className="bg-slate-900 text-white">Voiturier & Bagagiste</option>
                      <option value="Majordome / Butler" className="bg-slate-900 text-white">Majordome / Butler</option>
                      <option value="Barman Lounge" className="bg-slate-900 text-white">Barman Lounge</option>
                    </>
                  ) : (
                    <>
                      <option value="Serveur" className="bg-slate-900 text-white">Serveur / Serveuse</option>
                      <option value="Chef de rang" className="bg-slate-900 text-white">Chef de rang</option>
                      <option value="Sommelier" className="bg-slate-900 text-white">Sommelier / Caviste</option>
                      <option value="Barman" className="bg-slate-900 text-white">Barman / Barmaid</option>
                      <option value="Runner" className="bg-slate-900 text-white">Runner</option>
                      <option value="Maître d'hôtel" className="bg-slate-900 text-white">Maître d'hôtel</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  {isHotel ? 'Chambres / Suites assignées' : 'Tables assignées'}
                </label>
                <input
                  type="text"
                  placeholder={isHotel ? "Ex : 101, 102, 201, 301" : "Ex : 1, 2, 3, 4"}
                  value={newWaiterTables}
                  onChange={e => setNewWaiterTables(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddWaiterOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  Générer Puce NFC & Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Restaurant Settings */}
      {isEditRestoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-white/15">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Paramètres du restaurant</h3>
              <button
                onClick={() => setIsEditRestoOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResto} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Nom de l'établissement</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Adresse</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Ville</label>
                <input
                  type="text"
                  required
                  value={editCity}
                  onChange={e => setEditCity(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Lien de redirection Google Reviews (5 étoiles)
                </label>
                <input
                  type="url"
                  required
                  value={editGoogleUrl}
                  onChange={e => setEditGoogleUrl(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditRestoOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accounting & Statistics Export Modal (CSV / PDF) */}
      <ManagerExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Demo Account & Google Reviews Setup Modal */}
      <DemoRestaurantSetupModal
        isOpen={isDemoSetupOpen}
        onClose={() => setIsDemoSetupOpen(false)}
      />

      {/* Phone NFC Chip Enroller Modal */}
      <NfcChipEnrollerModal
        isOpen={isNfcEnrollerOpen}
        onClose={() => setIsNfcEnrollerOpen(false)}
      />

      {/* Restaurant Owner Interactive Walkthrough Didacticiel Modal */}
      <RestaurantOwnerTutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
      />

      {/* Real-time Manager Notification Toast Banner */}
      <ManagerNotificationToast />

      {/* Real-time Manager Notification Drawer / History Panel */}
      <ManagerNotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />
    </div>
  );
};
