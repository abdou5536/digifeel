import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { RestaurantConfig, Waiter, Review, TableItem, ProviderPayoutConfig, EmailLog, HardwareStatus, FaqItem, TipSharingConfig, TipPoolCalculationResult, ManagerToastNotification, ManagerNotificationType, RegisteredNfcChip, MirrorThemeId } from '../types';
import { INITIAL_RESTAURANTS, INITIAL_WAITERS, INITIAL_REVIEWS, INITIAL_TABLES, DEFAULT_PROVIDER_PAYOUT, INITIAL_EMAIL_LOGS, INITIAL_FAQ_ITEMS } from '../data/mockData';
import { DEFAULT_TIP_SHARING_CONFIG, calculateTipDistribution } from '../utils/tipSharingUtils';
import { applyMirrorThemeToDom } from '../utils/mirrorThemeUtils';
import { soundFX } from '../utils/soundEffects';

export type AppMode = 'landing' | 'client' | 'server' | 'manager' | 'demo' | 'studio' | 'tutorial' | 'super_admin';

interface AppContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isDemoMode: boolean;
  setIsDemoMode: (isDemoMode: boolean) => void;
  
  // Super Admin / Demo Toggle
  showDemoAccount: boolean;
  setShowDemoAccount: (show: boolean) => void;
  superAdminEmail: string;

  // Multi-restaurant state
  restaurants: RestaurantConfig[];
  visibleRestaurants: RestaurantConfig[];
  currentRestaurantId: string;
  setCurrentRestaurantId: (id: string) => void;
  switchToEstablishment: (id: string) => void;
  restaurant: RestaurantConfig;
  updateRestaurant: (updates: Partial<RestaurantConfig>) => void;
  updateRestaurantGoogleUrl: (url: string) => void;
  createRestaurant: (newRestoData: Omit<RestaurantConfig, 'id'>) => RestaurantConfig;
  deleteRestaurant: (restoId: string) => void;

  // Effet Miroir Métamorphique Global
  currentMirrorTheme: MirrorThemeId;
  setMirrorTheme: (theme: MirrorThemeId) => void;
  isSpecularMirrorActive: boolean;
  setIsSpecularMirrorActive: (active: boolean) => void;
  isMirrorModalOpen: boolean;
  setIsMirrorModalOpen: (open: boolean) => void;

  // Registered NFC Chips Provisioning & Live Scan
  registeredNfcChips: RegisteredNfcChip[];
  registerNfcChip: (chipData: Omit<RegisteredNfcChip, 'id' | 'encodedAt'>) => RegisteredNfcChip;
  updateNfcChip: (chipId: string, updates: Partial<RegisteredNfcChip>) => void;
  deleteNfcChip: (chipId: string) => void;
  lastScannedChipAlert: RegisteredNfcChip | null;
  setLastScannedChipAlert: (chip: RegisteredNfcChip | null) => void;
  triggerNfcChipScan: (uid: string) => RegisteredNfcChip | null;
  
  // Scoped data for current restaurant
  waiters: Waiter[];
  addWaiter: (name: string, role: string, tables: number[]) => void;
  selectedWaiterId: string;
  setSelectedWaiterId: (id: string) => void;
  selectedTableNumber: number;
  setSelectedTableNumber: (num: number) => void;
  reviews: Review[];
  tables: TableItem[];
  addReview: (reviewData: Omit<Review, 'id' | 'createdAt'>) => void;

  // Real-time Manager Toast Notifications
  managerNotifications: ManagerToastNotification[];
  activeManagerToast: ManagerToastNotification | null;
  setActiveManagerToast: (toast: ManagerToastNotification | null) => void;
  addManagerNotification: (notifData: Omit<ManagerToastNotification, 'id' | 'createdAt' | 'read'>) => ManagerToastNotification;
  dismissManagerNotification: (id: string) => void;
  clearAllManagerNotifications: () => void;
  markNotificationAsRead: (id: string) => void;

  // Automated Tip Sharing & Pool Configuration
  tipSharingConfig: TipSharingConfig;
  updateTipSharingConfig: (updates: Partial<TipSharingConfig>) => void;
  tipDistribution: TipPoolCalculationResult;

  // FAQ Manager for Current Restaurant
  faqItems: FaqItem[];
  addFaqItem: (item: Omit<FaqItem, 'id' | 'restaurantId'>) => void;
  updateFaqItem: (id: string, updates: Partial<FaqItem>) => void;
  deleteFaqItem: (id: string) => void;
  resetFaqItems: () => void;
  
  // Multi-Currency & World Conversion (Dinar Algérien, Dinar Tunisien, Dirham, Euro, Dollar...)
  displayCurrency: string;
  setDisplayCurrency: (currencyCode: string) => void;

  // Modals & Tools
  isOrderModalOpen: boolean;
  setIsOrderModalOpen: (open: boolean) => void;
  resetToDefaults: () => void;
  clientSimulatedDevice: 'mobile' | 'desktop';
  setClientSimulatedDevice: (d: 'mobile' | 'desktop') => void;
  
  // Payout Configuration (RIB & Virement du prestataire: Abdallah)
  payoutConfig: ProviderPayoutConfig;
  updatePayoutConfig: (cfg: Partial<ProviderPayoutConfig>) => void;
  isPayoutModalOpen: boolean;
  setIsPayoutModalOpen: (open: boolean) => void;

  // Automated Email Onboarding & Notification Flow
  emailLogs: EmailLog[];
  sendOnboardingEmail: (resto: RestaurantConfig, customEmail?: string) => EmailLog;
  activeEmailModal: EmailLog | null;
  setActiveEmailModal: (email: EmailLog | null) => void;
  notificationToast: EmailLog | null;
  setNotificationToast: (email: EmailLog | null) => void;

  // Hardware Status Update
  updateHardwareStatus: (restoId: string, status: HardwareStatus) => void;

  // Helper to generate restaurant private dashboard URL
  getRestaurantDashboardUrl: (restoId: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_RESTAURANTS = 'nfcresto_all_restaurants_v5';
const STORAGE_KEY_CURRENT_RESTO = 'nfcresto_current_resto_v5';
const STORAGE_KEY_WAITERS = 'nfcresto_waiters_v5';
const STORAGE_KEY_REVIEWS = 'nfcresto_reviews_v5';
const STORAGE_KEY_TABLES = 'nfcresto_tables_v5';
const STORAGE_KEY_PAYOUT = 'nfcresto_payout_config_v5';
const STORAGE_KEY_SHOW_DEMO = 'nfcresto_show_demo_v5';
const STORAGE_KEY_EMAIL_LOGS = 'nfcresto_email_logs_v5';
const STORAGE_KEY_FAQS = 'nfcresto_faqs_v5';
const STORAGE_KEY_TIP_SHARING = 'nfcresto_tip_sharing_v5';
const STORAGE_KEY_MANAGER_NOTIFS = 'nfcresto_manager_notifs_v5';

const getDemoViewFromUrl = (): 'dashboard' | 'server' | null => {
  const demoView = new URLSearchParams(window.location.search).get('demo');
  return demoView === 'dashboard' || demoView === 'server' ? demoView : null;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>(() => {
    const demoView = getDemoViewFromUrl();
    return demoView === 'server' ? 'server' : demoView === 'dashboard' ? 'demo' : 'landing';
  });
  const [isDemoMode, setIsDemoMode] = useState(() => getDemoViewFromUrl() !== null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [clientSimulatedDevice, setClientSimulatedDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [activeEmailModal, setActiveEmailModal] = useState<EmailLog | null>(null);
  const [notificationToast, setNotificationToast] = useState<EmailLog | null>(null);

  // Real-time Manager Toast Notifications state
  const [managerNotifications, setManagerNotifications] = useState<ManagerToastNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MANAGER_NOTIFS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeManagerToast, setActiveManagerToast] = useState<ManagerToastNotification | null>(null);

  const superAdminEmail = 'rahouabdallah27@gmail.com';

  // Toggle to show / hide demo restaurant (Le Bistro Parisien)
  const [showDemoAccount, setShowDemoAccount] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_DEMO);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Load provider payout settings (RIB, IBAN, nom)
  const [payoutConfig, setPayoutConfig] = useState<ProviderPayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAYOUT);
      return saved ? { ...DEFAULT_PROVIDER_PAYOUT, ...JSON.parse(saved) } : DEFAULT_PROVIDER_PAYOUT;
    } catch {
      return DEFAULT_PROVIDER_PAYOUT;
    }
  });

  // Load restaurants list (merging initial demo accounts if not already present)
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RESTAURANTS);
      if (saved) {
        const parsed: RestaurantConfig[] = JSON.parse(saved);
        const missing = INITIAL_RESTAURANTS.filter(init => !parsed.some(p => p.id === init.id));
        return [...parsed, ...missing];
      }
      return INITIAL_RESTAURANTS;
    } catch {
      return INITIAL_RESTAURANTS;
    }
  });

  // Email logs
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
      return saved ? JSON.parse(saved) : INITIAL_EMAIL_LOGS;
    } catch {
      return INITIAL_EMAIL_LOGS;
    }
  });

  // Filter visible restaurants according to showDemoAccount toggle
  const visibleRestaurants = useMemo(
    () => restaurants.filter(r => showDemoAccount || (r.id !== 'resto-demo' && r.id !== 'hotel-demo')),
    [restaurants, showDemoAccount]
  );

  const [currentRestaurantId, setCurrentRestaurantId] = useState<string>(() => {
    try {
      if (getDemoViewFromUrl()) {
        return 'resto-demo';
      }
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_RESTO);
      if (saved && restaurants.some(r => r.id === saved)) {
        return saved;
      }
      return restaurants[0]?.id || 'resto-demo';
    } catch {
      return 'resto-demo';
    }
  });

  // Ensure currentRestaurantId is valid when demo toggle changes
  useEffect(() => {
    if (!visibleRestaurants.some(r => r.id === currentRestaurantId)) {
      if (visibleRestaurants.length > 0) {
        setCurrentRestaurantId(visibleRestaurants[0].id);
      }
    }
  }, [showDemoAccount, visibleRestaurants, currentRestaurantId]);

  const [allWaiters, setAllWaiters] = useState<Waiter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WAITERS);
      if (saved) {
        const parsed: Waiter[] = JSON.parse(saved);
        const missing = INITIAL_WAITERS.filter(init => !parsed.some(p => p.id === init.id));
        return [...parsed, ...missing];
      }
      return INITIAL_WAITERS;
    } catch {
      return INITIAL_WAITERS;
    }
  });

  const [allReviews, setAllReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REVIEWS);
      if (saved) {
        const parsed: Review[] = JSON.parse(saved);
        const missing = INITIAL_REVIEWS.filter(init => !parsed.some(p => p.id === init.id));
        return [...parsed, ...missing];
      }
      return INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  const [allTables, setAllTables] = useState<TableItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABLES);
      if (saved) {
        const parsed: TableItem[] = JSON.parse(saved);
        const missing = INITIAL_TABLES.filter(init => !parsed.some(p => p.restaurantId === init.restaurantId && p.number === init.number));
        return [...parsed, ...missing];
      }
      return INITIAL_TABLES;
    } catch {
      return INITIAL_TABLES;
    }
  });

  const [allFaqs, setAllFaqs] = useState<FaqItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAQS);
      if (saved) {
        const parsed: FaqItem[] = JSON.parse(saved);
        const missing = INITIAL_FAQ_ITEMS.filter(init => !parsed.some(p => p.id === init.id));
        return [...parsed, ...missing];
      }
      return INITIAL_FAQ_ITEMS;
    } catch {
      return INITIAL_FAQ_ITEMS;
    }
  });

  // Automated Tip Sharing Rules by Restaurant
  const [tipSharingConfigs, setTipSharingConfigs] = useState<{ [restaurantId: string]: TipSharingConfig }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TIP_SHARING);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      'resto-demo': DEFAULT_TIP_SHARING_CONFIG,
      'hotel-demo': {
        ...DEFAULT_TIP_SHARING_CONFIG,
        waiterHours: {
          'waiter-alexandre': 39,
          'waiter-camille': 35,
          'waiter-maxime': 35,
          'waiter-sofia': 30
        },
        waiterCoefficients: {
          'waiter-alexandre': 1.2,
          'waiter-camille': 1.0,
          'waiter-maxime': 1.0,
          'waiter-sofia': 1.0
        }
      }
    };
  });

  // Active restaurant
  const restaurant = restaurants.find(r => r.id === currentRestaurantId) || visibleRestaurants[0] || INITIAL_RESTAURANTS[0];

  // Effet Miroir Métamorphique State (Mode Verre & Miroir de Glace Unifié)
  const [currentMirrorTheme, setCurrentMirrorTheme] = useState<MirrorThemeId>(() => {
    return restaurant?.mirrorTheme || 'ice_glass';
  });
  const [isSpecularMirrorActive, setIsSpecularMirrorActive] = useState<boolean>(() => {
    return restaurant?.mirrorSpecularMode ?? true;
  });
  const [isMirrorModalOpen, setIsMirrorModalOpen] = useState<boolean>(false);

  // Sync mirror theme with active restaurant
  useEffect(() => {
    if (restaurant?.mirrorTheme) {
      setCurrentMirrorTheme(restaurant.mirrorTheme);
    }
    if (typeof restaurant?.mirrorSpecularMode === 'boolean') {
      setIsSpecularMirrorActive(restaurant.mirrorSpecularMode);
    }
  }, [currentRestaurantId, restaurant?.mirrorTheme, restaurant?.mirrorSpecularMode]);

  // Apply mirror theme to DOM instantly on change
  useEffect(() => {
    applyMirrorThemeToDom(currentMirrorTheme, isSpecularMirrorActive);
  }, [currentMirrorTheme, isSpecularMirrorActive]);

  const setMirrorTheme = (theme: MirrorThemeId) => {
    setCurrentMirrorTheme(theme);
    updateRestaurant({ mirrorTheme: theme });
  };

  // Active Display Currency (EUR, DZD, TND, MAD, USD, GBP...)
  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    return restaurant?.currency || 'EUR';
  });

  useEffect(() => {
    if (restaurant?.currency) {
      setDisplayCurrency(restaurant.currency);
    }
  }, [currentRestaurantId, restaurant?.currency]);

  const tipSharingConfig: TipSharingConfig =
    tipSharingConfigs[currentRestaurantId] || restaurant.tipSharingConfig || DEFAULT_TIP_SHARING_CONFIG;

  // Scoped lists for active restaurant
  const currentWaiters = useMemo(
    () => allWaiters.filter(waiter => waiter.restaurantId === currentRestaurantId),
    [allWaiters, currentRestaurantId]
  );
  const currentReviews = useMemo(
    () => allReviews.filter(review => review.restaurantId === currentRestaurantId),
    [allReviews, currentRestaurantId]
  );
  const currentTables = useMemo(
    () => allTables.filter(table => table.restaurantId === currentRestaurantId),
    [allTables, currentRestaurantId]
  );
  const currentFaqs = useMemo(() => {
    const restaurantFaqs = allFaqs.filter(faq => faq.restaurantId === currentRestaurantId);
    return (restaurantFaqs.length > 0
      ? restaurantFaqs
      : allFaqs.filter(faq => faq.restaurantId === 'resto-demo')
    ).sort((a, b) => a.order - b.order);
  }, [allFaqs, currentRestaurantId]);
  const currentManagerNotifications = useMemo(
    () => managerNotifications.filter(notification => notification.restaurantId === currentRestaurantId),
    [managerNotifications, currentRestaurantId]
  );

  const [selectedWaiterId, setSelectedWaiterId] = useState<string>(() => {
    return currentWaiters[0]?.id || 'waiter-david';
  });

  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(() => {
    return currentTables[0]?.number || 3;
  });

  // Update selected waiter when restaurant changes
  useEffect(() => {
    if (currentWaiters.length > 0 && !currentWaiters.some(w => w.id === selectedWaiterId)) {
      setSelectedWaiterId(currentWaiters[0].id);
    }
  }, [currentRestaurantId, currentWaiters, selectedWaiterId]);

  // Update selected table / room when restaurant changes
  useEffect(() => {
    if (currentTables.length > 0 && !currentTables.some(t => t.number === selectedTableNumber)) {
      setSelectedTableNumber(currentTables[0].number);
    }
  }, [currentRestaurantId, currentTables, selectedTableNumber]);

  // Sync state to local storage
  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_RESTAURANTS, JSON.stringify(restaurants));
  }, [restaurants, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_CURRENT_RESTO, currentRestaurantId);
  }, [currentRestaurantId, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_SHOW_DEMO, JSON.stringify(showDemoAccount));
  }, [showDemoAccount, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(emailLogs));
  }, [emailLogs, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_WAITERS, JSON.stringify(allWaiters));
  }, [allWaiters, isDemoMode]);

  const allReviewsRef = useRef(allReviews);
  const hasMountedReviews = useRef(false);

  useEffect(() => {
    allReviewsRef.current = allReviews;
    if (isDemoMode) return;
    if (!hasMountedReviews.current) {
      hasMountedReviews.current = true;
      return;
    }

    let timeoutId: number | undefined;
    let idleCallbackId: number | undefined;
    const persistReviews = () => {
      try {
        localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(allReviewsRef.current));
      } catch (error) {
        console.error('Les avis n’ont pas pu être enregistrés sur cet appareil.', error);
      }
    };
    const persistBeforePageHide = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleCallbackId !== undefined) window.cancelIdleCallback(idleCallbackId);
      persistReviews();
    };

    timeoutId = window.setTimeout(() => {
      const requestIdleCallback = Reflect.get(window, 'requestIdleCallback') as
        typeof window.requestIdleCallback | undefined;
      if (requestIdleCallback) {
        idleCallbackId = requestIdleCallback.call(window, persistReviews, { timeout: 1000 });
      } else {
        timeoutId = window.setTimeout(persistReviews, 0);
      }
    }, 100);
    window.addEventListener('pagehide', persistBeforePageHide);

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleCallbackId !== undefined) window.cancelIdleCallback(idleCallbackId);
      window.removeEventListener('pagehide', persistBeforePageHide);
    };
  }, [allReviews, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(allTables));
  }, [allTables, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_FAQS, JSON.stringify(allFaqs));
  }, [allFaqs, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    localStorage.setItem(STORAGE_KEY_MANAGER_NOTIFS, JSON.stringify(managerNotifications));
  }, [managerNotifications, isDemoMode]);

  const addManagerNotification = (notifData: Omit<ManagerToastNotification, 'id' | 'createdAt' | 'read'>): ManagerToastNotification => {
    const newNotif: ManagerToastNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      read: false
    };

    setManagerNotifications(prev => [newNotif, ...prev]);

    // Only popup on screen if it matches the current restaurant's isolated dashboard
    if (notifData.restaurantId === currentRestaurantId) {
      setActiveManagerToast(newNotif);
      try {
        soundFX.playNotificationAlert();
      } catch {
        // ignore
      }
    }

    return newNotif;
  };

  const dismissManagerNotification = (id: string) => {
    setActiveManagerToast(prev => (prev?.id === id ? null : prev));
  };

  const clearAllManagerNotifications = () => {
    setManagerNotifications([]);
    setActiveManagerToast(null);
  };

  const markNotificationAsRead = (id: string) => {
    setManagerNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const addFaqItem = (itemData: Omit<FaqItem, 'id' | 'restaurantId'>) => {
    const newItem: FaqItem = {
      ...itemData,
      id: `faq-${Date.now().toString(36)}`,
      restaurantId: currentRestaurantId,
      updatedAt: new Date().toISOString()
    };
    setAllFaqs(prev => [...prev, newItem]);
    soundFX.playSuccessChime();
  };

  const updateFaqItem = (id: string, updates: Partial<FaqItem>) => {
    setAllFaqs(prev =>
      prev.map(f => (f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f))
    );
    soundFX.playSuccessChime();
  };

  const deleteFaqItem = (id: string) => {
    setAllFaqs(prev => prev.filter(f => f.id !== id));
    soundFX.playHoverTick();
  };

  const resetFaqItems = () => {
    setAllFaqs(INITIAL_FAQ_ITEMS);
    soundFX.playSuccessChime();
  };

  const switchToEstablishment = (id: string) => {
    setCurrentRestaurantId(id);
    soundFX.playSuccessChime();
  };

  const updateRestaurant = (updates: Partial<RestaurantConfig>) => {
    setRestaurants(prev =>
      prev.map(r => (r.id === currentRestaurantId ? { ...r, ...updates } : r))
    );
    soundFX.playSuccessChime();
  };

  const updateRestaurantGoogleUrl = (url: string) => {
    updateRestaurant({ googleReviewUrl: url });
  };

  // Real-time NFC Chip Scan Alert State
  const [lastScannedChipAlert, setLastScannedChipAlert] = useState<RegisteredNfcChip | null>(null);

  const registeredNfcChips: RegisteredNfcChip[] = restaurant?.registeredNfcChips || [
    {
      id: 'chip-david',
      uid: '04:A2:8B:19:64:30:80',
      customName: 'Puce Serveur David (Porte-Clé)',
      restaurantId: restaurant?.id || 'resto-demo',
      restaurantName: restaurant?.name || 'Le Bistro Parisien',
      targetType: 'server',
      targetId: 'waiter-david',
      assignedWaiterId: 'waiter-david',
      assignedTableNumbers: [1, 2, 3, 4],
      targetName: 'David M. (Serveur)',
      payloadUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/?resto=${restaurant?.slug || 'bistro-parisien'}&server=waiter-david`,
      status: 'active',
      encodedAt: '2025-01-15T12:00:00.000Z',
      totalScans: 28
    },
    {
      id: 'chip-table-4',
      uid: '04:F8:3C:99:12:44:80',
      customName: 'Puce Chevalet Table N°4',
      restaurantId: restaurant?.id || 'resto-demo',
      restaurantName: restaurant?.name || 'Le Bistro Parisien',
      targetType: 'table',
      targetId: '4',
      assignedTableNumbers: [4],
      targetName: restaurant?.establishmentType === 'hotel' ? 'Chambre / Suite 4' : 'Table N°4',
      payloadUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/?resto=${restaurant?.slug || 'bistro-parisien'}&table=4`,
      status: 'active',
      encodedAt: '2025-01-16T14:30:00.000Z',
      totalScans: 14
    }
  ];

  const registerNfcChip = (chipData: Omit<RegisteredNfcChip, 'id' | 'encodedAt'>): RegisteredNfcChip => {
    const newChip: RegisteredNfcChip = {
      ...chipData,
      restaurantId: chipData.restaurantId || currentRestaurantId,
      restaurantName: chipData.restaurantName || restaurant.name,
      id: `chip-${Date.now().toString(36)}`,
      encodedAt: new Date().toISOString(),
      totalScans: 1
    };

    setRestaurants(prev =>
      prev.map(r => {
        if (r.id === currentRestaurantId) {
          const existing = r.registeredNfcChips || registeredNfcChips;
          const filtered = existing.filter(c => c.uid !== chipData.uid);
          return {
            ...r,
            registeredNfcChips: [newChip, ...filtered]
          };
        }
        return r;
      })
    );
    soundFX.playSuccessChime();
    setLastScannedChipAlert(newChip);
    return newChip;
  };

  const updateNfcChip = (chipId: string, updates: Partial<RegisteredNfcChip>) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id === currentRestaurantId) {
          const existing = r.registeredNfcChips || registeredNfcChips;
          return {
            ...r,
            registeredNfcChips: existing.map(c => (c.id === chipId ? { ...c, ...updates } : c))
          };
        }
        return r;
      })
    );
    soundFX.playSuccessChime();
  };

  const deleteNfcChip = (chipId: string) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id === currentRestaurantId) {
          const existing = r.registeredNfcChips || registeredNfcChips;
          return {
            ...r,
            registeredNfcChips: existing.filter(c => c.id !== chipId)
          };
        }
        return r;
      })
    );
    soundFX.playHoverTick();
  };

  const triggerNfcChipScan = (uid: string): RegisteredNfcChip | null => {
    const found = registeredNfcChips.find(c => c.uid.toLowerCase() === uid.toLowerCase());
    if (found) {
      const updated = {
        ...found,
        lastScannedAt: new Date().toISOString(),
        totalScans: (found.totalScans || 0) + 1
      };
      updateNfcChip(found.id, updated);
      setLastScannedChipAlert(updated);
      soundFX.playSuccessChime();
      return updated;
    } else {
      // Auto-register newly detected tag
      const defaultWaiter = allWaiters.find(w => w.restaurantId === currentRestaurantId) || allWaiters[0];
      const newlyCreated = registerNfcChip({
        uid,
        customName: `Puce NFC Détectée (${uid.slice(-5)})`,
        restaurantId: currentRestaurantId,
        restaurantName: restaurant.name,
        targetType: 'server',
        targetId: defaultWaiter?.id || 'waiter-1',
        targetName: defaultWaiter?.name || 'Serveur',
        assignedWaiterId: defaultWaiter?.id || 'waiter-1',
        assignedTableNumbers: [1],
        payloadUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/?resto=${restaurant.slug}&server=${defaultWaiter?.id || 'waiter-1'}&nfc=${encodeURIComponent(uid)}`,
        status: 'active'
      });
      setLastScannedChipAlert(newlyCreated);
      return newlyCreated;
    }
  };

  const updateTipSharingConfig = (updates: Partial<TipSharingConfig>) => {
    const updated: TipSharingConfig = {
      ...tipSharingConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    setTipSharingConfigs(prev => {
      const next = { ...prev, [currentRestaurantId]: updated };
      if (!isDemoMode) {
        localStorage.setItem(STORAGE_KEY_TIP_SHARING, JSON.stringify(next));
      }
      return next;
    });
    setRestaurants(prev =>
      prev.map(r => (r.id === currentRestaurantId ? { ...r, tipSharingConfig: updated } : r))
    );
    soundFX.playSuccessChime();
  };

  const tipDistribution = useMemo(() => {
    return calculateTipDistribution(tipSharingConfig, currentWaiters, currentReviews, currentTables);
  }, [tipSharingConfig, currentWaiters, currentReviews, currentTables]);

  const deleteRestaurant = (restoId: string) => {
    setRestaurants(prev => prev.filter(r => r.id !== restoId));
    setAllWaiters(prev => prev.filter(w => w.restaurantId !== restoId));
    setAllReviews(prev => prev.filter(r => r.restaurantId !== restoId));
    setAllTables(prev => prev.filter(t => t.restaurantId !== restoId));
    
    // Switch to another restaurant
    const remaining = restaurants.filter(r => r.id !== restoId);
    if (remaining.length > 0) {
      setCurrentRestaurantId(remaining[0].id);
    }
  };

  const updateHardwareStatus = (restoId: string, status: HardwareStatus) => {
    setRestaurants(prev =>
      prev.map(r => (r.id === restoId ? { ...r, hardwareStatus: status } : r))
    );
  };

  const sendOnboardingEmail = (resto: RestaurantConfig, customEmail?: string): EmailLog => {
    const dashboardUrl = `${window.location.origin}/?resto=${resto.slug}&view=manager`;
    const targetEmail = customEmail || resto.email || `${resto.slug}@restaurant.fr`;
    const randTrack = `CP${Math.floor(100000000 + Math.random() * 900000000)}FR`;
    const randTx = `pi_${Math.random().toString(36).substring(2, 11)}_secret`;

    const newEmail: EmailLog = {
      id: `mail-${Date.now()}`,
      to: targetEmail,
      restaurantId: resto.id,
      restaurantName: resto.name,
      ownerName: resto.ownerName,
      slug: resto.slug,
      pin: resto.accessPin || '2025',
      dashboardUrl,
      subject: `🎉 [Digifeel] Vos Identifiants & Activation du Pack NFC (100 €) - ${resto.name}`,
      sentAt: new Date().toISOString(),
      status: 'delivered',
      chipsCount: 5,
      qrCount: resto.tableCount || 10,
      paymentAmount: resto.setupKitCost || 100,
      invoiceNumber: `FAC-NFC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionId: randTx,
      shippingPreference: resto.shippingPreference || 'on_site',
      trackingNumber: randTrack,
      smtpServer: 'Digifeel Enterprise SES / TLS 1.3 Relay',
      tlsVersion: 'TLSv1.3 (256-bit AES GCM)',
      dkimStatus: 'PASS (signature verified digifeel.io)'
    };

    setEmailLogs(prev => [newEmail, ...prev]);
    setNotificationToast(newEmail);

    try {
      soundFX.playNotificationAlert();
    } catch {
      // ignore
    }

    return newEmail;
  };

  const createRestaurant = (newRestoData: Omit<RestaurantConfig, 'id'>): RestaurantConfig => {
    const newId = `resto-${Date.now().toString(36)}`;
    const newResto: RestaurantConfig = {
      ...newRestoData,
      id: newId,
      hardwareStatus: 'pending_encoding',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setRestaurants(prev => [...prev, newResto]);
    setCurrentRestaurantId(newId);

    // Seed default tables / rooms for the new establishment
    const isHotel = newResto.establishmentType === 'hotel';
    const newTables: TableItem[] = Array.from({ length: newResto.tableCount || 10 }, (_, i) => ({
      number: isHotel ? 100 + i + 1 : i + 1,
      restaurantId: newId,
      zone: isHotel
        ? (i < 6 ? '1er Étage - Chambres' : i < 12 ? '2e Étage - Suites' : '3e Étage - Penthouses')
        : (i < 5 ? 'Salle Principale' : 'Terrasse'),
      totalScans: 0,
      lastRating: 5.0
    }));

    setAllTables(prev => [...prev, ...newTables]);

    // Seed default staff for the NFC chips as requested by the user
    const defaultStaff = isHotel
      ? [
          { name: newResto.ownerName || 'Directeur Général', role: 'Directeur d\'Hôtel' },
          { name: 'Conciergerie', role: 'Chef Concierge Clefs d\'Or' },
          { name: 'Réception & Guest', role: 'Responsable Réception' },
          { name: 'Room Service & Bar', role: 'Responsable Room Service' },
          { name: 'Gouvernante', role: 'Gouvernante Principale d\'Étage' }
        ]
      : [
          { name: 'Hamza', role: 'Chef de rang & Service' },
          { name: 'Rayan', role: 'Serveur principal salle' },
          { name: 'Abdou', role: 'Barman & Mixologue' },
          { name: 'Lucas', role: 'Chef de rang terrasse' },
          { name: newResto.ownerName || 'Gérant Principal', role: 'Directeur de salle' }
        ];

    const newWaitersList: Waiter[] = defaultStaff.map((staff, idx) => ({
      id: `waiter-${newId}-${idx + 1}`,
      restaurantId: newId,
      name: staff.name,
      role: staff.role,
      nfcUid: `04:${(160 + idx * 17).toString(16).toUpperCase()}:2A:B1:${(10 + idx * 22).toString(16).toUpperCase()}:6D:80`,
      tablesAssigned: isHotel
        ? [100 + idx * 2 + 1, 100 + idx * 2 + 2]
        : [idx * 3 + 1, idx * 3 + 2, idx * 3 + 3],
      ratingAverage: 5.0,
      totalReviews: 2 + idx,
      totalTips: (idx + 1) * 250,
      joinedDate: new Date().toISOString().split('T')[0]
    }));

    setAllWaiters(prev => [...prev, ...newWaitersList]);
    setSelectedWaiterId(newWaitersList[0].id);

    // Seed NFC Chips with names and server assignments
    const initialChipsForResto: RegisteredNfcChip[] = newWaitersList.map((waiter, idx) => {
      const safeUid = waiter.nfcUid || `04:${(160 + idx * 17).toString(16).toUpperCase()}:2A:B1:${(10 + idx * 22).toString(16).toUpperCase()}:6D:80`;
      return {
        id: `chip-${newId}-${idx + 1}`,
        uid: safeUid,
        customName: `Puce NFC ${waiter.name} (Porte-Clé)`,
        restaurantId: newId,
        restaurantName: newResto.name,
        targetType: 'server',
        targetId: waiter.id,
        assignedWaiterId: waiter.id,
        assignedTableNumbers: waiter.tablesAssigned,
        targetName: `${waiter.name} (${waiter.role})`,
        payloadUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/?resto=${newResto.slug}&server=${waiter.id}&nfc=${encodeURIComponent(safeUid)}`,
        status: 'active',
        encodedAt: new Date().toISOString(),
        totalScans: 1
      };
    });

    // Add table chip
    initialChipsForResto.push({
      id: `chip-${newId}-table-1`,
      uid: `04:E1:99:44:88:12:80`,
      customName: 'Puce Chevalet Table N°1',
      restaurantId: newId,
      restaurantName: newResto.name,
      targetType: 'table',
      targetId: '1',
      assignedTableNumbers: [1],
      targetName: 'Table N°1',
      payloadUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/?resto=${newResto.slug}&table=1`,
      status: 'active',
      encodedAt: new Date().toISOString(),
      totalScans: 1
    });

    setRestaurants(prev =>
      prev.map(r => (r.id === newId ? { ...r, registeredNfcChips: initialChipsForResto } : r))
    );

    // Automatically trigger Onboarding Confirmation Email
    const generatedEmail = sendOnboardingEmail(newResto);
    setActiveEmailModal(generatedEmail);

    return newResto;
  };

  const addWaiter = (name: string, role: string, tablesAssigned: number[]) => {
    const newId = `waiter-${Date.now().toString(36)}`;
    const newWaiter: Waiter = {
      id: newId,
      restaurantId: currentRestaurantId,
      name,
      role,
      nfcUid: `NFC-${name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      tablesAssigned,
      ratingAverage: 5.0,
      totalReviews: 0,
      totalTips: 0,
      joinedDate: new Date().toISOString().split('T')[0]
    };
    setAllWaiters(prev => [...prev, newWaiter]);
  };

  const addReview = (reviewData: Omit<Review, 'id' | 'createdAt'>) => {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setAllReviews(prev => [newReview, ...prev]);

    let waiterReviewCount = 0;
    let waiterRatingTotal = 0;
    for (const review of allReviews) {
      if (review.waiterId === reviewData.waiterId) {
        waiterReviewCount += 1;
        waiterRatingTotal += review.rating;
      }
    }

    setAllWaiters(prev =>
      prev.map(w => {
        if (w.id === reviewData.waiterId) {
          const totalReviews = waiterReviewCount + 1;
          const avg = (waiterRatingTotal + newReview.rating) / totalReviews;
          return {
            ...w,
            totalReviews,
            ratingAverage: Number(avg.toFixed(1)),
            totalTips: w.totalTips + (reviewData.tipAmount || 0)
          };
        }
        return w;
      })
    );

    // Update table scans
    setAllTables(prev =>
      prev.map(t => {
        if (t.restaurantId === currentRestaurantId && t.number === reviewData.tableNumber) {
          return {
            ...t,
            totalScans: t.totalScans + 1,
            lastRating: reviewData.rating
          };
        }
        return t;
      })
    );

    // Trigger real-time manager toast notification
    const targetResto = restaurants.find(r => r.id === reviewData.restaurantId) || restaurant;
    const notifType: ManagerNotificationType =
      (reviewData.tipAmount || 0) > 0 && reviewData.rating > 0
        ? 'review_and_tip'
        : (reviewData.tipAmount || 0) > 0
        ? 'new_tip'
        : 'new_review';

    addManagerNotification({
      type: notifType,
      restaurantId: reviewData.restaurantId,
      restaurantName: targetResto.name,
      waiterId: reviewData.waiterId,
      waiterName: reviewData.waiterName,
      tableNumber: reviewData.tableNumber,
      rating: reviewData.rating,
      tipAmount: reviewData.tipAmount || 0,
      compliments: reviewData.compliments || [],
      comment: reviewData.comment,
      photoUrl: reviewData.photoUrl
    });

  };

  const updatePayoutConfig = (cfg: Partial<ProviderPayoutConfig>) => {
    setPayoutConfig(prev => {
      const updated = { ...prev, ...cfg };
      try {
        if (!isDemoMode) {
          localStorage.setItem(STORAGE_KEY_PAYOUT, JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetToDefaults = () => {
    setRestaurants(INITIAL_RESTAURANTS);
    setAllWaiters(INITIAL_WAITERS);
    setAllReviews(INITIAL_REVIEWS);
    setAllTables(INITIAL_TABLES);
    setAllFaqs(INITIAL_FAQ_ITEMS);
    setEmailLogs(INITIAL_EMAIL_LOGS);
    setShowDemoAccount(true);
    setCurrentRestaurantId(INITIAL_RESTAURANTS[0].id);
  };

  const getRestaurantDashboardUrl = (restoId: string) => {
    const target = restaurants.find(r => r.id === restoId) || restaurant;
    return `${window.location.origin}/?resto=${target.slug}&view=manager`;
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        isDemoMode,
        setIsDemoMode,
        showDemoAccount,
        setShowDemoAccount,
        superAdminEmail,
        restaurants,
        visibleRestaurants,
        currentRestaurantId,
        setCurrentRestaurantId,
        switchToEstablishment,
        restaurant,
        updateRestaurant,
        updateRestaurantGoogleUrl,
        createRestaurant,
        deleteRestaurant,
        currentMirrorTheme,
        setMirrorTheme,
        isSpecularMirrorActive,
        setIsSpecularMirrorActive: (active: boolean) => {
          setIsSpecularMirrorActive(active);
          updateRestaurant({ mirrorSpecularMode: active });
        },
        isMirrorModalOpen,
        setIsMirrorModalOpen,
        registeredNfcChips,
        registerNfcChip,
        updateNfcChip,
        deleteNfcChip,
        lastScannedChipAlert,
        setLastScannedChipAlert,
        triggerNfcChipScan,
        waiters: currentWaiters,
        addWaiter,
        selectedWaiterId,
        setSelectedWaiterId,
        selectedTableNumber,
        setSelectedTableNumber,
        reviews: currentReviews,
        tables: currentTables,
        addReview,
        managerNotifications: currentManagerNotifications,
        activeManagerToast,
        setActiveManagerToast,
        addManagerNotification,
        dismissManagerNotification,
        clearAllManagerNotifications,
        markNotificationAsRead,
        tipSharingConfig,
        updateTipSharingConfig,
        tipDistribution,
        faqItems: currentFaqs,
        addFaqItem,
        updateFaqItem,
        deleteFaqItem,
        resetFaqItems,
        displayCurrency,
        setDisplayCurrency,
        isOrderModalOpen,
        setIsOrderModalOpen,
        payoutConfig,
        updatePayoutConfig,
        isPayoutModalOpen,
        setIsPayoutModalOpen,
        resetToDefaults,
        clientSimulatedDevice,
        setClientSimulatedDevice,
        emailLogs,
        sendOnboardingEmail,
        activeEmailModal,
        setActiveEmailModal,
        notificationToast,
        setNotificationToast,
        updateHardwareStatus,
        getRestaurantDashboardUrl
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
