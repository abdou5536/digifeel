/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Radio } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { OnboardingNotificationToast } from './components/OnboardingNotificationToast';
import { ManagerNotificationToast } from './components/ManagerNotificationToast';
import { Footer } from './components/Footer';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AuthenticatedUser, ManagementAccess } from './components/ManagementAccess';
import { ScrollMoon } from './components/ScrollMoon';

const CustomerRatingView = lazy(() => import('./components/CustomerRatingView').then(module => ({ default: module.CustomerRatingView })));
const WaiterProfileView = lazy(() => import('./components/WaiterProfileView').then(module => ({ default: module.WaiterProfileView })));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard').then(module => ({ default: module.ManagerDashboard })));
const QrNfcStudio = lazy(() => import('./components/QrNfcStudio').then(module => ({ default: module.QrNfcStudio })));
const TutorialGuideView = lazy(() => import('./components/TutorialGuideView').then(module => ({ default: module.TutorialGuideView })));
const SuperAdminPortalView = lazy(() => import('./components/SuperAdminPortalView').then(module => ({ default: module.SuperAdminPortalView })));
const ChipActivationView = lazy(() => import('./components/ChipActivationView').then(module => ({ default: module.ChipActivationView })));
const OrderPackModal = lazy(() => import('./components/OrderPackModal').then(module => ({ default: module.OrderPackModal })));
const ProviderPayoutModal = lazy(() => import('./components/ProviderPayoutModal').then(module => ({ default: module.ProviderPayoutModal })));
const EmailViewerModal = lazy(() => import('./components/EmailViewerModal').then(module => ({ default: module.EmailViewerModal })));
const MirrorThemeModal = lazy(() => import('./components/MirrorThemeModal').then(module => ({ default: module.MirrorThemeModal })));

const AppContent: React.FC = () => {
  const {
    mode,
    setMode,
    isDemoMode,
    setIsDemoMode,
    setShowDemoAccount,
    restaurants,
    restaurant,
    setCurrentRestaurantId,
    setSelectedWaiterId,
    setSelectedTableNumber,
    isMirrorModalOpen,
    setIsMirrorModalOpen,
    isOrderModalOpen,
    isPayoutModalOpen,
    activeEmailModal,
    registeredNfcChips,
    activeChipId
  } = useApp();
  const shouldReduceMotion = useReducedMotion();
  const isCustomerFlow = mode === 'client';
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasOpenedOrderModal, setHasOpenedOrderModal] = useState(false);
  const [hasOpenedPayoutModal, setHasOpenedPayoutModal] = useState(false);
  const [hasOpenedEmailModal, setHasOpenedEmailModal] = useState(false);
  const [hasOpenedMirrorModal, setHasOpenedMirrorModal] = useState(false);
  const [demoLinkStatus, setDemoLinkStatus] = useState('');

  useEffect(() => {
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!pointerQuery.matches || motionQuery.matches) return;

    let activeSurface: HTMLElement | null = null;
    let frame = 0;
    let latestPointer: PointerEvent | null = null;

    const updateHighlight = () => {
      frame = 0;
      if (!latestPointer) return;

      const target = latestPointer.target;
      const surface = target instanceof Element
        ? target.closest<HTMLElement>('.glass-interactive')
        : null;

      if (activeSurface !== surface) {
        activeSurface?.style.removeProperty('--pointer-x');
        activeSurface?.style.removeProperty('--pointer-y');
        activeSurface = surface;
      }

      if (!surface) return;
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--pointer-x', `${latestPointer.clientX - bounds.left}px`);
      surface.style.setProperty('--pointer-y', `${latestPointer.clientY - bounds.top}px`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      latestPointer = event;
      if (!frame) frame = window.requestAnimationFrame(updateHighlight);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      if (frame) window.cancelAnimationFrame(frame);
      activeSurface?.style.removeProperty('--pointer-x');
      activeSurface?.style.removeProperty('--pointer-y');
    };
  }, []);

  useEffect(() => {
    if (isOrderModalOpen) setHasOpenedOrderModal(true);
    if (isPayoutModalOpen) setHasOpenedPayoutModal(true);
    if (activeEmailModal) setHasOpenedEmailModal(true);
    if (isMirrorModalOpen) setHasOpenedMirrorModal(true);
  }, [isOrderModalOpen, isPayoutModalOpen, activeEmailModal, isMirrorModalOpen]);

  const checkSession = useCallback(async () => {
    setAuthStatus('loading');
    setAuthError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal
      });
      if (response.status === 401) {
        setAuthUser(null);
        setAuthStatus('ready');
        return;
      }
      if (!response.ok) {
        setAuthUser(null);
        setAuthError(response.status >= 500
          ? 'Le service de connexion est momentanément indisponible. Réessayez dans quelques instants.'
          : 'La session n’a pas pu être vérifiée. Réessayez.');
        setAuthStatus('unavailable');
        return;
      }
      const result = await response.json() as { user?: AuthenticatedUser };
      if (!result.user) {
        throw new Error('La session n’a pas pu être vérifiée.');
      }
      setAuthUser(result.user);
      setAuthStatus('ready');
    } catch {
      setAuthUser(null);
      setAuthError('Connexion impossible. Vérifiez votre connexion puis réessayez.');
      setAuthStatus('unavailable');
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!authUser) return;
    const verifyOnReturn = () => void checkSession();
    const intervalId = window.setInterval(verifyOnReturn, 60_000);
    window.addEventListener('focus', verifyOnReturn);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', verifyOnReturn);
    };
  }, [authUser, checkSession]);

  // Check URL parameters for multi-restaurant routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restoParam = params.get('resto');
    const serverParam = params.get('server');
    const tableParam = params.get('table');
    const nfcParam = params.get('nfc');
    const chipParam = params.get('chip') || params.get('chipId');
    const viewParam = params.get('view');
    const demoParam = params.get('demo');

    // Check direct /r/:chipId in URL pathname
    const pathname = window.location.pathname;
    const rMatch = pathname.match(/^\/r\/([^/?#]+)/);
    const detectedChip = chipParam || (rMatch ? rMatch[1] : null);

    if (detectedChip) {
      // Resolve chip via API
      fetch(`/api/r/${encodeURIComponent(detectedChip)}`)
        .then(res => res.json())
        .then(data => {
          if (!data || data.error) return;
          if (!data.isActivated) {
            setMode('chip_activation');
          } else {
            if (data.restaurant?.id) {
              setCurrentRestaurantId(data.restaurant.id);
            }
            if (data.server?.id) {
              setSelectedWaiterId(data.server.id);
            }
            if (typeof data.tableNumber === 'number') {
              setSelectedTableNumber(data.tableNumber);
            }
            setMode('client');
          }
        })
        .catch(() => {
          // Fallback local check
          const localChip = registeredNfcChips.find(c => c.id === detectedChip || c.uid === detectedChip);
          if (localChip && localChip.status === 'active') {
            if (localChip.targetType === 'server' && localChip.targetId) {
              setSelectedWaiterId(localChip.targetId);
            } else if (localChip.targetType === 'table' && localChip.targetId) {
              setSelectedTableNumber(parseInt(localChip.targetId, 10) || 1);
            }
            setMode('client');
          } else {
            setMode('chip_activation');
          }
        });
      return;
    }

    let matchedResto = restaurant;

    if (demoParam === 'dashboard' || demoParam === 'server') {
      setShowDemoAccount(true);
      setCurrentRestaurantId('resto-demo');
      setIsDemoMode(true);
      setMode(demoParam === 'server' ? 'server' : 'demo');
      return;
    }

    // 1. Identify and switch to the target restaurant by slug or ID
    if (restoParam) {
      const match = restaurants.find(
        r => r.slug.toLowerCase() === restoParam.toLowerCase() || r.id.toLowerCase() === restoParam.toLowerCase()
      );
      if (match) {
        matchedResto = match;
        setCurrentRestaurantId(match.id);
      }
    }

    // 2. Direct Super Admin Access
    if (viewParam === 'super_admin' || viewParam === 'admin') {
      setMode('super_admin');
      return;
    }

    // 3. Direct Private Manager Dashboard Access (e.g. ?resto=david&view=manager)
    if (viewParam === 'manager') {
      setMode('manager');
      return;
    }

    // 4. NFC Chip Scan lookup (e.g. ?resto=david&nfc=04:A2:8B...)
    if (nfcParam && matchedResto) {
      const chip = (matchedResto.registeredNfcChips || []).find(
        c => c.uid.toLowerCase() === nfcParam.toLowerCase() || c.id.toLowerCase() === nfcParam.toLowerCase()
      );
      if (chip) {
        if (chip.targetType === 'server') {
          setSelectedWaiterId(chip.targetId);
        } else if (chip.targetType === 'table') {
          setSelectedTableNumber(parseInt(chip.targetId, 10) || 1);
        }
      }
    }

    // 5. Client scan access (e.g. ?resto=david&table=4 or ?resto=david&server=waiter-1)
    if (serverParam || tableParam || restoParam || nfcParam) {
      if (serverParam) setSelectedWaiterId(serverParam);
      if (tableParam) setSelectedTableNumber(parseInt(tableParam, 10) || 1);
      if (!viewParam) {
        setMode('client');
      }
    }
  }, [restaurants, restaurant, setCurrentRestaurantId, setIsDemoMode, setMode, setSelectedTableNumber, setSelectedWaiterId, setShowDemoAccount]);

  const isDemoAccessibleView = isDemoMode && (mode === 'demo' || mode === 'server');
  const requiresManagementAccess = (mode === 'manager' || mode === 'server' || mode === 'studio' || mode === 'tutorial' || mode === 'super_admin') && !isDemoAccessibleView;
  const isSuperAdminView = mode === 'super_admin';
  const hasManagementAccess = isDemoAccessibleView || (authUser !== null && (
    isSuperAdminView
      ? authUser.role === 'super_admin'
      : authUser.role === 'super_admin' ||
        (['owner', 'manager'].includes(authUser.role) && authUser.restaurantId === restaurant.id)
  ));

  const openDemo = (view: 'dashboard' | 'server') => {
    setShowDemoAccount(true);
    setCurrentRestaurantId('resto-demo');
    setIsDemoMode(true);
    setDemoLinkStatus('');
    const url = new URL(window.location.href);
    url.searchParams.set('demo', view);
    url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
    setMode(view === 'server' ? 'server' : 'demo');
  };

  const shareDemoLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setDemoLinkStatus('Lien copié');
    } catch (error) {
      console.error('Le lien de démonstration n’a pas pu être copié.', error);
      setDemoLinkStatus('Copiez le lien depuis la barre d’adresse');
    }
  };

  const exitDemo = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.replaceState(null, '', url);
    window.location.reload();
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [mode]);

  useEffect(() => {
    const shouldSnap = mode === 'server' || mode === 'manager' || mode === 'demo';
    document.documentElement.classList.toggle('scroll-journey-enabled', shouldSnap);

    return () => {
      document.documentElement.classList.remove('scroll-journey-enabled');
    };
  }, [mode]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (!response.ok) {
        throw new Error('La déconnexion n’a pas abouti. Réessayez.');
      }
      setAuthUser(null);
      setMode('landing');
      setAuthStatus('ready');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'La déconnexion n’a pas abouti.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex flex-col text-slate-100 overflow-x-hidden">
      {!isCustomerFlow && !isDemoMode && <Navbar />}
      {isDemoMode && (
        <aside className="demo-session-banner" role="status" aria-live="polite">
          <div>
            <strong>MODE DÉMO</strong>
            <span>Toutes les données sont simulées. Vos changements ne seront pas enregistrés.</span>
          </div>
          <nav aria-label="Navigation du mode démo">
            <button
              type="button"
              className="demo-session-banner__back"
              onClick={() => {
                const view = mode === 'server' ? 'dashboard' : 'server';
                const url = new URL(window.location.href);
                url.searchParams.set('demo', view);
                window.history.replaceState(null, '', url);
                setMode(view === 'server' ? 'server' : 'demo');
              }}
            >
              {mode === 'server' ? 'Voir le tableau de bord' : 'Voir l’espace serveur'}
            </button>
            <button type="button" className="demo-session-banner__share" onClick={() => void shareDemoLink()}>
              {demoLinkStatus || 'Partager ce lien'}
            </button>
            <button type="button" onClick={exitDemo}>
              Quitter la démo
            </button>
          </nav>
        </aside>
      )}
      {isCustomerFlow && !isDemoMode && (
        <nav className="customer-return-bar" aria-label="Navigation du parcours client">
          <button type="button" onClick={() => setMode('landing')}>
            <ArrowLeft aria-hidden="true" />
            <span>Retour à l’accueil</span>
          </button>
          <span className="customer-return-bar__brand">
            <Radio aria-hidden="true" />
            DIGIFEEL
          </span>
          <span className="customer-return-bar__label">Parcours client</span>
        </nav>
      )}
      {!isCustomerFlow && !isDemoMode && !requiresManagementAccess && <ConnectionStatus />}
      {!isCustomerFlow && !isDemoMode && authUser && hasManagementAccess && (
        <div className="management-session-bar">
          <span>{authUser?.email}</span>
          {authError && <span role="alert">{authError}</span>}
          <button type="button" disabled={isSigningOut} onClick={() => void handleSignOut()}>
            {isSigningOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      )}

      <main className={`flex-1 relative ${isDemoMode ? 'pb-0' : isCustomerFlow ? '' : 'pb-16 xl:pb-0'}`}>
        {requiresManagementAccess && !hasManagementAccess ? (
          authStatus === 'loading' ? (
            <div className="management-access__loading" role="status">Vérification de la session…</div>
          ) : authUser ? (
            <main className="management-access" role="alert">
              <section className="management-access__card">
                <h1>Accès non autorisé</h1>
                <p>Ce compte ne dispose pas des droits nécessaires pour cet espace ou cet établissement.</p>
                <button type="button" onClick={() => setMode('landing')}>Retour à l’accueil</button>
              </section>
            </main>
          ) : (
            <ManagementAccess
              demoView={mode === 'server' ? 'server' : 'dashboard'}
              onDemo={openDemo}
              onAuthenticated={user => {
                setAuthUser(user);
                setAuthStatus('ready');
                setAuthError(null);
              }}
              error={authError}
              onRetry={() => void checkSession()}
              unavailable={authStatus === 'unavailable'}
            />
          )
        ) : (
          <Suspense fallback={<div className="min-h-[60vh] grid place-items-center text-slate-300" role="status">Chargement de l’écran…</div>}>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.99 }}
                transition={{
                  duration: shouldReduceMotion ? 0.12 : 0.38,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className="route-view w-full"
              >
                {mode === 'landing' && <LandingPage />}
                {mode === 'client' && <CustomerRatingView />}
                {mode === 'server' && <WaiterProfileView />}
                {mode === 'manager' && <ManagerDashboard />}
                {mode === 'demo' && <ManagerDashboard />}
                {mode === 'studio' && <QrNfcStudio />}
                {mode === 'super_admin' && <SuperAdminPortalView />}
                {mode === 'tutorial' && <TutorialGuideView />}
                {mode === 'chip_activation' && <ChipActivationView chipId={activeChipId || 'chip-new-101'} />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        )}
      </main>

      {!isCustomerFlow && !isDemoMode && <Footer />}
      {!isCustomerFlow && !isDemoMode && <ScrollMoon />}
      <Suspense fallback={<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 text-slate-200" role="status">Chargement…</div>}>
        {hasOpenedOrderModal && <OrderPackModal />}
        {hasOpenedPayoutModal && <ProviderPayoutModal />}
        {hasOpenedEmailModal && <EmailViewerModal />}
        {hasOpenedMirrorModal && (
          <MirrorThemeModal
            isOpen={isMirrorModalOpen}
            onClose={() => setIsMirrorModalOpen(false)}
          />
        )}
      </Suspense>
      {!isCustomerFlow && !isDemoMode && <OnboardingNotificationToast />}
      {!isCustomerFlow && !isDemoMode && <ManagerNotificationToast />}
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </MotionConfig>
  );
}
