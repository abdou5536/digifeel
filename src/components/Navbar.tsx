import React, { useState } from 'react';
import { useApp, AppMode } from '../context/AppContext';
import { soundFX } from '../utils/soundEffects';
import {
  Smartphone,
  BarChart3,
  QrCode,
  Sparkles,
  BookOpen,
  Crown,
  Mail,
  Radio,
  Lock,
  Menu,
  X,
  Home,
  UserCheck,
  ChevronRight,
  Coins,
  Compass,
  Hotel,
  Palette,
  Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CurrencySelectorModal } from './CurrencySelectorModal';
import { RestaurantOwnerTutorialModal } from './RestaurantOwnerTutorialModal';
import { PwaInstallButton } from './PwaInstallButton';
import { WORLD_CURRENCIES, getCurrencyInfo } from '../utils/currencyUtils';
import { MIRROR_THEMES } from '../utils/mirrorThemeUtils';

export const Navbar: React.FC = () => {
  const {
    mode,
    setMode,
    visibleRestaurants,
    currentRestaurantId,
    setCurrentRestaurantId,
    emailLogs,
    setActiveEmailModal,
    displayCurrency,
    currentMirrorTheme,
    isSpecularMirrorActive,
    setIsMirrorModalOpen
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);

  const activeCurrencyInfo = getCurrencyInfo(displayCurrency);
  const activeMirrorTheme = MIRROR_THEMES[currentMirrorTheme] || MIRROR_THEMES.amber_gold;

  const mainNavItems: { id: AppMode; label: string; mobileLabel: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'landing', label: 'Accueil', mobileLabel: 'Accueil', icon: Home },
    { id: 'client', label: 'Parcours client', mobileLabel: 'Avis', icon: Smartphone },
    { id: 'server', label: 'Espace serveur', mobileLabel: 'Serveur', icon: UserCheck },
    { id: 'manager', label: 'Tableau de bord', mobileLabel: 'Gestion', icon: BarChart3 }
  ];

  const secondaryTools: { id: AppMode; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'studio', label: 'Gérer les QR codes', icon: QrCode },
    { id: 'super_admin', label: 'Gérer les établissements', icon: Crown },
    { id: 'tutorial', label: 'Ouvrir le guide', icon: BookOpen }
  ];

  return (
    <>
      {/* Top Main Navigation Header */}
      <header className="glass-nav sticky top-0 z-40 border-b border-white/10 no-print">
        <div className="navbar-header-inner max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Brand Logo & Active Restaurant */}
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.button
              type="button"
              aria-label="Aller à l’accueil"
              onClick={() => {
                setMode('landing');
                soundFX.playHoverTick();
              }}
              className="navbar-brand text-base sm:text-lg font-black tracking-tight text-white hover:text-amber-400 transition-colors flex items-center gap-2.5 cursor-pointer font-display"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <span className="navbar-brand-label font-black tracking-wider text-white">DIGIFEEL</span>
            </motion.button>

            {/* Establishment Switcher (Restaurant & Hotel accounts) */}
            {visibleRestaurants.length > 0 && (
              <div className="navbar-establishment-switcher hidden md:flex items-center gap-2 pl-3 border-l border-white/10 text-xs">
                <select
                  value={currentRestaurantId}
                  onChange={e => {
                    setCurrentRestaurantId(e.target.value);
                    soundFX.playSuccessChime();
                  }}
                  className="text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-amber-400 cursor-pointer transition-colors"
                  aria-label="Choisir un établissement"
                >
                  {visibleRestaurants.map(r => {
                    const isHotel = r.establishmentType === 'hotel';
                    return (
                      <option key={r.id} value={r.id} className="bg-slate-950 text-white">
                        {isHotel ? 'Hôtel · ' : 'Restaurant · '}{r.name}
                      </option>
                    );
                  })}
                </select>

                {/* Quick 1-Click Fast Switcher Button between Restaurant and Hotel */}
                {visibleRestaurants.some(r => r.establishmentType === 'hotel') && (
                  (() => {
                    const currentResto = visibleRestaurants.find(r => r.id === currentRestaurantId);
                    const isCurrentHotel = currentResto?.establishmentType === 'hotel';
                    const target = isCurrentHotel
                      ? visibleRestaurants.find(r => r.establishmentType !== 'hotel')
                      : visibleRestaurants.find(r => r.establishmentType === 'hotel');

                    if (!target) return null;

                    return (
                      <motion.button
                        type="button"
                        onClick={() => {
                          setCurrentRestaurantId(target.id);
                          soundFX.playSuccessChime();
                        }}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/15 text-amber-300 border-amber-500/30 active:scale-95"
                        title={`Choisir ${target.name}`}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                      >
                        {isCurrentHotel ? <Utensils className="w-3.5 h-3.5" /> : <Hotel className="w-3.5 h-3.5" />}
                        <span>{isCurrentHotel ? 'Vers Restaurant' : 'Vers Hôtel 5★'}</span>
                      </motion.button>
                    );
                  })()
                )}
              </div>
            )}
          </div>

          {/* Clean Desktop Navigation (4 Main Tabs) */}
          <nav
            className="main-nav main-nav--desktop hidden lg:flex items-center gap-1.5 rounded-2xl border border-white/10"
            aria-label="Navigation principale"
            tabIndex={0}
            title="Faites défiler horizontalement pour afficher toutes les pages"
          >
            {mainNavItems.map(item => {
              const isActive = mode === item.id;
              const IconComp = item.icon;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setMode(item.id);
                    soundFX.playHoverTick();
                  }}
                  className={`main-nav__item relative isolate flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-slate-50 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="main-nav-indicator-desktop"
                      className="main-nav__indicator"
                      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                    />
                  )}
                  <IconComp className="relative z-10 w-3.5 h-3.5" />
                  <span className="relative z-10">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>

          {/* Right Action Section */}
          <div className="navbar-actions flex items-center gap-2">
            {/* Effet Miroir Pro Button */}
            <motion.button
              onClick={() => {
                setIsMirrorModalOpen(true);
                soundFX.playHoverTick();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 animate-mirror-sweep"
              title={`Changer l’apparence. Thème actuel : ${activeMirrorTheme.name}`}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Apparence</span>
              {isSpecularMirrorActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </motion.button>

            {/* Direct Didacticiel Guide Button */}
            <motion.button
              onClick={() => {
                setIsTutorialModalOpen(true);
                soundFX.playHoverTick();
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Ouvrir le guide de démarrage"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Guide de démarrage</span>
            </motion.button>

            {/* World Currency Selector Pill */}
            <motion.button
              onClick={() => {
                setIsCurrencyModalOpen(true);
                soundFX.playHoverTick();
              }}
              aria-label="Choisir la devise"
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Choisir la devise"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="navbar-currency-label">Devise · {activeCurrencyInfo.code}</span>
            </motion.button>

            {/* Quick Order Pack Button */}
            <motion.button
              onClick={() => {
                setMode('pricing');
                setIsMobileMenuOpen(false);
                soundFX.playHoverTick();
              }}
              className="navbar-packs-action px-3.5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Voir les packs</span>
            </motion.button>

            {/* Mobile / Secondary Menu Button */}
            <motion.button
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                soundFX.playHoverTick();
              }}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="hidden sm:inline">Menu</span>
            </motion.button>
          </div>

        </div>
      </header>

      {/* Slide-over Drawer for All Views & Tools */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mobile-menu-panel fixed inset-x-0 top-16 z-30 border-b border-white/10 overflow-hidden no-print"
          >
            <div className="max-w-4xl mx-auto p-5 space-y-5 max-h-[calc(100vh-5rem)] overflow-y-auto">
              
              {/* Restaurant & Hotel Switcher in Drawer */}
              {visibleRestaurants.length > 0 && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                      Établissements
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {visibleRestaurants.length} disponibles
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visibleRestaurants.map(r => {
                      const isSelected = r.id === currentRestaurantId;
                      const isHotel = r.establishmentType === 'hotel';
                      return (
                        <motion.button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setCurrentRestaurantId(r.id);
                            soundFX.playSuccessChime();
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/10'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isHotel
                                ? <Hotel className="w-4 h-4 text-slate-400" />
                                : <Utensils className="w-4 h-4 text-slate-400" />}
                              <span className="text-xs font-bold text-white truncate">{r.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {isHotel ? 'Hôtel' : 'Restaurant'}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shrink-0">
                              Sélectionné
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Views */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold px-1">
                  Ouvrir une page
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mainNavItems.map(item => {
                    const isActive = mode === item.id;
                    const IconComp = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          setMode(item.id);
                          setIsMobileMenuOpen(false);
                          soundFX.playHoverTick();
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                            : 'bg-white/5 text-slate-200 hover:bg-white/10'
                        }`}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComp className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                type="button"
                onClick={() => {
                  setMode('pricing');
                  setIsMobileMenuOpen(false);
                  soundFX.playHoverTick();
                }}
                className="w-full min-h-11 px-4 py-3 rounded-2xl bg-white text-slate-950 text-sm font-black flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <Lock className="w-4 h-4" />
                <span>Voir les packs</span>
              </motion.button>

              {/* Advanced Tools */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold px-1">
                  Outils
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {secondaryTools.map(item => {
                    const isActive = mode === item.id;
                    const IconComp = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          setMode(item.id);
                          setIsMobileMenuOpen(false);
                          soundFX.playHoverTick();
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComp className="w-4 h-4 text-amber-400" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            {item.badge}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/10 pt-3">
                <PwaInstallButton />
              </div>

              {/* Email Logs Button */}
              {emailLogs.length > 0 && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <motion.button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setActiveEmailModal(emailLogs[0]);
                      soundFX.playHoverTick();
                    }}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span>Ouvrir le dernier e-mail d’accueil</span>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav className="main-nav main-nav--mobile md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 px-3 py-2 flex items-center justify-around no-print pb-safe">
        {mainNavItems.map(item => {
          const isActive = mode === item.id;
          const IconComp = item.icon;

          return (
            <motion.button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                setMode(item.id);
                setIsMobileMenuOpen(false);
                soundFX.playHoverTick();
              }}
              className={`main-nav__mobile-item relative isolate flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'text-slate-50 font-black'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              {isActive && (
                <motion.span
                  layoutId="main-nav-indicator-mobile"
                  className="main-nav__mobile-indicator"
                  transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                />
              )}
              <div className={`p-1 rounded-xl transition-all ${
                isActive ? 'text-sky-200' : ''
              }`}>
                <IconComp className="relative z-10 w-4 h-4" />
              </div>
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight truncate">{item.mobileLabel}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* World Currency Selector & Live Converter Modal */}
      <CurrencySelectorModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />

      {/* Restaurant Owner Interactive Walkthrough Didacticiel Modal */}
      <RestaurantOwnerTutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
      />
    </>
  );
};
