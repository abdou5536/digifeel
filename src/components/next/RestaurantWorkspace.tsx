'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine, ArrowLeft, BadgeCheck, BarChart3, Bell, BookOpenCheck, Boxes, Check, ChevronDown,
  CircleAlert, ClipboardList, Clock3, Copy, CreditCard, FileSpreadsheet, FileText, HelpCircle, LayoutDashboard, Menu,
  Minus, Pencil, Plus, QrCode, Search, Settings2, ShoppingBag, Star, Store, Table2, Trash2, Users, Utensils, Wallet, Wifi
} from 'lucide-react';
import { PwaInstallButton } from './PwaInstallButton';
import { ThemePicker } from './ThemePicker';
import { StarBonusCard } from './StarBonusCard';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import QRCode from 'qrcode';
import { useLanguage } from './LanguageProvider';
import {
  acceptGuestOrder, acknowledgeAlert, addItem, advanceOrder, billTotals, createBill, createWaiter, deleteMenuItem,
  getDashboardData, getMenu, getRestaurantData, getSelectedRestaurantId, getTables, getWaiters, isDemoModeEnabled,
  loadPalmierDemo, markReviewTreated, payBill, publishBill, recordNotificationSimulation, rejectGuestOrder,
  removeBillLine, requestBill, selectRestaurant, setQuickTotal, subscribeRestaurantData, toggleMenuItem, toggleTableTag,
  updateBillLine, updateBillWaiter, updateRestaurant, updateWaiter, updateWaiterPermissions, upsertCategory, upsertMenuItem, upsertTable,
  type Bill, type MenuCategory, type MenuItem, type RestaurantAccount, type RestaurantData, type RestaurantReview, type RestaurantTable, type RestaurantUser
} from '@/src/services/restaurant';

type Section = 'home' | 'room' | 'reviews' | 'team' | 'management';
type Locale = 'fr' | 'ar' | 'en';
type WorkspaceCopy = { [Key in keyof typeof copy.fr]: string };

const copy = {
  fr: {
    home: 'Accueil', room: 'Salle', reviews: 'Avis', team: 'Serveurs', management: 'Gestion',
    workspace: 'Espace restaurant', demo: 'Charger Le Palmier', demoOn: 'Données démo chargées',
    today: 'Aujourd’hui', revenue: 'Chiffre d’affaires', basket: 'Panier moyen', average: 'Note moyenne', monthReviews: 'Avis ce mois',
    scans: 'Scans du jour', tips: 'Pourboires', paidBills: 'additions réglées', activity: 'Activité sur 14 jours', topProducts: 'Produits les plus vendus',
    peakHours: 'Heures de pointe', alerts: 'Avis à traiter', viewAll: 'Voir tous les avis', handled: 'Marquer comme traité',
    allTables: 'Toutes les tables', free: 'Libre', occupied: 'Occupée', serverCalled: 'Serveur appelé', requested: 'Addition demandée', paid: 'Payée',
    openTable: 'Ouvrir la table', waiter: 'Serveur', chooseWaiter: 'Choisir un serveur', addToBill: 'Ajouter à l’addition',
    searchDish: 'Rechercher un plat', quickTotal: 'Total rapide', applyTotal: 'Appliquer ce total', discount: 'Remise (%)',
    sendBill: 'Envoyer l’addition au client', sendHint: 'Elle sera visible dès le scan de la puce.', cashPayment: 'Encaisser manuellement',
    terminal: 'Carte au terminal', cash: 'Espèces', bill: 'Addition', subtotal: 'Sous-total HT', tax: 'TVA', total: 'Total TTC',
    emptyBill: 'Aucune ligne. Ajoutez un plat ou utilisez le total rapide.', note: 'Note de préparation', remove: 'Retirer',
    search: 'Rechercher un avis', rating: 'Toutes les notes', period: 'Période', serverFilter: 'Tous les serveurs',
    unhandled: 'À traiter', all: 'Tous', treated: 'Traités', noReviews: 'Aucun avis ne correspond à ces filtres.',
    newWaiter: 'Ajouter un serveur', name: 'Nom', role: 'Fonction', add: 'Ajouter', cancel: 'Annuler', active: 'Actif',
    reviewsCount: 'avis', turnover: 'CA réalisé', qr: 'QR serveur', noWaiter: 'Aucun serveur pour le moment.',
    restaurantSettings: 'Paramètres du restaurant', googleLink: 'Lien Google Avis', city: 'Ville', address: 'Adresse',
    currency: 'Devise', vat: 'TVA par défaut (%)', logo: 'Logo (URL)', save: 'Enregistrer les réglages', saved: 'Réglages enregistrés.',
    menu: 'Menu et tarifs', category: 'Catégorie', product: 'Produit', price: 'Prix', availability: 'Disponibilité',
    available: 'Disponible', unavailable: 'Indisponible', newCategory: 'Nouvelle catégorie', newProduct: 'Ajouter un produit',
    tablesTags: 'Tables et puces', addTable: 'Ajouter une table', tag: 'Code de puce', disable: 'Désactiver', enable: 'Réactiver',
    subscription: 'Abonnement', trialing: 'Mois offert', activeSub: 'Actif', suspended: 'Suspendu',
    exports: 'Exports et rapports', exportExcel: 'Télécharger Excel', exportPdf: 'Télécharger rapport PDF',
    exportLocked: 'Les exports sont réservés aux restaurants abonnés.', subscribe: 'Découvrir l’abonnement',
    info: 'Information importante', certification: 'Ce logiciel n’est pas certifié NF525. Le ticket fourni est un justificatif d’information et ne remplace pas un ticket fiscal certifié.',
    simulator: 'Paiement simulé', paymentRecorded: 'Paiement enregistré.', selectTable: 'Choisissez une table sur le plan.',
    chooseProduct: 'Choisir une catégorie', quickMode: 'Montant total TTC', newBill: 'Nouvelle addition', close: 'Fermer',
    table: 'Table', euro: 'Euro', dinar: 'Dinar algérien', france: 'France', algeria: 'Algérie',
    roleServer: 'Vue serveur', roleAdmin: 'Vue gérant', startDemo: 'Mode démonstration', noData: 'Aucune donnée',
    oneStar: '1 étoile', twoStars: '2 étoiles', last7: '7 derniers jours', last30: '30 derniers jours', thisMonth: 'Ce mois', todayOnly: 'Aujourd’hui',
    enterName: 'Saisissez un nom valide.', login: 'Connexion', clientPage: 'Page client', adminPage: 'Super-admin'
  },
  ar: {
    home: 'الرئيسية', room: 'القاعة', reviews: 'الآراء', team: 'النادلون', management: 'الإدارة',
    workspace: 'مساحة المطعم', demo: 'تحميل بيانات النخيل', demoOn: 'تم تحميل بيانات العرض',
    today: 'اليوم', revenue: 'رقم الأعمال', basket: 'متوسط الفاتورة', average: 'متوسط التقييم', monthReviews: 'آراء هذا الشهر',
    scans: 'المسح اليوم', tips: 'الإكراميات', paidBills: 'فواتير مدفوعة', activity: 'النشاط خلال 14 يوماً', topProducts: 'الأطباق الأكثر طلباً',
    peakHours: 'ساعات الذروة', alerts: 'آراء تحتاج للمتابعة', viewAll: 'عرض كل الآراء', handled: 'تمت المعالجة',
    allTables: 'كل الطاولات', free: 'متاحة', occupied: 'مشغولة', serverCalled: 'تم استدعاء النادل', requested: 'الفاتورة مطلوبة', paid: 'مدفوعة',
    openTable: 'فتح الطاولة', waiter: 'النادل', chooseWaiter: 'اختر نادلاً', addToBill: 'إضافة إلى الفاتورة',
    searchDish: 'ابحث عن طبق', quickTotal: 'مبلغ سريع', applyTotal: 'اعتماد المبلغ', discount: 'خصم (%)',
    sendBill: 'إرسال الفاتورة للزبون', sendHint: 'ستظهر عند مسح الشريحة.', cashPayment: 'تسجيل الدفع يدوياً',
    terminal: 'بطاقة عبر الجهاز', cash: 'نقداً', bill: 'الفاتورة', subtotal: 'المجموع دون الضريبة', tax: 'الضريبة', total: 'المجموع شامل الضريبة',
    emptyBill: 'لا توجد منتجات. أضف طبقاً أو أدخل المبلغ.', note: 'ملاحظة التحضير', remove: 'حذف',
    search: 'ابحث عن رأي', rating: 'كل التقييمات', period: 'الفترة', serverFilter: 'كل النادلين',
    unhandled: 'تحتاج معالجة', all: 'الكل', treated: 'تمت المعالجة', noReviews: 'لا توجد آراء مطابقة.',
    newWaiter: 'إضافة نادل', name: 'الاسم', role: 'الوظيفة', add: 'إضافة', cancel: 'إلغاء', active: 'نشط',
    reviewsCount: 'آراء', turnover: 'المبيعات', qr: 'رمز النادل', noWaiter: 'لا يوجد نادلون حالياً.',
    restaurantSettings: 'إعدادات المطعم', googleLink: 'رابط تقييم Google', city: 'المدينة', address: 'العنوان',
    currency: 'العملة', vat: 'الضريبة الافتراضية (%)', logo: 'الشعار (رابط)', save: 'حفظ الإعدادات', saved: 'تم حفظ الإعدادات.',
    menu: 'قائمة الطعام والأسعار', category: 'القسم', product: 'المنتج', price: 'السعر', availability: 'التوفر',
    available: 'متوفر', unavailable: 'غير متوفر', newCategory: 'قسم جديد', newProduct: 'إضافة منتج',
    tablesTags: 'الطاولات والشرائح', addTable: 'إضافة طاولة', tag: 'رمز الشريحة', disable: 'تعطيل', enable: 'تفعيل',
    subscription: 'الاشتراك', trialing: 'شهر مجاني', activeSub: 'نشط', suspended: 'موقوف',
    exports: 'التقارير والتصدير', exportExcel: 'تنزيل Excel', exportPdf: 'تنزيل تقرير PDF',
    exportLocked: 'التصدير متاح للمطاعم المشتركة فقط.', subscribe: 'عرض الاشتراك',
    info: 'معلومة مهمة', certification: 'هذا البرنامج غير معتمد NF525. الإيصال للاطلاع فقط ولا يعوض فاتورة ضريبية معتمدة.',
    simulator: 'دفع تجريبي', paymentRecorded: 'تم تسجيل الدفع.', selectTable: 'اختر طاولة من المخطط.',
    chooseProduct: 'اختر القسم', quickMode: 'المبلغ شامل الضريبة', newBill: 'فاتورة جديدة', close: 'إغلاق',
    table: 'طاولة', euro: 'يورو', dinar: 'دينار جزائري', france: 'فرنسا', algeria: 'الجزائر',
    roleServer: 'وضع النادل', roleAdmin: 'وضع المدير', startDemo: 'وضع العرض', noData: 'لا توجد بيانات',
    oneStar: 'نجمة واحدة', twoStars: 'نجمتان', last7: 'آخر 7 أيام', last30: 'آخر 30 يوماً', thisMonth: 'هذا الشهر', todayOnly: 'اليوم',
    enterName: 'أدخل اسماً صحيحاً.', login: 'الدخول', clientPage: 'صفحة الزبون', adminPage: 'الإدارة العامة'
  },
  en: {
    home: 'Overview', room: 'Floor', reviews: 'Reviews', team: 'Staff', management: 'Settings',
    workspace: 'Restaurant workspace', demo: 'Load Le Palmier demo', demoOn: 'Demo data loaded',
    today: 'Today', revenue: 'Revenue', basket: 'Average bill', average: 'Average rating', monthReviews: 'Reviews this month',
    scans: 'Scans today', tips: 'Tips', paidBills: 'paid bills', activity: '14-day activity', topProducts: 'Best sellers',
    peakHours: 'Peak hours', alerts: 'Reviews to follow up', viewAll: 'View all reviews', handled: 'Mark as handled',
    allTables: 'All tables', free: 'Free', occupied: 'Occupied', serverCalled: 'Server called', requested: 'Bill requested', paid: 'Paid',
    openTable: 'Open table', waiter: 'Waiter',     chooseWaiter: 'Choose a waiter', chooseProduct: 'Choose a category', addToBill: 'Add to bill',
    searchDish: 'Search menu', quickTotal: 'Quick total', applyTotal: 'Apply total', discount: 'Discount (%)',
    sendBill: 'Send bill to guest', sendHint: 'The bill appears after scanning the tag.', cashPayment: 'Record payment manually',
    terminal: 'Card terminal', cash: 'Cash', bill: 'Bill', subtotal: 'Subtotal excl. tax', tax: 'Tax', total: 'Total incl. tax',
    emptyBill: 'No items yet. Add a dish or enter a quick total.', note: 'Kitchen note', remove: 'Remove',
    search: 'Search reviews', rating: 'All ratings', period: 'Period', serverFilter: 'All staff',
    unhandled: 'To follow up', all: 'All', treated: 'Handled', noReviews: 'No reviews match these filters.',
    newWaiter: 'Add staff member', name: 'Name', role: 'Role', add: 'Add', cancel: 'Cancel', active: 'Active',
    reviewsCount: 'reviews', turnover: 'Revenue', qr: 'Staff QR', noWaiter: 'No staff yet.',
    restaurantSettings: 'Restaurant settings', googleLink: 'Google review link', city: 'City', address: 'Address',
    currency: 'Currency', vat: 'Default VAT (%)', logo: 'Logo (URL)', save: 'Save settings', saved: 'Settings saved.',
    menu: 'Menu and pricing', category: 'Category', product: 'Product', price: 'Price', availability: 'Availability',
    available: 'Available', unavailable: 'Unavailable', newCategory: 'New category', newProduct: 'Add product',
    tablesTags: 'Tables and tags', addTable: 'Add table', tag: 'Tag code', disable: 'Disable', enable: 'Enable',
    subscription: 'Subscription', trialing: 'Free month', activeSub: 'Active', suspended: 'Suspended',
    exports: 'Exports and reports', exportExcel: 'Download Excel', exportPdf: 'Download PDF report',
    exportLocked: 'Exports are available to subscribed restaurants.', subscribe: 'View subscription',
    info: 'Important information', certification: 'This software is not NF525-certified. Its receipt is informational only and is not a certified fiscal receipt.',
    simulator: 'Simulated payment', paymentRecorded: 'Payment recorded.', selectTable: 'Choose a table on the floor plan.',
    quickMode: 'Quick total incl. tax', newBill: 'New bill', close: 'Close',
    table: 'Table', euro: 'Euro', dinar: 'Algerian dinar', france: 'France', algeria: 'Algeria',
    roleServer: 'Staff view', roleAdmin: 'Manager view', startDemo: 'Demo mode', noData: 'No data',
    oneStar: '1 star', twoStars: '2 stars', last7: 'Last 7 days', last30: 'Last 30 days', thisMonth: 'This month', todayOnly: 'Today',
    enterName: 'Enter a valid name.', login: 'Sign in', clientPage: 'Guest page', adminPage: 'Super admin'
  }
} as const;

function formatMoney(value: number, currency: 'EUR' | 'DZD', locale: Locale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency', currency, maximumFractionDigits: currency === 'DZD' ? 0 : 2
  }).format(value);
}

function statusLabel(status: RestaurantTable['status'], t: WorkspaceCopy) {
  return status === 'free' ? t.free : status === 'occupied' ? t.occupied : status === 'server_called' ? t.serverCalled : status === 'bill_requested' ? t.requested : t.paid;
}

function sinceDays(date: string, days: number) {
  return Date.now() - new Date(date).getTime() <= days * 86400000;
}

function playWorkspaceAlert() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.frequency.value = 780;
    oscillator.type = 'triangle';
    volume.gain.setValueAtTime(0.0001, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.04);
    volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    oscillator.onended = () => { void context.close(); };
  } catch (error) {
    console.warn('Le son des alertes Digifeel n’est pas disponible.', error);
  }
}

export function RestaurantWorkspace({ startDemo = false, initialRole = 'admin_restaurant', initialWaiterId = '', initialRestaurantId = '' }: { startDemo?: boolean; initialRole?: 'admin_restaurant' | 'serveur'; initialWaiterId?: string; initialRestaurantId?: string }) {
  const { locale } = useLanguage();
  const [workspaceLocale, setWorkspaceLocale] = useState<Locale>('fr');
  const currentLocale = workspaceLocale;
  const t: WorkspaceCopy = copy[currentLocale];
  const [data, setData] = useState<RestaurantData | null>(null);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getDashboardData>>>(null);
  const [active, setActive] = useState<Section>('home');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedWaiterId, setSelectedWaiterId] = useState(initialWaiterId);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomCategory, setRoomCategory] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRating, setReviewRating] = useState('all');
  const [reviewPeriod, setReviewPeriod] = useState('30');
  const [reviewWaiter, setReviewWaiter] = useState('all');
  const [reviewStatus, setReviewStatus] = useState('all');
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newWaiterRole, setNewWaiterRole] = useState('');
  const [waiterFormOpen, setWaiterFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productTaxRate, setProductTaxRate] = useState('9');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [tableName, setTableName] = useState('');
  const [tableZone, setTableZone] = useState('Salle');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [currentRole, setCurrentRole] = useState<RestaurantUser['role']>(initialRole);
  const [period, setPeriod] = useState('30');
  const [stateRestaurant, setStateRestaurant] = useState<RestaurantAccount | null>(null);
  const menuFileRef = useRef<HTMLInputElement>(null);
  const knownAlertIds = useRef<Set<string> | null>(null);
  const [replySuggestions, setReplySuggestions] = useState<Record<string, { text: string; source: string }>>({});
  const [replyBusyId, setReplyBusyId] = useState('');
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('digifeel-app-locale');
    if (saved === 'ar' || saved === 'fr' || saved === 'en') setWorkspaceLocale(saved);
    else setWorkspaceLocale(locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = currentLocale;
    document.documentElement.dir = currentLocale === 'ar' ? 'rtl' : 'ltr';
    return () => {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    };
  }, [currentLocale, locale]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1') {
      setTourStep(0);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const refresh = useCallback(async () => {
    const nextData = await getRestaurantData();
    const selectedId = await getSelectedRestaurantId();
    const restaurant = nextData.restaurants.find(item => item.id === selectedId) ?? nextData.restaurants[0] ?? null;
    const nextAlertIds = new Set(nextData.alerts.filter(alert => alert.restaurantId === restaurant?.id && alert.status === 'new').map(alert => alert.id));
    if (knownAlertIds.current !== null && [...nextAlertIds].some(id => !knownAlertIds.current?.has(id))) playWorkspaceAlert();
    knownAlertIds.current = nextAlertIds;
    setData(nextData);
    setStateRestaurant(restaurant);
    if (restaurant) setDashboard(await getDashboardData(restaurant.id));
  }, []);

  useEffect(() => {
    let alive = true;
    const start = async () => {
      try {
        if (startDemo) await loadPalmierDemo();
        const nextData = await getRestaurantData();
        const storedRestaurantId = initialRestaurantId || await getSelectedRestaurantId();
        const restaurant = nextData.restaurants.find(item => item.id === storedRestaurantId) ?? nextData.restaurants[0] ?? null;
        if (restaurant) await selectRestaurant(restaurant.id);
        if (!alive) return;
        setData(nextData);
        setStateRestaurant(restaurant);
        if (restaurant) setDashboard(await getDashboardData(restaurant.id));
        setLoading(false);
      } catch (loadError) {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : 'Les données du restaurant sont indisponibles.');
          setLoading(false);
        }
      }
    };
    void start();
    const unsubscribe = subscribeRestaurantData(() => { void refresh(); });
    return () => { alive = false; unsubscribe(); };
  }, [initialRestaurantId, refresh, startDemo]);

  const restaurant = stateRestaurant;
  const waiters = useMemo(() => data?.users.filter(user => user.restaurantId === restaurant?.id && user.role === 'serveur') ?? [], [data, restaurant?.id]);
  const tables = useMemo(() => data?.tables.filter(table => table.restaurantId === restaurant?.id) ?? [], [data, restaurant?.id]);
  const categories = useMemo(() => data?.categories.filter(category => category.restaurantId === restaurant?.id).sort((a, b) => a.sortOrder - b.sortOrder) ?? [], [data, restaurant?.id]);
  const menuItems = useMemo(() => data?.items.filter(item => item.restaurantId === restaurant?.id) ?? [], [data, restaurant?.id]);
  const selectedTable = tables.find(table => table.id === selectedTableId) ?? null;
  const currentBill: Bill | null = data?.bills.find(bill => bill.id === selectedBillId) ?? null;
  const totals = currentBill && data ? billTotals(currentBill, data.payments) : null;
  const filteredReviews = useMemo(() => {
    if (!dashboard) return [];
    const days = Number(reviewPeriod);
    return dashboard.reviews.filter(review => {
      const waiter = data?.users.find(user => user.id === review.waiterId);
      const matchesQuery = `${review.comment} ${waiter?.name ?? ''} ${review.id}`.toLocaleLowerCase().includes(reviewSearch.toLocaleLowerCase());
      const matchesRating = reviewRating === 'all' || review.stars === Number(reviewRating);
      const matchesWaiter = reviewWaiter === 'all' || review.waiterId === reviewWaiter;
      const matchesPeriod = reviewPeriod === 'month'
        ? new Date(review.createdAt).getMonth() === new Date().getMonth() && new Date(review.createdAt).getFullYear() === new Date().getFullYear()
        : sinceDays(review.createdAt, days);
      const matchesStatus = reviewStatus === 'all' || (reviewStatus === 'treated' ? review.treated : !review.treated);
      const matchesRole = currentRole !== 'serveur' || review.waiterId === selectedWaiterId;
      return matchesQuery && matchesRating && matchesWaiter && matchesPeriod && matchesStatus && matchesRole;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [currentRole, data?.users, dashboard, reviewPeriod, reviewRating, reviewSearch, reviewStatus, reviewWaiter, selectedWaiterId]);

  const currency = restaurant?.currency ?? 'DZD';
  const selectableRestaurants = data?.restaurants.filter(item => item.ownerGroupId === restaurant?.ownerGroupId) ?? [];
  const liveAlerts = data?.alerts.filter(alert => alert.restaurantId === restaurant?.id && alert.status === 'new').slice(0, 5) ?? [];
  const pendingOrders = data?.orders.filter(order => order.restaurantId === restaurant?.id && order.status === 'pending') ?? [];
  const chartSlice = useMemo(() => dashboard?.daily.slice(-Number(period)) ?? [], [dashboard, period]);
  const isDemo = isDemoModeEnabled();
  const categoriesForFilter = categories.map(category => category.name);
  const visibleDishes = menuItems.filter(item => item.available &&
    (!roomCategory || categories.find(category => category.id === item.categoryId)?.name === roomCategory) &&
    item.name.toLocaleLowerCase().includes(roomSearch.toLocaleLowerCase()));

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
      await refresh();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Cette action n’a pas pu être effectuée.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openTable = async (table: RestaurantTable) => {
    setSelectedTableId(table.id);
    const openBill = data?.bills.find(bill => bill.tableId === table.id && bill.status !== 'paid');
    const waiterId = openBill?.waiterId ?? selectedWaiterId ?? waiters.find(waiter => waiter.active)?.id ?? '';
    setSelectedWaiterId(waiterId);
    if (openBill) {
      setSelectedBillId(openBill.id);
      setDiscount(String(openBill.discountPercent));
    } else if (waiterId && restaurant) {
      try {
        const bill = await createBill(table.id, waiterId, restaurant.id);
        setSelectedBillId(bill.id);
      } catch (openError) {
        setError(openError instanceof Error ? openError.message : 'La table ne peut pas être ouverte.');
      }
    }
    setActive('room');
  };

  const updateLineNote = async (line: NonNullable<typeof currentBill>['lines'][number], note: string) => {
    if (!currentBill) return;
    await run(() => updateBillLine(currentBill.id, line.id, { note }));
  };

  const recordManualPayment = async () => {
    if (!currentBill || !totals || totals.balance <= 0) return;
    await run(async () => { await payBill(currentBill.id, totals.balance, 'cash', 'paid'); }, t.paymentRecorded);
  };

  const saveRestaurantSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) return;
    const form = new FormData(event.currentTarget);
    const taxRate = Number(form.get('taxRate'));
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) { setError('La TVA doit être comprise entre 0 et 30 %.'); return; }
    await run(() => updateRestaurant(restaurant.id, {
      name: String(form.get('name')).trim(),
      city: String(form.get('city')).trim(),
      address: String(form.get('address')).trim(),
      googleReviewUrl: String(form.get('googleReviewUrl')).trim(),
      currency: String(form.get('currency')) as 'EUR' | 'DZD',
      taxRate,
      logoUrl: String(form.get('logoUrl')).trim()
    }), t.saved);
  };

  const submitWaiter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) return;
    if (!await run(() => createWaiter({ restaurantId: restaurant.id, name: newWaiterName, role: newWaiterRole || 'Serveur' }), t.add)) return;
    setNewWaiterName('');
    setNewWaiterRole('');
    setWaiterFormOpen(false);
  };

  const saveMenuItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) return;
    const price = Number(productPrice);
    const taxRate = Number(productTaxRate);
    const saved = await run(async () => {
      await upsertMenuItem({
        id: editingItem?.id,
        restaurantId: restaurant.id,
        categoryId: productCategoryId || categories[0]?.id || '',
        name: productName,
        price,
        taxRate,
        available: editingItem?.available ?? true
      });
    }, t.saved);
    if (!saved) return;
    setEditingItem(null);
    setProductName('');
    setProductPrice('');
  };

  const addCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) return;
    const saved = await run(() => upsertCategory({ id: editingCategoryId || undefined, restaurantId: restaurant.id, name: newCategoryName }), t.saved);
    if (!saved) return;
    setNewCategoryName('');
    setEditingCategoryId('');
  };

  const submitTable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) return;
    await run(() => upsertTable({ restaurantId: restaurant.id, name: tableName, zone: tableZone }), t.saved);
    setTableName('');
  };

  const editTable = async (table: RestaurantTable) => {
    const nextName = window.prompt(t.table, table.name);
    if (nextName === null) return;
    const nextZone = window.prompt(t.room, table.zone);
    if (nextZone === null || !restaurant) return;
    await run(() => upsertTable({ id: table.id, restaurantId: restaurant.id, name: nextName, zone: nextZone }), t.saved);
  };

  const suggestReviewReply = async (review: RestaurantReview) => {
    const waiter = data?.users.find(user => user.id === review.waiterId);
    setReplyBusyId(review.id);
    setError('');
    try {
      const response = await fetch('/api/ai/review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantName: restaurant?.name, stars: review.stars, comment: review.comment, waiterName: waiter?.name, language: currentLocale })
      });
      const result = await response.json() as { reply?: string; source?: string; error?: string };
      if (!response.ok || !result.reply) throw new Error(result.error || 'La suggestion n’a pas pu être générée.');
      setReplySuggestions(current => ({ ...current, [review.id]: { text: result.reply!, source: result.source ?? 'simulation' } }));
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : 'La suggestion n’a pas pu être générée.');
    } finally {
      setReplyBusyId('');
    }
  };

  const simulateReviewNotification = async (review: RestaurantReview, channel: 'email' | 'whatsapp') => {
    await run(() => recordNotificationSimulation(restaurant.id, review.id, channel), channel === 'email'
      ? 'Notification e-mail préparée en simulation.'
      : 'Notification WhatsApp préparée en simulation.');
  };

  const importMenu = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant) return;
    const imported = await run(async () => {
      const XLSX = await import('@/src/lib/xlsxCompat');
      const workbook = await XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('Le classeur ne contient aucune feuille.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (!rows.length) throw new Error('La feuille est vide.');
      const categoryByName = new Map(categories.map(category => [category.name.toLocaleLowerCase(), category]));
      for (const row of rows) {
        const value = (key: string, alternate: string) => row[key] ?? row[alternate] ?? '';
        const name = String(value('Produit', 'name')).trim();
        const categoryName = String(value('Catégorie', 'category')).trim() || 'Menu';
        const price = Number(value('Prix', 'price'));
        const taxRate = Number(value('TVA', 'taxRate') || restaurant.taxRate);
        if (!name || !Number.isFinite(price) || price < 0) throw new Error(`Ligne invalide pour le produit « ${name || '?'} ».`);
        let category = categoryByName.get(categoryName.toLocaleLowerCase());
        if (!category) {
          const nextCategories = await upsertCategory({ restaurantId: restaurant.id, name: categoryName });
          category = nextCategories.find(item => item.name === categoryName);
          if (category) categoryByName.set(categoryName.toLocaleLowerCase(), category);
        }
        if (!category) throw new Error(`Catégorie « ${categoryName} » impossible à créer.`);
        const availableValue = String(value('Disponible', 'available')).toLowerCase();
        await upsertMenuItem({
          restaurantId: restaurant.id,
          categoryId: category.id,
          name,
          price,
          taxRate,
          available: !['non', 'false', '0', 'no'].includes(availableValue)
        });
      }
    }, t.saved);
    event.target.value = '';
    if (imported) setNotice(`${t.saved} ${file.name}`);
  };

  const exportMenu = async () => {
    try {
      const XLSX = await import('@/src/lib/xlsxCompat');
      const rows = menuItems.map(item => ({
        'Catégorie': categories.find(category => category.id === item.categoryId)?.name ?? '',
        'Produit': item.name,
        'Prix': item.price,
        'TVA': item.taxRate,
        'Disponible': item.available ? 'Oui' : 'Non'
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Menu');
      await XLSX.writeFile(workbook, `${restaurant?.name ?? 'digifeel'}-menu.xlsx`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Le menu Excel n’a pas pu être exporté.');
    }
  };

  const exportExcel = async () => {
    if (!dashboard || !data) return;
    try {
      const XLSX = await import('@/src/lib/xlsxCompat');
      const book = XLSX.utils.book_new();
      const bills = dashboard.bills.filter(bill => sinceDays(bill.createdAt, Number(period)));
      const billRows = bills.map(bill => {
        const table = data.tables.find(item => item.id === bill.tableId);
        const waiter = data.users.find(user => user.id === bill.waiterId);
        const totals = billTotals(bill, data.payments);
        const payment = data.payments.find(item => item.billId === bill.id);
        const tip = data.tips.filter(item => item.billId === bill.id).reduce((sum, item) => sum + item.amount, 0);
        const review = data.reviews.find(item => item.billId === bill.id);
        return { Date: new Date(bill.createdAt).toLocaleString('fr-FR'), Table: table?.name ?? '', Serveur: waiter?.name ?? '', 'HT': totals.subtotal, TVA: totals.tax, TTC: totals.total, Pourboire: tip, Paiement: payment?.mode ?? '', Note: review?.stars ?? '' };
      });
      const productRows = dashboard.topProducts.map(item => ({ Produit: item.name, Quantité: item.quantity, 'Total HT': item.total }));
      const waiterRows = dashboard.byWaiter.map(waiter => ({ Serveur: waiter.name, Fonction: waiter.title ?? 'Serveur', Avis: waiter.reviews, 'Note moyenne': Number(waiter.averageRating.toFixed(2)), 'CA réalisé': waiter.revenue, Pourboires: waiter.tips }));
      const reviewRows = dashboard.reviews.filter(review => sinceDays(review.createdAt, Number(period))).map(review => ({ Date: new Date(review.createdAt).toLocaleString('fr-FR'), Note: review.stars, Commentaire: review.comment, Serveur: data.users.find(user => user.id === review.waiterId)?.name ?? '', Traité: review.treated ? 'Oui' : 'Non' }));
      const scanRows = dashboard.scans.filter(scan => sinceDays(scan.createdAt, Number(period))).map(scan => ({ Date: new Date(scan.createdAt).toLocaleString('fr-FR'), Table: data.tables.find(table => table.id === scan.tableId)?.name ?? '', Puce: scan.tagCode }));
      for (const [name, rows] of [['Additions', billRows], ['Produits vendus', productRows], ['Serveurs', waiterRows], ['Avis', reviewRows], ['Scans', scanRows]] as const) {
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name);
      }
      await XLSX.writeFile(book, `${restaurant?.name ?? 'digifeel'}-rapport-${period}j.xlsx`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'L’export Excel n’a pas pu être créé.');
    }
  };

  const exportPdf = async () => {
    if (!dashboard) return;
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      pdf.setFillColor(9, 12, 11);
      pdf.rect(0, 0, 210, 297, 'F');
      pdf.setTextColor(244, 241, 233);
      pdf.setFontSize(20);
      pdf.text(`${restaurant?.name ?? 'Digifeel'} · Rapport`, 15, 20);
      pdf.setFontSize(10);
      pdf.setTextColor(190, 193, 186);
      pdf.text(`${Number(period)} jours · ${new Date().toLocaleDateString('fr-FR')}`, 15, 29);
      pdf.setFontSize(11);
      pdf.text(`CA cumulé : ${formatMoney(dashboard.totalRevenue, currency, 'fr')}`, 15, 41);
      pdf.text(`Panier moyen : ${formatMoney(dashboard.averageBasket, currency, 'fr')}`, 15, 49);
      pdf.text(`Note moyenne : ${dashboard.averageRating.toFixed(1)} / 5 · ${dashboard.reviews.length} avis`, 110, 41);
      pdf.text(`Pourboires : ${formatMoney(dashboard.tipsTotal, currency, 'fr')}`, 110, 49);
      const chartData = dashboard.daily.slice(-Number(period));
      const chartLeft = 18;
      const chartTop = 120;
      const chartWidth = 174;
      const chartHeight = 55;
      const maxRevenue = Math.max(1, ...chartData.map(day => day.revenue));
      pdf.setTextColor(212, 181, 122);
      pdf.text('Chiffre d’affaires par jour', 15, 67);
      pdf.setDrawColor(72, 78, 72);
      for (let grid = 0; grid < 4; grid += 1) {
        const y = chartTop - grid * (chartHeight / 3);
        pdf.line(chartLeft, y, chartLeft + chartWidth, y);
      }
      const gap = 1.5;
      const barWidth = Math.max(2, (chartWidth - gap * chartData.length) / chartData.length);
      pdf.setFillColor(201, 148, 69);
      chartData.forEach((day, index) => {
        const height = Math.max(day.revenue > 0 ? 1 : 0, day.revenue / maxRevenue * chartHeight);
        pdf.rect(chartLeft + index * (barWidth + gap), chartTop - height, barWidth, height, 'F');
        if (index % Math.max(1, Math.ceil(chartData.length / 10)) === 0) {
          pdf.setFontSize(6);
          pdf.setTextColor(158, 165, 157);
          pdf.text(day.label, chartLeft + index * (barWidth + gap), chartTop + 7);
        }
      });
      pdf.setFontSize(10);
      pdf.setTextColor(212, 181, 122);
      pdf.text('Produits les plus vendus', 15, 143);
      pdf.setTextColor(231, 234, 228);
      dashboard.topProducts.slice(0, 6).forEach((product, index) => {
        const y = 151 + index * 7;
        pdf.text(`${index + 1}. ${product.name} · ${product.quantity} unités`, 16, y);
        pdf.text(formatMoney(product.total, currency, 'fr'), 192, y, { align: 'right' });
      });
      pdf.addPage();
      pdf.setFillColor(9, 12, 11);
      pdf.rect(0, 0, 210, 297, 'F');
      pdf.setTextColor(244, 241, 233);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(`${restaurant?.name ?? 'Digifeel'} · Rapport de caisse`, 15, 20);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(190, 193, 186);
      pdf.text(`Journée du ${new Date().toLocaleDateString('fr-FR')}`, 15, 29);
      const paymentsToday = dashboard.payments.filter(payment => new Date(payment.createdAt).toDateString() === new Date().toDateString());
      const methodTotals = new Map<string, { total: number; count: number }>();
      for (const payment of paymentsToday) {
        const value = methodTotals.get(payment.mode) ?? { total: 0, count: 0 };
        value.total += payment.amount;
        value.count += 1;
        methodTotals.set(payment.mode, value);
      }
      const modeNames: Record<string, string> = { cash: 'Espèces', terminal: 'Carte au terminal', card: 'Carte simulée', baridimob: 'Paiement local' };
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(212, 181, 122);
      pdf.text('Récapitulatif par mode de paiement', 15, 44);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(231, 234, 228);
      let y = 54;
      for (const [mode, entry] of methodTotals) {
        pdf.text(`${modeNames[mode] ?? mode} · ${entry.count} règlement(s)`, 16, y);
        pdf.text(formatMoney(entry.total, currency, 'fr'), 192, y, { align: 'right' });
        y += 8;
      }
      pdf.setDrawColor(72, 78, 72);
      pdf.line(15, y + 1, 195, y + 1);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total encaissé aujourd’hui', 16, y + 10);
      pdf.text(formatMoney(paymentsToday.reduce((sum, payment) => sum + payment.amount, 0), currency, 'fr'), 192, y + 10, { align: 'right' });
      y += 25;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(187, 194, 186);
      pdf.text('Derniers règlements', 15, y);
      y += 8;
      for (const payment of paymentsToday.slice(-22).reverse()) {
        if (y > 280) break;
        const bill = dashboard.bills.find(item => item.id === payment.billId);
        const table = data.tables.find(item => item.id === bill?.tableId);
        const waiter = data.users.find(item => item.id === bill?.waiterId);
        const line = `${new Date(payment.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${table?.name ?? 'Table'} · ${waiter?.name ?? '—'} · ${modeNames[payment.mode] ?? payment.mode}`;
        pdf.text(line, 16, y, { maxWidth: 135 });
        pdf.text(formatMoney(payment.amount, currency, 'fr'), 192, y, { align: 'right' });
        y += 7;
      }
      pdf.save(`${restaurant?.name ?? 'digifeel'}-rapport-${period}j.pdf`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Le rapport PDF n’a pas pu être créé.');
    }
  };

  const downloadWaiterQr = async (waiter: RestaurantUser) => {
    try {
      const dataUrl = await QRCode.toDataURL(`${window.location.origin}/app?role=serveur&waiter=${waiter.id}`, { width: 560, margin: 2 });
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `digifeel-${waiter.name.toLowerCase().replaceAll(' ', '-')}-qr.png`;
      anchor.click();
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : 'Le QR du serveur n’a pas pu être généré.');
    }
  };

  if (loading) return <main className="workspace-loading"><span className="pos-brand-mark"><Utensils /></span><p>{t.workspace}…</p></main>;
  if (error && !data) return <main className="workspace-loading"><CircleAlert /><p role="alert">{error}</p><Link href="/">{t.close}</Link></main>;
  if (!restaurant || !data || !dashboard) return <main className="workspace-loading"><p>{t.noData}</p><Link href="/">{t.close}</Link></main>;

  const nav: Array<{ id: Section; icon: typeof LayoutDashboard; label: string }> = [
    { id: 'home', icon: LayoutDashboard, label: t.home },
    { id: 'room', icon: Table2, label: t.room },
    { id: 'reviews', icon: Star, label: t.reviews },
    { id: 'team', icon: Users, label: t.team },
    { id: 'management', icon: Settings2, label: t.management }
  ];
  const selectedServer = waiters.find(waiter => waiter.id === selectedWaiterId);
  const serverPermissions = selectedServer?.permissions ?? { manageMenu: false, manageReviews: true, manageCash: true };
  const visibleNav = currentRole === 'serveur' ? nav.filter(item =>
    item.id === 'home' || (item.id === 'room' && serverPermissions.manageCash) || (item.id === 'reviews' && serverPermissions.manageReviews)
  ) : nav;
  const lowReviews = currentRole === 'serveur' ? dashboard.lowReviews.filter(review => review.waiterId === selectedWaiterId) : dashboard.lowReviews;

  return (
    <main className={`restaurant-workspace ${currentLocale === 'ar' ? 'is-rtl' : ''}`} dir={currentLocale === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="workspace-sidebar">
        <Link href="/" className="workspace-logo"><span className="pos-brand-mark"><Utensils /></span><span>DIGIFEEL<small>RESTAURANT</small></span></Link>
        <div className="workspace-restaurant"><span className="workspace-restaurant-avatar">{restaurant.name.slice(0, 1)}</span><span><strong>{restaurant.name}</strong><small>{restaurant.city || t.workspace}</small></span><ChevronDown size={15} /></div>
        <nav aria-label={t.workspace}>{visibleNav.map(({ id, icon: Icon, label }) => <button key={id} type="button" className={active === id ? 'is-active' : ''} onClick={() => setActive(id)}><Icon size={18} />{label}{id === 'reviews' && lowReviews.length > 0 && <span className="workspace-nav-badge">{lowReviews.length}</span>}</button>)}</nav>
        <div className="workspace-sidebar-bottom">
          <button type="button" className="workspace-demo-switch" onClick={() => void run(loadPalmierDemo, t.demoOn)}><BookOpenCheck size={16} />{t.demo}</button>
          <Link href="/caisse?demo=1"><ShoppingBag size={16} />{currentLocale === 'ar' ? 'نقطة البيع' : currentLocale === 'en' ? 'POS cashier' : 'Caisse POS'}</Link>
          {currentRole !== 'serveur' && <><Link href="/app/cuisine"><Utensils size={16} />{currentLocale === 'ar' ? 'المطبخ' : currentLocale === 'en' ? 'Kitchen' : 'Cuisine'}</Link>
          <Link href="/app/analyse"><BarChart3 size={16} />{currentLocale === 'ar' ? 'التحليل' : currentLocale === 'en' ? 'Insights' : 'Analyse'}</Link>
          <Link href="/app/fidelite"><BadgeCheck size={16} />{currentLocale === 'ar' ? 'الولاء' : currentLocale === 'en' ? 'Loyalty' : 'Fidélité'}</Link>
          <Link href="/app/pourboires"><Wallet size={16} />{currentLocale === 'ar' ? 'الإكراميات' : currentLocale === 'en' ? 'Tips' : 'Pourboires'}</Link>
          <Link href="/app/etablissements"><Store size={16} />{currentLocale === 'ar' ? 'الفروع' : currentLocale === 'en' ? 'Locations' : 'Établissements'}</Link>
          <Link href="/app/journal"><ClipboardList size={16} />{currentLocale === 'ar' ? 'سجل النشاط' : currentLocale === 'en' ? 'Activity log' : 'Journal d’activité'}</Link>
          <Link href="/app/reglages"><Settings2 size={16} />{currentLocale === 'ar' ? 'الإعدادات' : currentLocale === 'en' ? 'Settings' : 'Réglages'}</Link>
          <Link href="/app/aide"><HelpCircle size={16} />{currentLocale === 'ar' ? 'المساعدة' : currentLocale === 'en' ? 'Help' : 'Aide'}</Link>
          <Link href="/admin"><BarChart3 size={16} />{t.adminPage}</Link></>}
          <Link href="/t/PALM-0001"><QrCode size={16} />{t.clientPage}</Link>
          <button type="button" className="workspace-language" onClick={() => {
            const next = currentLocale === 'fr' ? 'ar' : currentLocale === 'ar' ? 'en' : 'fr';
            setWorkspaceLocale(next);
            window.localStorage.setItem('digifeel-app-locale', next);
          }}>{currentLocale === 'fr' ? 'العربية' : currentLocale === 'ar' ? 'EN' : 'FR'}</button>
          <p className="workspace-cert-note"><CircleAlert size={14} />{t.certification}</p>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <div><span className="workspace-breadcrumb">{t.workspace} /</span><h1>{restaurant.name}</h1>{selectableRestaurants.length > 1 && <select className="workspace-establishment-select" aria-label={t.workspace} value={restaurant.id} onChange={event => void run(() => selectRestaurant(event.target.value))}>{selectableRestaurants.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>}</div>
          <div className="workspace-top-actions">
            <PwaInstallButton />
            <ThemePicker locale={currentLocale} compact />
            <button type="button" className="workspace-tour-button" onClick={() => setTourStep(0)}><HelpCircle size={16} />{currentLocale === 'ar' ? 'جولة' : currentLocale === 'en' ? 'Quick tour' : 'Visite guidée'}</button>
            <button type="button" className="workspace-role-switch" onClick={() => setCurrentRole(role => {
              if (role === 'serveur') { setActive('home'); return 'admin_restaurant'; }
              if (!selectedWaiterId && waiters[0]) setSelectedWaiterId(waiters[0].id);
              setActive('home');
              return 'serveur';
            })}>{currentRole === 'serveur' ? t.roleServer : t.roleAdmin}</button>
            {isDemo && <span className="workspace-demo-pill">{t.startDemo}</span>}
            <span className="workspace-online"><Wifi size={15} />{t.active}</span>
            <button type="button" className="workspace-icon-button" aria-label={t.alerts} onClick={() => setActive('reviews')}><Bell size={18} />{dashboard.lowReviews.length > 0 && <i />}</button>
            <Link href="/" className="workspace-back-link"><ArrowLeft size={16} />{t.close}</Link>
          </div>
        </header>
        {(notice || error) && <div className={`workspace-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error ? <CircleAlert size={16} /> : <Check size={16} />}{error || notice}<button type="button" aria-label={t.close} onClick={() => { setNotice(''); setError(''); }}>×</button></div>}
        {liveAlerts.length > 0 && <div className="workspace-live-alerts" role="status" aria-live="polite">{liveAlerts.map(alert => <article key={alert.id}><span className="workspace-alert-pulse"><Bell size={15} /></span><span><strong>{alert.message}</strong><small>{new Date(alert.createdAt).toLocaleTimeString(currentLocale === 'ar' ? 'ar-DZ' : currentLocale === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></span>{alert.kind === 'order_ready' && <Link href="/app/cuisine">Cuisine</Link>}<button type="button" aria-label={t.handled} onClick={() => void run(() => acknowledgeAlert(alert.id))}><Check size={15} /></button></article>)}</div>}

        {active === 'home' && <section className="workspace-content workspace-overview">
          <div className="workspace-section-title"><div><span className="workspace-eyebrow">{t.today}</span><h2>{t.home}<span> · {restaurant.name}</span></h2></div><label>{t.period}<select value={period} onChange={event => setPeriod(event.target.value)}><option value="7">{t.last7}</option><option value="30">{t.last30}</option></select></label></div>
          <div className="workspace-stat-grid">
            <article className="workspace-stat workspace-stat--revenue"><span>{t.revenue}</span><strong>{formatMoney(dashboard.todayRevenue, currency, currentLocale)}</strong><small><CreditCard size={14} />{formatMoney(dashboard.totalRevenue, currency, currentLocale)} · {t.today}</small></article>
            <article className="workspace-stat"><span>{t.basket}</span><strong>{formatMoney(dashboard.averageBasket, currency, currentLocale)}</strong><small><ShoppingBag size={14} />{dashboard.bills.length} {t.bill.toLowerCase()}s</small></article>
            <article className="workspace-stat workspace-stat--rating"><span>{t.average}</span><strong>{dashboard.averageRating.toFixed(1)} <Star size={19} fill="currentColor" /></strong><small>{dashboard.reviews.length} {t.reviews.toLowerCase()}</small></article>
            <article className="workspace-stat"><span>{t.monthReviews}</span><strong>{dashboard.monthReviews}</strong><small><BookOpenCheck size={14} />{t.thisMonth}</small></article>
            <article className="workspace-stat"><span>{t.scans}</span><strong>{dashboard.scansToday}</strong><small><QrCode size={14} />NFC + QR</small></article>
            <article className="workspace-stat workspace-stat--mint"><span>{t.tips}</span><strong>{formatMoney(dashboard.tipsTotal, currency, currentLocale)}</strong><small><BadgeCheck size={14} />{dashboard.tips.filter(tip => tip.status === 'paid').length} {t.paid}</small></article>
          </div>
          {currentRole !== 'serveur' && <StarBonusCard restaurant={restaurant} locale={currentLocale} />}
          <div className="workspace-dashboard-grid">
            <article className="workspace-panel workspace-chart-panel">
              <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.activity}</span><h3>{t.revenue}</h3></div><span className="workspace-legend"><i />{t.revenue}</span></div>
              <div className="workspace-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartSlice} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#929a94', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#929a94', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#141a17', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#f4f1e9' }} formatter={(value) => [formatMoney(Number(value), currency, currentLocale), t.revenue]} /><Bar dataKey="revenue" fill="#c99445" radius={[5, 5, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div>
            </article>
            <article className="workspace-panel workspace-products-panel">
              <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.topProducts}</span><h3>{t.menu}</h3></div><Utensils size={19} /></div>
              {dashboard.topProducts.length === 0 ? <p className="workspace-empty">{t.noData}</p> : <div className="workspace-ranked-list">{dashboard.topProducts.map((product, index) => <div key={product.name}><span className="workspace-rank">{String(index + 1).padStart(2, '0')}</span><strong>{product.name}</strong><span>{product.quantity}×</span></div>)}</div>}
            </article>
            <article className="workspace-panel workspace-peak-panel">
              <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.peakHours}</span><h3>{t.room}</h3></div><Clock3 size={18} /></div>
              <div className="workspace-peak-bars">{dashboard.peakHours.map((hour, index) => <div key={hour.hour} title={`${hour.hour}: ${hour.count}`}><i style={{ height: `${Math.max(8, hour.count / Math.max(1, ...dashboard.peakHours.map(item => item.count)) * 100)}%` }} /><small>{hour.hour}</small><span>{index === 2 ? 'Service' : ''}</span></div>)}</div>
            </article>
            <article className="workspace-panel workspace-alert-panel">
              <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.alerts}</span><h3>{lowReviews.length} <small>{t.unhandled.toLowerCase()}</small></h3></div><CircleAlert size={19} /></div>
              {lowReviews.length === 0 ? <p className="workspace-empty">{t.noData}</p> : <div className="workspace-low-review-list">{lowReviews.slice(0, 3).map(review => <div key={review.id}><strong>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</strong><span>{review.comment}</span><small>{data.users.find(user => user.id === review.waiterId)?.name}</small></div>)}<button type="button" onClick={() => setActive('reviews')}>{t.viewAll}<ArrowLeft size={14} /></button></div>}
            </article>
          </div>
        </section>}

        {active === 'room' && <section className="workspace-content workspace-room-page">
          <div className="workspace-section-title"><div><span className="workspace-eyebrow">{t.room}</span><h2>{t.allTables}</h2></div><div className="workspace-status-legend"><span><i className="free" />{t.free}</span><span><i className="occupied" />{t.occupied}</span><span><i className="requested" />{t.requested}</span><span><i className="paid" />{t.paid}</span></div></div>
          <div className="workspace-room-layout">
            <article className="workspace-panel workspace-floor-panel">
              <div className="workspace-floor-label"><span>{t.room}</span><small>· {t.algeria}</small></div>
              <div className="workspace-floor-grid">{tables.filter(table => table.active).map(table => <button type="button" key={table.id} className={`workspace-table-card is-${table.status} ${selectedTableId === table.id ? 'is-selected' : ''}`} onClick={() => void openTable(table)}>
                <span><Table2 size={18} />{table.name}</span><strong>{statusLabel(table.status, t)}</strong><small>{table.zone}</small>
                {data.bills.find(bill => bill.tableId === table.id && bill.status !== 'paid') && <em>{formatMoney(billTotals(data.bills.find(bill => bill.tableId === table.id && bill.status !== 'paid')!, data.payments).total, currency, currentLocale)}</em>}
              </button>)}</div>
            </article>
            <aside className="workspace-panel workspace-bill-panel">
              <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{selectedTable?.name ?? t.selectTable}</span><h3>{t.bill}</h3></div>{currentBill && <span className={`workspace-bill-status is-${currentBill.status}`}>{currentBill.clientVisible ? t.requested : currentBill.status === 'paid' ? t.paid : t.occupied}</span>}</div>
              {!selectedTable ? <div className="workspace-bill-empty"><Table2 /><p>{t.selectTable}</p></div> : !currentBill || !totals ? <div className="workspace-bill-empty"><ShoppingBag /><p>{t.emptyBill}</p></div> : <>
                {currentRole !== 'serveur' && <label className="workspace-select-label">{t.waiter}<select value={selectedWaiterId} onChange={event => {
                  setSelectedWaiterId(event.target.value);
                  if (currentBill) void run(() => updateBillWaiter(currentBill.id, event.target.value));
                }}><option value="">{t.chooseWaiter}</option>{waiters.filter(waiter => waiter.active).map(waiter => <option key={waiter.id} value={waiter.id}>{waiter.name}</option>)}</select></label>}
                <div className="workspace-bill-lines">{currentBill.lines.map(line => <article key={line.id} className="workspace-bill-line">
                  <div className="workspace-bill-line-main"><strong>{line.name}</strong><span>{formatMoney(line.quantity * line.unitPrice, currency, currentLocale)}</span><small>{formatMoney(line.unitPrice, currency, currentLocale)} / {line.quantity}</small></div>
                  <div className="workspace-line-actions"><button type="button" aria-label={t.remove} disabled={busy} onClick={() => void run(() => line.quantity > 1 ? updateBillLine(currentBill.id, line.id, { quantity: line.quantity - 1 }) : removeBillLine(currentBill.id, line.id))}><Minus size={14} /></button><span>{line.quantity}</span><button type="button" aria-label={t.add} disabled={busy} onClick={() => void run(() => updateBillLine(currentBill.id, line.id, { quantity: line.quantity + 1 }))}><Plus size={14} /></button><button type="button" aria-label={t.remove} className="workspace-remove-line" disabled={busy} onClick={() => void run(() => removeBillLine(currentBill.id, line.id))}><Trash2 size={14} /></button></div>
                  <label className="workspace-note-label">{t.note}<input value={line.note} maxLength={120} placeholder="Ex. sans oignon" onChange={event => {
                    const note = event.target.value;
                    setData(current => current ? { ...current, bills: current.bills.map(bill => bill.id === currentBill.id ? { ...bill, lines: bill.lines.map(item => item.id === line.id ? { ...item, note } : item) } : bill) } : current);
                  }} onBlur={event => void updateLineNote(line, event.target.value)} /></label>
                </article>)}</div>
                <div className="workspace-quick-box"><strong>{t.quickTotal}</strong><div><input type="number" min="1" value={quickAmount} placeholder={t.quickMode} onChange={event => setQuickAmount(event.target.value)} /><button type="button" disabled={busy || !quickAmount} onClick={() => void run(() => setQuickTotal(currentBill.id, Number(quickAmount)))}>{t.applyTotal}</button></div></div>
                <div className="workspace-discount"><label>{t.discount}<input type="number" min="0" max="100" value={discount} onChange={event => setDiscount(event.target.value)} /></label><button type="button" disabled={busy} onClick={() => void run(() => publishBill(currentBill.id, Number(discount)))}>{t.sendBill}</button></div>
                <p className="workspace-hint"><QrCode size={14} />{t.sendHint}</p>
                <div className="workspace-bill-totals"><span>{t.subtotal}<b>{formatMoney(totals.subtotal, currency, currentLocale)}</b></span><span>{t.tax}<b>{formatMoney(totals.tax, currency, currentLocale)}</b></span><span className="workspace-total-line">{t.total}<b>{formatMoney(totals.total, currency, currentLocale)}</b></span>{totals.paid > 0 && <span>{t.paid}<b>{formatMoney(totals.paid, currency, currentLocale)}</b></span>}</div>
                <div className="workspace-manual-payments"><button type="button" disabled={busy || totals.balance <= 0} onClick={() => void run(async () => { await payBill(currentBill.id, totals.balance, 'cash'); }, t.paymentRecorded)}>{t.cash}</button><button type="button" disabled={busy || totals.balance <= 0} onClick={() => void run(async () => { await payBill(currentBill.id, totals.balance, 'terminal'); }, t.paymentRecorded)}>{t.terminal}</button></div>
              </>}
            </aside>
          </div>
          <section className="workspace-panel workspace-orders-panel" aria-labelledby="workspace-orders-heading">
            <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.room}</span><h3 id="workspace-orders-heading">{currentLocale === 'ar' ? 'طلبات العميل' : currentLocale === 'en' ? 'Guest orders' : 'Commandes à valider'} · {pendingOrders.length}</h3></div><Link href="/app/cuisine" className="workspace-inline-link"><Utensils size={15} />Cuisine</Link></div>
            {pendingOrders.length === 0 ? <p className="workspace-empty">Aucune commande en attente.</p> : <div className="workspace-pending-order-list">{pendingOrders.map(order => {
              const table = tables.find(item => item.id === order.tableId);
              const waiter = waiters.find(item => item.id === order.waiterId);
              return <article key={order.id} className="workspace-pending-order">
                <div><strong>{table?.name ?? 'Table'} · {waiter?.name ?? t.chooseWaiter}</strong><time>{new Date(order.createdAt).toLocaleTimeString(currentLocale === 'ar' ? 'ar-DZ' : currentLocale === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</time></div>
                <ul>{order.lines.map((line, index) => <li key={`${line.itemId}-${index}`}><span>{line.quantity} × {line.name}</span>{line.note && <small>{line.note}</small>}</li>)}</ul>
                <div className="workspace-pending-order-actions"><button type="button" disabled={busy} onClick={() => void run(() => rejectGuestOrder(order.id))}>{t.cancel}</button><button type="button" disabled={busy} onClick={() => void run(() => acceptGuestOrder(order.id))}><Check size={15} />Valider et envoyer en cuisine</button></div>
              </article>;
            })}</div>}
          </section>
          <article className="workspace-panel workspace-add-items">
            <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.addToBill}</span><h3>{selectedTable?.name ?? t.chooseProduct}</h3></div><label className="workspace-search"><Search size={15} /><input value={roomSearch} onChange={event => setRoomSearch(event.target.value)} placeholder={t.searchDish} /></label></div>
            <div className="workspace-category-pills"><button className={!roomCategory ? 'is-active' : ''} type="button" onClick={() => setRoomCategory('')}>{t.all}</button>{categoriesForFilter.map(category => <button key={category} type="button" className={roomCategory === category ? 'is-active' : ''} onClick={() => setRoomCategory(category)}>{category}</button>)}</div>
            {!selectedTable || !currentBill ? <p className="workspace-empty">{t.selectTable}</p> : <div className="workspace-dishes-grid">{visibleDishes.map(dish => <button key={dish.id} type="button" onClick={() => void run(() => addItem(currentBill.id, dish.id))}><span>{categories.find(category => category.id === dish.categoryId)?.name}</span><strong>{dish.name}</strong><b>{formatMoney(dish.price, currency, currentLocale)}</b><Plus size={16} /></button>)}</div>}
          </article>
        </section>}

        {active === 'reviews' && <section className="workspace-content workspace-reviews-page">
          <div className="workspace-section-title"><div><span className="workspace-eyebrow">{t.reviews}</span><h2>{t.reviews}<span> · {dashboard.reviews.length}</span></h2></div><div className="workspace-review-filters">
            <label><Search size={15} /><input value={reviewSearch} onChange={event => setReviewSearch(event.target.value)} placeholder={t.search} /></label>
            <select aria-label={t.rating} value={reviewRating} onChange={event => setReviewRating(event.target.value)}><option value="all">{t.rating}</option>{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} ★</option>)}</select>
            <select aria-label={t.period} value={reviewPeriod} onChange={event => setReviewPeriod(event.target.value)}><option value="7">{t.last7}</option><option value="30">{t.last30}</option><option value="month">{t.thisMonth}</option></select>
            <select aria-label={t.serverFilter} value={reviewWaiter} onChange={event => setReviewWaiter(event.target.value)}><option value="all">{t.serverFilter}</option>{waiters.map(waiter => <option value={waiter.id} key={waiter.id}>{waiter.name}</option>)}</select>
            <select aria-label={t.unhandled} value={reviewStatus} onChange={event => setReviewStatus(event.target.value)}><option value="all">{t.all}</option><option value="open">{t.unhandled}</option><option value="treated">{t.treated}</option></select>
          </div></div>
          <div className="workspace-review-cards">{filteredReviews.length === 0 ? <article className="workspace-panel workspace-empty-review"><Star /><p>{t.noReviews}</p></article> : filteredReviews.map(review => {
            const table = tables.find(item => item.id === review.tableId);
            const waiter = waiters.find(item => item.id === review.waiterId);
            return <article className="workspace-panel workspace-review-card" key={review.id}>
              <div className="workspace-review-card-heading"><strong className="workspace-review-stars">{'★'.repeat(review.stars)}<span>{'☆'.repeat(5 - review.stars)}</span></strong><time>{new Date(review.createdAt).toLocaleDateString(currentLocale === 'ar' ? 'ar-DZ' : currentLocale === 'en' ? 'en-GB' : 'fr-FR')}</time></div>
              <p>{review.comment || '—'}</p>
              {review.criteria && <div className="workspace-review-criteria">{Object.entries(review.criteria).map(([key, value]) => <span key={key}>{key}: <b>{value}/5</b></span>)}</div>}
              {replySuggestions[review.id] && <div className="workspace-reply-suggestion"><small>{replySuggestions[review.id].source === 'gemini' ? 'Suggestion Gemini' : 'Suggestion simulée'}</small><p>{replySuggestions[review.id].text}</p><button type="button" onClick={async () => {
                try { await navigator.clipboard.writeText(replySuggestions[review.id].text); setNotice('Réponse copiée.'); }
                catch (copyError) { setError(copyError instanceof Error ? copyError.message : 'Copie impossible.'); }
              }}><Copy size={14} />Copier la réponse</button></div>}
              <div className="workspace-review-meta"><span>{waiter?.name ?? '—'}</span><span>{table?.name ?? '—'}</span><span className={review.treated ? 'is-treated' : 'is-open'}>{review.treated ? t.treated : t.unhandled}</span></div>
              <div className="workspace-review-tools"><button type="button" disabled={replyBusyId === review.id} onClick={() => void suggestReviewReply(review)}>{replyBusyId === review.id ? 'Génération…' : 'Suggérer une réponse'}</button>{review.stars <= 2 && <><button type="button" onClick={() => void simulateReviewNotification(review, 'email')}>E-mail démo</button><button type="button" onClick={() => void simulateReviewNotification(review, 'whatsapp')}>WhatsApp démo</button></>}</div>
              <button type="button" disabled={busy} className={review.treated ? 'workspace-review-action is-treated' : 'workspace-review-action'} onClick={() => void run(() => markReviewTreated(review.id, !review.treated))}>{review.treated ? <Check size={15} /> : <BookOpenCheck size={15} />}{review.treated ? t.treated : t.handled}</button>
            </article>;
          })}</div>
        </section>}

        {active === 'team' && currentRole !== 'serveur' && <section className="workspace-content workspace-team-page">
          <div className="workspace-section-title"><div><span className="workspace-eyebrow">{t.team}</span><h2>{t.team} <span>· {waiters.length}</span></h2></div><button className="workspace-primary-button" type="button" onClick={() => setWaiterFormOpen(open => !open)}><Plus size={17} />{t.newWaiter}</button></div>
          {waiterFormOpen && <form className="workspace-panel workspace-waiter-form" onSubmit={submitWaiter}><label>{t.name}<input required minLength={2} maxLength={100} value={newWaiterName} onChange={event => setNewWaiterName(event.target.value)} /></label><label>{t.role}<input value={newWaiterRole} maxLength={80} onChange={event => setNewWaiterRole(event.target.value)} /></label><button className="workspace-primary-button" type="submit" disabled={busy}>{t.add}</button><button type="button" onClick={() => setWaiterFormOpen(false)}>{t.cancel}</button></form>}
          {waiters.length === 0 ? <article className="workspace-panel workspace-empty-review"><Users /><p>{t.noWaiter}</p></article> : <div className="workspace-waiter-grid">{dashboard.byWaiter.sort((a, b) => b.averageRating - a.averageRating).map((waiter, index) => <article className="workspace-panel workspace-waiter-card" key={waiter.id}>
            <div className="workspace-waiter-rank">{String(index + 1).padStart(2, '0')}</div><div className="workspace-waiter-avatar">{waiter.name.slice(0, 1)}</div><div className="workspace-waiter-info"><h3>{waiter.name}</h3><p>{waiter.title ?? 'Serveur'}</p><span><Star size={14} fill="currentColor" />{waiter.averageRating.toFixed(1)} · {waiter.reviews} {t.reviewsCount}</span></div>
            <div className="workspace-waiter-kpis"><span>{t.turnover}<b>{formatMoney(waiter.revenue, currency, currentLocale)}</b></span><span>{t.tips}<b>{formatMoney(waiter.tips, currency, currentLocale)}</b></span></div>
            <fieldset className="workspace-permission-set"><legend>{currentLocale === 'ar' ? 'الصلاحيات في هذا النموذج' : currentLocale === 'en' ? 'Demo access settings' : 'Accès dans cette démo'}</legend>{([
              ['manageCash', currentLocale === 'ar' ? 'إدارة القاعة والمدفوعات' : currentLocale === 'en' ? 'Room and payments' : 'Salle et encaissements'],
              ['manageReviews', currentLocale === 'ar' ? 'متابعة التقييمات' : currentLocale === 'en' ? 'Review feedback' : 'Suivi des avis'],
              ['manageMenu', currentLocale === 'ar' ? 'إدارة القائمة' : currentLocale === 'en' ? 'Manage menu' : 'Gestion du menu']
            ] as const).map(([permission, label]) => <label key={permission}><input type="checkbox" checked={waiter.permissions?.[permission] ?? (permission === 'manageReviews' || permission === 'manageCash')} onChange={event => void run(() => updateWaiterPermissions(waiter.id, { ...(waiter.permissions ?? { manageMenu: false, manageReviews: true, manageCash: true }), [permission]: event.target.checked }))} />{label}</label>)}</fieldset>
            <div className="workspace-waiter-actions"><button type="button" onClick={() => void downloadWaiterQr(waiter)}><QrCode size={15} />{t.qr}</button><button type="button" onClick={() => void run(() => updateWaiter(waiter.id, { active: !waiter.active }))}>{waiter.active ? t.active : t.enable}</button></div>
          </article>)}</div>}
        </section>}

        {active === 'management' && currentRole !== 'serveur' && <section className="workspace-content workspace-management-page">
          <div className="workspace-section-title"><div><span className="workspace-eyebrow">{t.management}</span><h2>{t.restaurantSettings}</h2></div></div>
          <div className="workspace-management-grid">
            <form className="workspace-panel workspace-settings-form" onSubmit={saveRestaurantSettings}>
              <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.restaurantSettings}</span><h3>{restaurant.name}</h3></div><Settings2 /></div>
              <label>{t.name}<input name="name" required minLength={2} defaultValue={restaurant.name} /></label>
              <label>{t.city}<input name="city" defaultValue={restaurant.city} /></label>
              <label>{t.address}<input name="address" defaultValue={restaurant.address} /></label>
              <label>{t.googleLink}<input name="googleReviewUrl" type="url" inputMode="url" placeholder="https://g.page/r/…" defaultValue={restaurant.googleReviewUrl} /></label>
              <div className="workspace-form-row"><label>{t.currency}<select name="currency" defaultValue={currency}><option value="DZD">{t.dinar}</option><option value="EUR">{t.euro}</option></select></label><label>{t.vat}<input name="taxRate" type="number" min="0" max="30" defaultValue={restaurant.taxRate} /></label></div>
              <label>{t.logo}<input name="logoUrl" type="url" defaultValue={restaurant.logoUrl} /></label>
              <button className="workspace-primary-button" type="submit" disabled={busy}>{t.save}</button>
              <p className="workspace-certification"><CircleAlert size={15} />{t.certification}</p>
            </form>

            <section className="workspace-panel workspace-menu-management">
              <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.menu}</span><h3>{menuItems.length} {t.product.toLowerCase()}s</h3></div><div className="workspace-menu-file-actions"><button type="button" onClick={() => menuFileRef.current?.click()}><ArrowDownToLine size={15} />Excel import</button><button type="button" onClick={() => void exportMenu()}><FileSpreadsheet size={15} />Excel export</button><input ref={menuFileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={event => void importMenu(event)} /></div></div>
              <form className="workspace-inline-form" onSubmit={addCategory}><input required minLength={2} value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} placeholder={t.newCategory} /><button aria-label={t.add} type="submit"><Plus /></button></form>
              <div className="workspace-category-management">{categories.map(category => <button type="button" key={category.id} onClick={() => {
                const updatedName = window.prompt(t.category, category.name);
                if (updatedName === null || !restaurant) return;
                setNewCategoryName(updatedName);
                setEditingCategoryId(category.id);
              }}>{category.name}<Pencil size={12} /></button>)}</div>
              <form className="workspace-inline-form workspace-product-form" onSubmit={saveMenuItem}>
                <input required minLength={2} value={productName} onChange={event => setProductName(event.target.value)} placeholder={editingItem ? `${t.product} · ${t.save}` : t.product} />
                <select value={productCategoryId || categories[0]?.id || ''} onChange={event => setProductCategoryId(event.target.value)}>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
                <input type="number" min="0" required value={productPrice} onChange={event => setProductPrice(event.target.value)} placeholder={t.price} />
                <input type="number" min="0" max="30" value={productTaxRate} onChange={event => setProductTaxRate(event.target.value)} aria-label={t.vat} />
                <button type="submit" aria-label={t.add} disabled={busy}><Plus /></button>
              </form>
              <div className="workspace-managed-list">{menuItems.map(item => <div key={item.id}><span><strong>{item.name}</strong><small>{categories.find(category => category.id === item.categoryId)?.name} · {formatMoney(item.price, currency, currentLocale)} · TVA {item.taxRate}%</small></span><button type="button" title={t.product} onClick={() => { setEditingItem(item); setProductName(item.name); setProductPrice(String(item.price)); setProductCategoryId(item.categoryId); setProductTaxRate(String(item.taxRate)); }}><Pencil size={15} /></button><button type="button" className={item.available ? 'is-available' : ''} title={item.available ? t.disable : t.enable} onClick={() => void run(() => toggleMenuItem(item.id, !item.available))}>{item.available ? <Check size={16} /> : <Minus size={16} />}</button><button type="button" title={t.remove} onClick={() => window.confirm(`${t.remove} ${item.name} ?`) && void run(() => deleteMenuItem(item.id))}><Trash2 size={15} /></button></div>)}</div>
            </section>
          </div>
          <section className="workspace-panel workspace-table-management">
            <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">{t.tablesTags}</span><h3>{tables.length} {t.table.toLowerCase()}s</h3></div><QrCode /></div>
            <form className="workspace-inline-form workspace-table-form" onSubmit={submitTable}><input required value={tableName} onChange={event => setTableName(event.target.value)} placeholder={t.table} /><input required value={tableZone} onChange={event => setTableZone(event.target.value)} placeholder="Salle / Terrasse" /><button type="submit" aria-label={t.addTable}><Plus /></button></form>
            <div className="workspace-tag-grid">{tables.map(table => <article key={table.id}><span><Table2 size={17} /><strong>{table.name}</strong><small>{table.zone} · {t.tag}: {table.tagCode}</small></span><Link href={`/t/${table.tagCode}`} target="_blank" aria-label={t.clientPage}><QrCode size={17} /></Link><button type="button" aria-label={t.table} onClick={() => void editTable(table)}><Pencil size={14} /></button><button type="button" onClick={() => void run(() => toggleTableTag(table.id, !table.active))}>{table.active ? t.disable : t.enable}</button></article>)}</div>
          </section>
          <section className="workspace-panel workspace-subscription-row"><div><span className="workspace-eyebrow">{t.subscription}</span><h3>{restaurant.subscriptionStatus === 'trialing' ? t.trialing : restaurant.subscriptionStatus === 'active' ? t.activeSub : t.suspended}</h3><p>{t.info} · {t.certification}</p></div><span className={`workspace-subscription-pill is-${restaurant.subscriptionStatus}`}>{restaurant.subscriptionStatus === 'trialing' ? t.trialing : restaurant.subscriptionStatus === 'active' ? t.activeSub : t.suspended}</span></section>
          <section className="workspace-panel workspace-export-panel">
            <div><span className="workspace-eyebrow">{t.exports}</span><h3>{t.period} · {period} {currentLocale === 'en' ? 'days' : 'jours'}</h3><label>{t.period}<select value={period} onChange={event => setPeriod(event.target.value)}><option value="7">{t.last7}</option><option value="30">{t.last30}</option></select></label></div>
            {restaurant.subscriptionStatus === 'suspended' ? <div className="workspace-export-locked"><p>{t.exportLocked}</p><button type="button" className="workspace-primary-button" onClick={() => setNotice(t.subscribe)}>{t.subscribe}</button></div> : <div className="workspace-export-actions"><button type="button" onClick={() => void exportExcel()}><FileSpreadsheet />{t.exportExcel}</button><button type="button" onClick={() => void exportPdf()}><FileText />{t.exportPdf}</button></div>}
          </section>
        </section>}
        <footer className="workspace-mobile-cert">{t.certification}</footer>
      </section>

      <nav className="workspace-mobile-nav" aria-label={t.workspace}>{visibleNav.map(({ id, icon: Icon, label }) => <button key={id} type="button" aria-current={active === id ? 'page' : undefined} className={active === id ? 'is-active' : ''} onClick={() => setActive(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      {tourStep !== null && <div className="workspace-tour-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setTourStep(null); }}><section className="workspace-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-tour-title"><span className="workspace-eyebrow">DIGIFEEL · {tourStep + 1}/3</span><h2 id="workspace-tour-title">{[t.home, t.room, t.reviews][tourStep]}</h2><p>{currentLocale === 'ar' ? ['تابع النشاط والمبيعات والتنبيهات من لوحة واحدة.', 'أدر الطاولات والطلبات والفواتير المباشرة.', 'راجع التقييمات وتابع الردود المقترحة.'][tourStep] : currentLocale === 'en' ? ['Track revenue, activity and alerts from one dashboard.', 'Manage tables, guest orders and live bills.', 'Review feedback and prepare thoughtful replies.'][tourStep] : ['Suivez l’activité, les ventes et les alertes depuis un seul écran.', 'Gérez les tables, commandes clients et additions en direct.', 'Traitez les avis et préparez des réponses adaptées.'][tourStep]}</p><div><button type="button" onClick={() => setTourStep(null)}>{t.close}</button>{tourStep < 2 ? <button type="button" className="workspace-primary-button" onClick={() => { setActive((['home', 'room', 'reviews'] as Section[])[tourStep + 1]); setTourStep(current => current === null ? null : current + 1); }}>Continuer</button> : <button type="button" className="workspace-primary-button" onClick={() => setTourStep(null)}>Terminer</button>}</div></section></div>}
      {busy && <div className="workspace-busy-indicator" role="status">{t.simulator}…</div>}
    </main>
  );
}
