'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Check, CircleAlert, Copy, CreditCard, LoaderCircle, Minus, Plus, ReceiptText, ShoppingBag, Star, Utensils, Wallet } from 'lucide-react';
import {
  addTip, billTotals, callServer, createGuestOrder, createReview, createReviewForTag, getBill, getBillForTag,
  getPublicMenuForTag, getRestaurantData, getTagByCode, getWaiters, payBill, recordTagScan, requestBill,
  linkLoyaltyCustomer, recordResellerPlatformPayment, subscribeRestaurantData, type RestaurantReview
} from '@/src/services/restaurant';
import { paymentProvider, type PaymentMethod } from '@/src/services/paymentProvider';
import { ThemePicker } from './ThemePicker';

type Lang = 'fr' | 'ar' | 'en';
type GuestCopy = { [Key in keyof typeof text.fr]: typeof text.fr[Key] extends readonly string[] ? readonly string[] : string };
type BillContext = NonNullable<Awaited<ReturnType<typeof getBillForTag>>['bill']>;
type GuestMenu = NonNullable<Awaited<ReturnType<typeof getPublicMenuForTag>>>;
type GuestCart = Record<string, { quantity: number; note: string }>;

async function getReviewDeviceFingerprint() {
  let deviceKey = localStorage.getItem('digifeel-review-device-key');
  if (!deviceKey) {
    deviceKey = crypto.randomUUID();
    localStorage.setItem('digifeel-review-device-key', deviceKey);
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceKey));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

const text = {
  fr: {
    scan: 'Votre table, en un scan.', activated: 'Puce activée', table: 'Table', bill: 'Votre addition',
    updated: 'Le serveur met l’addition à jour en direct.', notActivated: 'Cette puce n’est pas encore activée.',
    activate: 'Activer cette table', restaurant: 'Nom du restaurant', owner: 'Votre nom', city: 'Ville', resellerCode: 'Code revendeur (facultatif)',
    google: 'Lien Google Avis', package: 'Pack d’installation', proceed: 'Créer le compte', install: 'Installation ·', freeMonth: 'Premier mois offert',
    unknown: 'Ce code n’est associé à aucune puce connue.', notAvailable: 'Cette puce est désactivée ou indisponible.',
    subtotal: 'Sous-total HT', vat: 'TVA', total: 'Total TTC', paid: 'Déjà réglé', balance: 'Reste à payer',
    pay: 'Payer', all: 'Tout régler', split: 'Partager à parts égales', guests: 'Personnes', items: 'Payer des articles',
    custom: 'Montant libre', amount: 'Montant', card: 'Carte simulée', cash: 'Espèces · appeler le serveur',
    local: 'Paiement local · en attente de validation', simulator: 'Simulation uniquement · aucun paiement réel',
    addTip: 'Ajouter un pourboire', noTip: 'Sans pourboire', tip: 'Pourboire', continue: 'Continuer', receipt: 'Télécharger le justificatif',
    review: 'Comment s’est passé le repas ?', reviewsCount: 'Votre avis', remove: 'Retirer cet article', choose: 'Choisissez une note', comment: 'Votre commentaire (facultatif)',
    quick: ['Service attentionné', 'Très bon repas', 'À améliorer'], server: 'Votre serveur', skip: 'Passer cette étape',
    saveReview: 'Enregistrer mon avis', thanks: 'Merci pour votre retour.', googleBtn: 'Copier et publier sur Google',
    googleInfo: 'Votre avis est enregistré ici. Vous pouvez aussi le partager sur Google.', back: 'Retour au menu',
    sent: 'Addition transmise au serveur.', manual: 'Paiement envoyé pour validation par le restaurant.',
    reviewBlocked: 'Un avis a déjà été envoyé depuis cet appareil pour cette puce récemment.',
    certification: 'Digifeel n’est pas un logiciel de caisse certifié NF525. Ce ticket est un justificatif d’information.',
    loading: 'Chargement de votre table…', error: 'Une erreur est survenue.', one: '1 personne',
    missingName: 'Saisissez le nom du restaurant et votre nom.', serverCall: 'Le serveur a été appelé.',
    alreadyReviewed: 'Votre avis a déjà été reçu. Merci.', other: 'Autre montant', payItems: 'Sélectionnez les articles à régler',
    empty: 'Aucune addition en cours. Vous pouvez laisser un avis sur votre expérience.',
    months: ['Pack essentiel', 'Pack équipe', 'Pack complet'],
    menu: 'Menu', basket: 'Votre panier', order: 'Envoyer la commande', orderSent: 'Commande envoyée au serveur pour validation.',
    orderPending: 'En attente de validation', orderPreparing: 'En préparation', orderReady: 'Votre commande est prête', orderServed: 'Commande servie',
    noProducts: 'Aucun produit dans cette catégorie.', vegetarian: 'Végétarien', glutenFree: 'Sans gluten', unavailable: 'Indisponible',
    allergens: 'Allergènes', description: 'Description', preferences: 'Filtres', kitchenNote: 'Note pour la cuisine', callServer: 'Appeler le serveur',
    requestBill: 'Demander l’addition', menuEmpty: 'Votre panier est vide.', pendingOrder: 'Commande à confirmer',
    criteria: 'Évaluer quelques critères (facultatif)', dish: 'Cuisine', service: 'Service', ambiance: 'Ambiance', cleanliness: 'Propreté',
    loyalty: 'Cumuler mes points (facultatif)', contact: 'E-mail ou téléphone'
  },
  ar: {
    scan: 'طاولتك بلمسة واحدة.', activated: 'الشريحة مفعّلة', table: 'طاولة', bill: 'فاتورتك',
    updated: 'يحدّث النادل الفاتورة مباشرة.', notActivated: 'هذه الشريحة غير مفعّلة بعد.',
    activate: 'تفعيل هذه الطاولة', restaurant: 'اسم المطعم', owner: 'اسمك', city: 'المدينة', resellerCode: 'رمز الموزع (اختياري)',
    google: 'رابط تقييم Google', package: 'حزمة التثبيت', proceed: 'إنشاء الحساب', install: 'التثبيت ·', freeMonth: 'الشهر الأول مجاني',
    unknown: 'هذا الرمز غير مرتبط بأي شريحة معروفة.', notAvailable: 'الشريحة معطلة أو غير متاحة.',
    subtotal: 'المجموع دون الضريبة', vat: 'الضريبة', total: 'المجموع شامل الضريبة', paid: 'المدفوع', balance: 'المبلغ المتبقي',
    pay: 'الدفع', all: 'دفع كامل المبلغ', split: 'تقسيم بالتساوي', guests: 'الأشخاص', items: 'دفع منتجات محددة',
    custom: 'مبلغ مخصص', amount: 'المبلغ', card: 'بطاقة تجريبية', cash: 'نقداً · نادِ النادل',
    local: 'دفع محلي · بانتظار التحقق', simulator: 'محاكاة فقط · لا يتم تحصيل أي مبلغ',
    addTip: 'إضافة إكرامية', noTip: 'بدون إكرامية', tip: 'الإكرامية', continue: 'متابعة', receipt: 'تنزيل الإيصال',
    review: 'كيف كانت وجبتك؟', reviewsCount: 'رأيك', remove: 'حذف هذا المنتج', choose: 'اختر تقييماً', comment: 'تعليقك (اختياري)',
    quick: ['خدمة ممتازة', 'وجبة لذيذة', 'بحاجة للتحسين'], server: 'النادل', skip: 'تخطي هذه الخطوة',
    saveReview: 'إرسال رأيي', thanks: 'شكراً على رأيك.', googleBtn: 'انسخ وانشر على Google',
    googleInfo: 'تم حفظ رأيك هنا. يمكنك أيضاً مشاركته على Google.', back: 'العودة إلى القائمة',
    sent: 'تم إرسال طلب الفاتورة للنادل.', manual: 'تم إرسال الدفع للتحقق من المطعم.',
    reviewBlocked: 'تم إرسال رأي من هذا الجهاز لهذه الشريحة مؤخراً.',
    certification: 'Digifeel غير معتمد NF525. هذا الإيصال للمعلومات فقط.',
    loading: 'جارٍ تحميل طاولتك…', error: 'حدث خطأ.', one: 'شخص واحد',
    missingName: 'أدخل اسم المطعم واسمك.', serverCall: 'تم استدعاء النادل.',
    alreadyReviewed: 'تم استلام رأيك مسبقاً. شكراً.', other: 'مبلغ آخر', payItems: 'اختر المنتجات للدفع',
    empty: 'لا توجد فاتورة حالياً. يمكنك تقييم تجربتك.',
    months: ['الحزمة الأساسية', 'حزمة الفريق', 'الحزمة الكاملة'],
    menu: 'القائمة', basket: 'سلتك', order: 'إرسال الطلب', orderSent: 'تم إرسال الطلب للنادل للموافقة.',
    orderPending: 'بانتظار الموافقة', orderPreparing: 'قيد التحضير', orderReady: 'طلبك جاهز', orderServed: 'تم تقديم الطلب',
    noProducts: 'لا توجد منتجات في هذا القسم.', vegetarian: 'نباتي', glutenFree: 'خالٍ من الغلوتين', unavailable: 'غير متوفر',
    allergens: 'مسببات الحساسية', description: 'الوصف', preferences: 'التصفية', kitchenNote: 'ملاحظة للمطبخ', callServer: 'نادِ النادل',
    requestBill: 'اطلب الفاتورة', menuEmpty: 'سلتك فارغة.', pendingOrder: 'طلب بانتظار التأكيد',
    criteria: 'تقييم بعض الجوانب (اختياري)', dish: 'الطعام', service: 'الخدمة', ambiance: 'الأجواء', cleanliness: 'النظافة',
    loyalty: 'اجمع نقاط الولاء (اختياري)', contact: 'البريد الإلكتروني أو الهاتف'
  },
  en: {
    scan: 'Your table, one scan away.', activated: 'Tag active', table: 'Table', bill: 'Your bill',
    updated: 'Your server updates the bill live.', notActivated: 'This tag has not been activated yet.',
    activate: 'Activate this table', restaurant: 'Restaurant name', owner: 'Your name', city: 'City', resellerCode: 'Reseller code (optional)',
    google: 'Google review link', package: 'Setup pack', proceed: 'Create account', install: 'Setup ·', freeMonth: 'First month free',
    unknown: 'This code is not linked to a known tag.', notAvailable: 'This tag is disabled or unavailable.',
    subtotal: 'Subtotal excl. tax', vat: 'Tax', total: 'Total incl. tax', paid: 'Paid', balance: 'Balance due',
    pay: 'Pay', all: 'Pay full amount', split: 'Split equally', guests: 'Guests', items: 'Pay selected items',
    custom: 'Custom amount', amount: 'Amount', card: 'Simulated card', cash: 'Cash · call server',
    local: 'Local payment · awaiting approval', simulator: 'Simulation only · no real payment is processed',
    addTip: 'Add a tip', noTip: 'No tip', tip: 'Tip', continue: 'Continue', receipt: 'Download receipt',
    review: 'How was your meal?', reviewsCount: 'Your review', remove: 'Remove this item', choose: 'Choose a rating', comment: 'Your comment (optional)',
    quick: ['Attentive service', 'Great meal', 'Room to improve'], server: 'Your server', skip: 'Skip this step',
    saveReview: 'Submit my review', thanks: 'Thank you for your feedback.', googleBtn: 'Copy and post on Google',
    googleInfo: 'Your review is saved here. You can also share it on Google.', back: 'Back to the menu',
    sent: 'Your server has been notified.', manual: 'Payment sent to the restaurant for approval.',
    reviewBlocked: 'A review was recently submitted from this device for this tag.',
    certification: 'Digifeel is not NF525 certified. This receipt is informational only.',
    loading: 'Loading your table…', error: 'Something went wrong.', one: 'One guest',
    missingName: 'Enter the restaurant and owner name.', serverCall: 'Your server has been called.',
    alreadyReviewed: 'Your review was already received. Thank you.', other: 'Other amount', payItems: 'Select items to pay',
    empty: 'There is no open bill. You can leave a review for your visit.',
    months: ['Essential pack', 'Team pack', 'Full pack'],
    menu: 'Menu', basket: 'Your basket', order: 'Send order', orderSent: 'Your order was sent to the server for approval.',
    orderPending: 'Awaiting approval', orderPreparing: 'Being prepared', orderReady: 'Your order is ready', orderServed: 'Order served',
    noProducts: 'No products in this category.', vegetarian: 'Vegetarian', glutenFree: 'Gluten-free', unavailable: 'Unavailable',
    allergens: 'Allergens', description: 'Description', preferences: 'Filters', kitchenNote: 'Note for the kitchen', callServer: 'Call the server',
    requestBill: 'Request the bill', menuEmpty: 'Your basket is empty.', pendingOrder: 'Order awaiting confirmation',
    criteria: 'Rate a few details (optional)', dish: 'Food', service: 'Service', ambiance: 'Atmosphere', cleanliness: 'Cleanliness',
    loyalty: 'Collect loyalty points (optional)', contact: 'Email or phone'
  }
} as const;

function money(value: number, currency: 'EUR' | 'DZD', locale: Lang) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency', currency, maximumFractionDigits: currency === 'DZD' ? 0 : 2
  }).format(value);
}

export function GuestTableExperience({ code }: { code: string }) {
  const [lang, setLang] = useState<Lang>('fr');
  const t: GuestCopy = text[lang];
  const [loading, setLoading] = useState(true);
  const [tagState, setTagState] = useState<'unknown' | 'inactive' | 'activation' | 'active'>('unknown');
  const [billState, setBillState] = useState<BillContext | null>(null);
  const [stars, setStars] = useState(0);
  const [criteria, setCriteria] = useState<NonNullable<RestaurantReview['criteria']>>({});
  const [comment, setComment] = useState('');
  const [waiterId, setWaiterId] = useState('');
  const [phase, setPhase] = useState<'menu' | 'cart' | 'bill' | 'tip' | 'review' | 'thanks'>('menu');
  const [payMode, setPayMode] = useState<'all' | 'split' | 'items' | 'custom'>('all');
  const [guests, setGuests] = useState('2');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [tipChoice, setTipChoice] = useState('0');
  const [tipAmount, setTipAmount] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<RestaurantReview | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [pack, setPack] = useState(100);
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('');
  const [resellerCode, setResellerCode] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'DZD'>('DZD');
  const [ticketDisclaimer, setTicketDisclaimer] = useState<string>(t.certification);
  const [menu, setMenu] = useState<GuestMenu | null>(null);
  const [cart, setCart] = useState<GuestCart>({});
  const [menuCategory, setMenuCategory] = useState('');
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [glutenFreeOnly, setGlutenFreeOnly] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [loyaltyName, setLoyaltyName] = useState('');
  const [loyaltyContact, setLoyaltyContact] = useState('');
  const scanned = useRef(false);
  const billStateRef = useRef<BillContext | null>(null);

  const setBillContext = (context: BillContext | null) => {
    billStateRef.current = context;
    setBillState(context);
  };

  const refreshBill = useCallback(async () => {
    const found = await getBillForTag(code);
    if (found.tag) setTagState('active');
    if (found.bill?.bill.clientVisible) {
      setBillContext(found.bill);
      if (found.bill.restaurant) setCurrency(found.bill.restaurant.currency);
      setTicketDisclaimer(found.bill.restaurant?.name ? `${found.bill.restaurant.name} · ${t.certification}` : t.certification);
      if (found.bill.waiter) setWaiterId(found.bill.waiter.id);
      const currentReview = (await getRestaurantData()).reviews.find(item => item.billId === found.bill?.bill.id);
      if (currentReview) {
        setReview(currentReview);
        setAlreadyReviewed(true);
        setPhase('thanks');
      }
    } else if (billStateRef.current?.bill.status !== 'paid') setBillContext(null);
  }, [code, t.certification]);

  const refreshMenu = useCallback(async () => {
    const nextMenu = await getPublicMenuForTag(code);
    setMenu(nextMenu);
  }, [code]);

  useEffect(() => {
    setResellerCode(new URLSearchParams(window.location.search).get('reseller') ?? '');
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const tag = await getTagByCode(code);
        if (!alive) return;
        if (!tag) setTagState('unknown');
        else if (!tag.active) setTagState('inactive');
        else if (!tag.restaurantId || !tag.tableId) setTagState('activation');
        else {
          setTagState('active');
          setPhase('menu');
          if (!scanned.current) {
            scanned.current = true;
            await recordTagScan(code);
          }
          await refreshBill();
          await refreshMenu();
          const blockUntil = Number(localStorage.getItem(`digifeel-review:${code}`) ?? '0');
          if (blockUntil > Date.now()) {
            setAlreadyReviewed(true);
            setPhase('thanks');
          }
        }
        if (alive) setLoading(false);
      } catch (loadError) {
        if (alive) { setError(loadError instanceof Error ? loadError.message : t.error); setLoading(false); }
      }
    })();
    const unsubscribe = subscribeRestaurantData(() => { void refreshBill(); void refreshMenu(); });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [code, refreshBill, refreshMenu, t.error]);

  const current = billState?.bill ?? null;
  const totals = current && billState ? billTotals(current, billState.payments) : null;
  const restaurant = billState?.restaurant ?? null;
  const displayedBill = current?.clientVisible && totals && totals.total > 0;
  const customerAmount = payMode === 'split'
    ? Math.min(totals?.balance ?? 0, Math.ceil((totals?.total ?? 0) / Math.max(1, Number(guests))))
    : payMode === 'custom'
      ? Math.min(totals?.balance ?? 0, Math.max(0, Number(customAmount) || 0))
      : payMode === 'items' && current && totals
        ? Math.min(totals.balance, current.lines.filter(line => selectedLines.includes(line.id)).reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 + line.taxRate / 100), 0))
        : totals?.balance ?? 0;

  const selectLang = () => {
    setLang(currentLang => currentLang === 'fr' ? 'ar' : currentLang === 'ar' ? 'en' : 'fr');
  };

  const cartCount = Object.values(cart).reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = menu ? Object.entries(cart).reduce((sum, [itemId, line]) => {
    const item = menu.items.find(product => product.id === itemId);
    return sum + (item?.price ?? 0) * line.quantity;
  }, 0) : 0;

  const sendGuestOrder = async () => {
    if (!cartCount) { setError(t.menuEmpty); return; }
    setSaving(true);
    setError('');
    try {
      await createGuestOrder({
        tagCode: code,
        customerNote,
        lines: Object.entries(cart).map(([itemId, line]) => ({ itemId, quantity: line.quantity, note: line.note }))
      });
      setCart({});
      setCustomerNote('');
      setNotice(t.orderSent);
      await refreshMenu();
      setPhase('menu');
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const callTableServer = async () => {
    if (!menu) return;
    setSaving(true);
    setError('');
    try {
      await callServer(menu.table.id);
      setNotice(t.serverCall);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const requestTableBill = async () => {
    if (!menu) return;
    setSaving(true);
    setError('');
    try {
      await requestBill(menu.table.id);
      setNotice(t.sent);
      setPhase(displayedBill ? 'bill' : 'menu');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const submitActivation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (restaurantName.trim().length < 2 || ownerName.trim().length < 2) { setError(t.missingName); return; }
    setSaving(true);
    setError('');
    try {
      const { activateTag } = await import('@/src/services/restaurant');
      const payment = await paymentProvider.charge({ amount: pack, currency: 'EUR', method: 'simulation', description: 'Pack d’installation Digifeel' });
      const restaurant = await activateTag({ code, restaurantName, ownerName, city, googleReviewUrl, currency, packPrice: pack, resellerCode });
      await recordResellerPlatformPayment({
        restaurantId: restaurant.id, amountEUR: pack, kind: 'installation', reference: payment.reference,
        status: payment.status === 'paid' ? 'validated' : 'pending'
      });
      setTagState('active');
      setNotice(t.freeMonth);
      setLoading(true);
      await refreshBill();
      setLoading(false);
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const pay = async () => {
    if (!current || !totals || customerAmount <= 0) { setError(t.error); return; }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (loyaltyContact.trim()) await linkLoyaltyCustomer(current.id, loyaltyName, loyaltyContact);
      if (paymentMethod === 'cash') {
        await requestBill(current.tableId);
        setNotice(t.serverCall);
        return;
      }
      const payment = await paymentProvider.charge({ amount: customerAmount, currency: current.currency, method: paymentMethod, description: `Addition ${billState?.table?.name ?? ''}` });
      await payBill(current.id, customerAmount, paymentMethod === 'local_manual' ? 'baridimob' : paymentMethod === 'card' ? 'card' : 'terminal', payment.status === 'paid' ? 'paid' : 'manual', payment.reference);
      if (payment.status === 'pending_manual') {
        setNotice(t.manual);
        return;
      }
      await refreshBill();
      const fresh = await getBillForTag(code);
      if (fresh.bill) setBillContext(fresh.bill);
      else {
        const paidBill = await getBill(current.id);
        if (paidBill) setBillContext(paidBill);
      }
      setPhase('tip');
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const addBillTip = async () => {
    if (!current) { setPhase('review'); return; }
    const amount = tipChoice === 'custom' ? Number(tipAmount) : Math.round((Number(tipChoice) / 100) * (totals?.total ?? 0));
    if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) { setError(t.error); return; }
    setSaving(true);
    setError('');
    try {
      if (amount > 0) await addTip(current.id, amount, paymentMethod === 'local_manual' ? 'manual' : 'paid');
      setPhase('review');
    } catch (tipError) {
      setError(tipError instanceof Error ? tipError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!stars) { setError(t.choose); return; }
    const lockKey = `digifeel-review:${code}`;
    const lock = Number(localStorage.getItem(lockKey) ?? '0');
    if (lock > Date.now()) { setAlreadyReviewed(true); setError(t.reviewBlocked); return; }
    setSaving(true);
    setError('');
    try {
      const deviceFingerprint = await getReviewDeviceFingerprint();
      let result: RestaurantReview;
      if (current && restaurant) {
        result = await createReview({ restaurantId: restaurant.id, billId: current.id, tableId: current.tableId, waiterId: waiterId || current.waiterId, stars, comment, criteria, deviceFingerprint });
      } else {
        result = await createReviewForTag(code, stars, comment, waiterId || undefined, criteria, deviceFingerprint);
      }
      localStorage.setItem(lockKey, String(Date.now() + 8 * 60 * 60 * 1000));
      setReview(result);
      setAlreadyReviewed(true);
      setPhase('thanks');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const downloadReceipt = async () => {
    if (!current || !totals || !billState) return;
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: [80, Math.max(130, 90 + current.lines.length * 12)] });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text(restaurant?.name ?? 'DIGIFEEL', 6, 12);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`${billState.table?.name ?? t.table} · ${new Date(current.createdAt).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR')}`, 6, 20);
      let y = 32;
      for (const line of current.lines) {
        pdf.text(`${line.quantity} × ${line.name}`, 6, y, { maxWidth: 50 });
        pdf.text(money(line.quantity * line.unitPrice, current.currency, lang), 74, y, { align: 'right' });
        y += 8;
        if (line.note) { pdf.setFontSize(7); pdf.text(line.note, 8, y); pdf.setFontSize(9); y += 6; }
      }
      y += 3;
      pdf.text(`${t.subtotal} : ${money(totals.subtotal, current.currency, lang)}`, 6, y); y += 7;
      pdf.text(`${t.vat} : ${money(totals.tax, current.currency, lang)}`, 6, y); y += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${t.total} : ${money(totals.total, current.currency, lang)}`, 6, y); y += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(ticketDisclaimer, 6, y, { maxWidth: 68 });
      pdf.save(`digifeel-ticket-${current.id.slice(0, 8)}.pdf`);
    } catch (receiptError) {
      setError(receiptError instanceof Error ? receiptError.message : t.error);
    }
  };

  const publishToGoogle = async () => {
    if (review?.comment && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(review.comment);
      } catch {
        setNotice(t.googleInfo);
      }
    }
  };

  if (loading) return <main className="guest-shell"><div className="guest-loading"><LoaderCircle className="guest-spinner" /><p>{t.loading}</p></div></main>;

  return (
    <main className={`guest-shell ${lang === 'ar' ? 'is-rtl' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="guest-orbit guest-orbit-one" /><div className="guest-orbit guest-orbit-two" />
      <header className="guest-header"><Link href="/" className="guest-brand"><span className="pos-brand-mark"><Utensils size={18} /></span>DIGIFEEL</Link><div className="guest-header-controls"><ThemePicker locale={lang} compact /><button type="button" onClick={selectLang}>{lang === 'fr' ? 'العربية' : lang === 'ar' ? 'EN' : 'FR'}</button></div></header>
      <section className="guest-card">
        <div className="guest-kicker"><span className="guest-status-dot" />{tagState === 'active' ? t.activated : t.scan}</div>
        {tagState === 'unknown' && <div className="guest-error-state"><CircleAlert /><h1>{t.unknown}</h1><Link href="/" className="guest-secondary-button"><ArrowLeft size={17} />{t.back}</Link></div>}
        {tagState === 'inactive' && <div className="guest-error-state"><CircleAlert /><h1>{t.notAvailable}</h1></div>}
        {tagState === 'activation' && <form className="guest-activation" onSubmit={submitActivation}>
          <span className="guest-eyebrow">{t.activate} · {code}</span><h1>{t.notActivated}</h1>
          <p>{t.install} {money(pack, 'EUR', lang)} · {t.freeMonth}</p>
          <label>{t.restaurant}<input required minLength={2} value={restaurantName} onChange={event => setRestaurantName(event.target.value)} /></label>
          <label>{t.owner}<input required minLength={2} value={ownerName} onChange={event => setOwnerName(event.target.value)} /></label>
          <label>{t.city}<input value={city} onChange={event => setCity(event.target.value)} /></label>
          <label>{t.resellerCode}<input maxLength={40} value={resellerCode} onChange={event => setResellerCode(event.target.value.toUpperCase())} /></label>
          <label>{t.google}<input required type="url" inputMode="url" placeholder="https://g.page/r/…" value={googleReviewUrl} onChange={event => setGoogleReviewUrl(event.target.value)} /></label>
          <label>{t.package}<select value={pack} onChange={event => setPack(Number(event.target.value))}>{[100, 90, 60].map((price, index) => <option key={price} value={price}>{t.months[index]} · {money(price, currency, lang)}</option>)}</select></label>
          <label>{t.amount}<select value={currency} onChange={event => setCurrency(event.target.value as 'EUR' | 'DZD')}><option value="DZD">DZD · Algérie</option><option value="EUR">EUR · France</option></select></label>
          <button type="submit" className="guest-primary-button" disabled={saving}>{saving ? <LoaderCircle className="guest-spinner" /> : <Check />}{t.proceed}</button>
        </form>}

        {tagState === 'active' && <>
          <nav className="guest-view-tabs" aria-label="Navigation client">
            <button type="button" className={phase === 'menu' ? 'is-active' : ''} onClick={() => setPhase('menu')}>{t.menu}</button>
            {displayedBill && <button type="button" className={phase === 'bill' ? 'is-active' : ''} onClick={() => setPhase('bill')}>{t.bill}</button>}
            <button type="button" className={phase === 'review' || phase === 'thanks' ? 'is-active' : ''} onClick={() => setPhase(alreadyReviewed ? 'thanks' : 'review')}>{t.reviewsCount}</button>
          </nav>
          {phase === 'menu' || phase === 'cart' ? <GuestMenuView
            t={t} lang={lang} menu={menu} cart={cart} setCart={setCart} view={phase} category={menuCategory} setCategory={setMenuCategory}
            vegetarianOnly={vegetarianOnly} setVegetarianOnly={setVegetarianOnly} glutenFreeOnly={glutenFreeOnly} setGlutenFreeOnly={setGlutenFreeOnly}
            customerNote={customerNote} setCustomerNote={setCustomerNote} count={cartCount} total={cartTotal} saving={saving}
            onOpenCart={() => setPhase('cart')} onBack={() => setPhase('menu')} onSendOrder={() => void sendGuestOrder()}
            onCallServer={() => void callTableServer()} onRequestBill={() => void requestTableBill()}
          /> : !displayedBill ? phase === 'thanks' ? <div className="guest-thanks"><span className="guest-check-mark"><Check /></span><span className="guest-eyebrow">{t.activated}</span><h1>{t.thanks}</h1><p>{t.googleInfo}</p><a className="guest-primary-button" href={restaurant?.googleReviewUrl || 'https://www.google.com/'} target="_blank" rel="noreferrer" onClick={() => void publishToGoogle()}><Copy />{t.googleBtn}</a>{notice && <p className="guest-status-message">{notice}</p>}</div> : <ReviewForm
          t={t} stars={stars} setStars={setStars} criteria={criteria} setCriteria={setCriteria} comment={comment} setComment={setComment} waiterId={waiterId} setWaiterId={setWaiterId}
          restaurant={restaurant} bill={null} onSubmit={() => void submitReview()} saving={saving}
          alreadyReviewed={alreadyReviewed}
        /> : phase === 'review' || phase === 'thanks' ? <div className="guest-after-payment">
          {phase === 'thanks' ? <><span className="guest-check-mark"><Check /></span><span className="guest-eyebrow">{t.activated}</span><h1>{t.thanks}</h1><p>{t.googleInfo}</p><a className="guest-primary-button" href={restaurant?.googleReviewUrl || 'https://www.google.com/'} target="_blank" rel="noreferrer" onClick={() => void publishToGoogle()}><Copy />{t.googleBtn}</a><button className="guest-secondary-button" onClick={() => void downloadReceipt()} type="button"><ReceiptText />{t.receipt}</button></> :
            <ReviewForm t={t} stars={stars} setStars={setStars} criteria={criteria} setCriteria={setCriteria} comment={comment} setComment={setComment} waiterId={waiterId} setWaiterId={setWaiterId} restaurant={restaurant} bill={billState} onSubmit={() => void submitReview()} saving={saving} alreadyReviewed={alreadyReviewed} />}
        </div> : phase === 'tip' ? <div className="guest-tip-step"><span className="guest-eyebrow">{t.paid}</span><h1>{t.addTip}</h1><p>{t.tip} · {money(totals?.total ?? 0, current?.currency ?? currency, lang)}</p><div className="guest-tip-options">{['0', '5', '10', '15', 'custom'].map(value => <button type="button" key={value} className={tipChoice === value ? 'is-active' : ''} onClick={() => setTipChoice(value)}>{value === '0' ? t.noTip : value === 'custom' ? t.other : `${value}%`}</button>)}</div>{tipChoice === 'custom' && <label>{t.amount}<input type="number" min="0" value={tipAmount} onChange={event => setTipAmount(event.target.value)} /></label>}<button type="button" className="guest-primary-button" onClick={() => void addBillTip()} disabled={saving}>{t.continue}</button><button type="button" className="guest-quiet-button" onClick={() => setPhase('review')}>{t.noTip}</button></div>
        : <BillPayment
          t={t} currency={currency} state={billState} totals={totals} payMode={payMode} setPayMode={setPayMode} guests={guests} setGuests={setGuests}
          customAmount={customAmount} setCustomAmount={setCustomAmount} selectedLines={selectedLines} setSelectedLines={setSelectedLines}
          paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} amount={customerAmount} saving={saving} onPay={() => void pay()}
          onReview={() => setPhase('review')} onReceipt={() => void downloadReceipt()} notice={notice} lang={lang}
          loyaltyName={loyaltyName} setLoyaltyName={setLoyaltyName} loyaltyContact={loyaltyContact} setLoyaltyContact={setLoyaltyContact}
        />}</>}
        {error && <p className="guest-error-message" role="alert"><CircleAlert size={16} />{error}</p>}
      </section>
      <footer className="guest-footer">{t.certification} · <span>{t.simulator}</span></footer>
    </main>
  );
}

function GuestMenuView({ t, lang, menu, cart, setCart, view, category, setCategory, vegetarianOnly, setVegetarianOnly, glutenFreeOnly, setGlutenFreeOnly, customerNote, setCustomerNote, count, total, saving, onOpenCart, onBack, onSendOrder, onCallServer, onRequestBill }: {
  t: GuestCopy; lang: Lang; menu: GuestMenu | null; cart: GuestCart; setCart: (cart: GuestCart) => void; view: 'menu' | 'cart';
  category: string; setCategory: (categoryId: string) => void; vegetarianOnly: boolean; setVegetarianOnly: (value: boolean) => void;
  glutenFreeOnly: boolean; setGlutenFreeOnly: (value: boolean) => void; customerNote: string; setCustomerNote: (note: string) => void;
  count: number; total: number; saving: boolean; onOpenCart: () => void; onBack: () => void; onSendOrder: () => void;
  onCallServer: () => void; onRequestBill: () => void;
}) {
  if (!menu) return <div className="guest-empty-bill"><ReceiptText /><h1>{t.menuEmpty}</h1></div>;
  const visibleItems = menu.items.filter(item => item.available && (!category || item.categoryId === category) &&
    (!vegetarianOnly || item.vegetarian) && (!glutenFreeOnly || item.glutenFree));
  const getName = (item: GuestMenu['items'][number]) => item.translations?.[lang]?.name || item.name;
  const getDescription = (item: GuestMenu['items'][number]) => item.translations?.[lang]?.description || item.description || '';
  const orderStatus = (status: string) => status === 'pending' ? t.orderPending : status === 'new' || status === 'preparing' ? t.orderPreparing : status === 'ready' ? t.orderReady : t.orderServed;
  const modifyItem = (itemId: string, change: number) => {
    const current = cart[itemId]?.quantity ?? 0;
    const quantity = Math.max(0, Math.min(20, current + change));
    const next = { ...cart };
    if (!quantity) delete next[itemId];
    else next[itemId] = { quantity, note: next[itemId]?.note ?? '' };
    setCart(next);
  };
  const updateNote = (itemId: string, note: string) => setCart({ ...cart, [itemId]: { ...cart[itemId], quantity: cart[itemId]?.quantity ?? 1, note } });

  return <section className="guest-menu-view">
    {menu.orders.length > 0 && <div className="guest-order-status"><span className="guest-status-dot" /><strong>{orderStatus(menu.orders[0].status)}</strong><small>{menu.orders[0].lines.map(line => `${line.quantity}× ${line.name}`).join(' · ')}</small></div>}
    <div className="guest-menu-heading"><span className="guest-eyebrow">{menu.restaurant.name} · {menu.table.name}</span><h1>{view === 'cart' ? t.basket : t.menu}</h1></div>
    {count > 0 && <div className="guest-menu-toolbar"><button type="button" className="guest-primary-button guest-cart-button" onClick={onOpenCart}><ShoppingBag size={17} />{t.basket} · {count} · {money(total, menu.restaurant.currency, lang)}</button></div>}
    {view === 'cart' ? <div className="guest-cart-page">
      <button type="button" className="guest-quiet-button guest-cart-back" onClick={onBack}><ArrowLeft size={15} />{t.menu}</button>
      {count === 0 ? <p>{t.menuEmpty}</p> : <>
        <div className="guest-cart-lines">{Object.entries(cart).map(([itemId, line]) => {
          const item = menu.items.find(entry => entry.id === itemId);
          if (!item) return null;
          return <article key={item.id}><div><strong>{getName(item)}</strong><small>{money(item.price * line.quantity, menu.restaurant.currency, lang)}</small></div><div className="guest-cart-quantity"><button type="button" aria-label={t.remove} onClick={() => modifyItem(item.id, -1)}><Minus /></button><span>{line.quantity}</span><button type="button" aria-label={t.order} onClick={() => modifyItem(item.id, 1)}><Plus /></button></div><input aria-label={t.kitchenNote} maxLength={120} value={line.note} placeholder="Ex. sans oignon" onChange={event => updateNote(item.id, event.target.value)} /></article>;
        })}</div>
        <label className="guest-kitchen-note">{t.kitchenNote}<textarea rows={2} maxLength={400} value={customerNote} onChange={event => setCustomerNote(event.target.value)} /></label>
        <div className="guest-cart-total"><span>{t.total}</span><strong>{money(total, menu.restaurant.currency, lang)}</strong></div>
        <button type="button" className="guest-primary-button" disabled={saving} onClick={onSendOrder}>{saving ? <LoaderCircle className="guest-spinner" /> : <Check />}{t.order}</button>
      </>}
    </div> : <>
      <div className="guest-menu-filter-row"><span>{t.preferences}</span><button type="button" className={vegetarianOnly ? 'is-active' : ''} onClick={() => setVegetarianOnly(!vegetarianOnly)}>{t.vegetarian}</button><button type="button" className={glutenFreeOnly ? 'is-active' : ''} onClick={() => setGlutenFreeOnly(!glutenFreeOnly)}>{t.glutenFree}</button></div>
      <div className="guest-menu-categories"><button type="button" className={!category ? 'is-active' : ''} onClick={() => setCategory('')}>{t.menu}</button>{menu.categories.map(item => <button type="button" className={category === item.id ? 'is-active' : ''} key={item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div>
      {visibleItems.length === 0 ? <p className="guest-menu-empty">{t.noProducts}</p> : <div className="guest-menu-products">{visibleItems.map(item => <article key={item.id}>
        {item.photoUrl ? <img src={item.photoUrl} alt="" loading="lazy" /> : <div className="guest-product-placeholder"><Utensils /></div>}
        <div className="guest-product-info"><span>{menu.categories.find(entry => entry.id === item.categoryId)?.name}</span><h3>{getName(item)}</h3><p>{getDescription(item)}</p>{item.allergens && item.allergens.length > 0 && <small>{t.allergens}: {item.allergens.join(', ')}</small>}<div className="guest-product-badges">{item.vegetarian && <i>{t.vegetarian}</i>}{item.glutenFree && <i>{t.glutenFree}</i>}</div><strong>{money(item.price, menu.restaurant.currency, lang)}</strong></div>
        <button type="button" className="guest-product-add" aria-label={`${t.order} ${getName(item)}`} onClick={() => modifyItem(item.id, 1)}>{cart[item.id] ? `${cart[item.id].quantity} · ` : ''}<Plus /></button>
      </article>)}</div>}
      <div className="guest-table-actions"><button type="button" className="guest-secondary-button" disabled={saving} onClick={onCallServer}><Bell size={16} />{t.callServer}</button><button type="button" className="guest-secondary-button" disabled={saving} onClick={onRequestBill}><ReceiptText size={16} />{t.requestBill}</button></div>
      {count > 0 && <button type="button" className="guest-primary-button guest-sticky-cart" onClick={onOpenCart}>{t.basket} · {count} <strong>{money(total, menu.restaurant.currency, lang)}</strong></button>}
    </>}
  </section>;
}

function ReviewForm({ t, stars, setStars, criteria, setCriteria, comment, setComment, waiterId, setWaiterId, restaurant, bill, onSubmit, saving, alreadyReviewed }: {
  t: GuestCopy; stars: number; setStars: (stars: number) => void; criteria: NonNullable<RestaurantReview['criteria']>; setCriteria: (criteria: NonNullable<RestaurantReview['criteria']>) => void; comment: string; setComment: (comment: string) => void;
  waiterId: string; setWaiterId: (waiterId: string) => void; restaurant: BillContext['restaurant'] | null;
  bill: BillContext | null; onSubmit: () => void; saving: boolean; alreadyReviewed: boolean;
}) {
  const [waiters, setWaiters] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    let mounted = true;
    void getWaiters(restaurant?.id).then(items => {
      if (mounted) setWaiters(items.filter(item => item.active));
    });
    return () => { mounted = false; };
  }, [restaurant?.id]);
  return <form className="guest-review-step" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
    <span className="guest-eyebrow">{restaurant?.name ?? 'DIGIFEEL'}</span><h1>{t.review}</h1><p>{t.choose}</p>
    <div className="guest-star-row" role="radiogroup" aria-label={t.choose}>{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} role="radio" aria-checked={stars === value} aria-label={`${value} / 5`} className={stars >= value ? 'is-lit' : ''} onClick={() => setStars(value)}><Star fill="currentColor" /></button>)}</div>
    <div className="guest-quick-reviews">{t.quick.map(phrase => <button type="button" key={phrase} onClick={() => setComment(comment ? `${comment} ${phrase}.` : `${phrase}.`)}>{phrase}</button>)}</div>
    <details className="guest-review-criteria"><summary>{t.criteria}</summary>{(['dish', 'service', 'ambiance', 'cleanliness'] as const).map(key => <div key={key}><span>{t[key]}</span><div>{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} aria-label={`${t[key]} ${value}/5`} className={(criteria[key] ?? 0) >= value ? 'is-lit' : ''} onClick={() => setCriteria({ ...criteria, [key]: value })}><Star fill="currentColor" /></button>)}</div></div>)}</details>
    <label>{t.comment}<textarea value={comment} maxLength={1200} rows={4} onChange={event => setComment(event.target.value)} placeholder={t.comment} /></label>
    {waiters.length > 0 && <label>{t.server}<select value={waiterId || bill?.bill.waiterId || ''} onChange={event => setWaiterId(event.target.value)}><option value="">—</option>{waiters.map(waiter => <option value={waiter.id} key={waiter.id}>{waiter.name}</option>)}</select></label>}
    <button type="submit" className="guest-primary-button" disabled={saving || alreadyReviewed}>{saving ? <LoaderCircle className="guest-spinner" /> : <Check />}{alreadyReviewed ? t.alreadyReviewed : t.saveReview}</button>
  </form>;
}

function BillPayment({ t, lang, currency, state, totals, payMode, setPayMode, guests, setGuests, customAmount, setCustomAmount, selectedLines, setSelectedLines, paymentMethod, setPaymentMethod, amount, saving, onPay, onReview, onReceipt, notice, loyaltyName, setLoyaltyName, loyaltyContact, setLoyaltyContact }: {
  t: GuestCopy; currency: 'EUR' | 'DZD'; state: BillContext | null; totals: ReturnType<typeof billTotals> | null;
  payMode: 'all' | 'split' | 'items' | 'custom'; setPayMode: (mode: 'all' | 'split' | 'items' | 'custom') => void;
  guests: string; setGuests: (value: string) => void; customAmount: string; setCustomAmount: (value: string) => void;
  selectedLines: string[]; setSelectedLines: (ids: string[]) => void; paymentMethod: PaymentMethod; setPaymentMethod: (method: PaymentMethod) => void;
  amount: number; saving: boolean; onPay: () => void; onReview: () => void; onReceipt: () => void; notice: string; lang: Lang;
  loyaltyName: string; setLoyaltyName: (value: string) => void; loyaltyContact: string; setLoyaltyContact: (value: string) => void;
}) {
  if (!state || !totals) return <div className="guest-empty-bill"><ReceiptText /><h1>{t.empty}</h1><button type="button" className="guest-primary-button" onClick={onReview}>{t.saveReview}</button></div>;
  return <div className="guest-bill-view">
    <span className="guest-eyebrow">{state.restaurant?.name ?? 'DIGIFEEL'} · {state.table?.name ?? t.table}</span><h1>{t.bill}</h1><p>{t.updated}</p>
    <div className="guest-bill-lines">
      {state.bill.lines.map(line => (
        <article key={line.id}>
          <span className="guest-line-quantity">{line.quantity}×</span>
          <span><strong>{line.name}</strong>{line.note && <small>{line.note}</small>}</span>
          <b>{money(line.quantity * line.unitPrice, currency, lang)}</b>
          {payMode === 'items' && <input type="checkbox" aria-label={line.name} checked={selectedLines.includes(line.id)} onChange={event => setSelectedLines(event.target.checked ? [...selectedLines, line.id] : selectedLines.filter(id => id !== line.id))} />}
        </article>
      ))}
    </div>
    <div className="guest-bill-summary">
      <span>{t.subtotal}<b>{money(totals.subtotal, currency, lang)}</b></span>
      <span>{t.vat}<b>{money(totals.tax, currency, lang)}</b></span>
      {totals.paid > 0 ? <span>{t.paid}<b>{money(totals.paid, currency, lang)}</b></span> : null}
      <strong>{t.total}<b>{money(totals.total, currency, lang)}</b></strong>
      <span className="guest-balance">{t.balance}<b>{money(totals.balance, currency, lang)}</b></span>
    </div>
    {totals.balance > 0 ? (
      <>
      <div className="guest-payment-modes"><button type="button" className={payMode === 'all' ? 'is-active' : ''} onClick={() => setPayMode('all')}>{t.all}</button><button type="button" className={payMode === 'split' ? 'is-active' : ''} onClick={() => setPayMode('split')}>{t.split}</button><button type="button" className={payMode === 'items' ? 'is-active' : ''} onClick={() => setPayMode('items')}>{t.items}</button><button type="button" className={payMode === 'custom' ? 'is-active' : ''} onClick={() => setPayMode('custom')}>{t.custom}</button></div>
      {payMode === 'split' && <label>{t.guests}<input type="number" min="1" max="20" value={guests} onChange={event => setGuests(event.target.value)} /></label>}
      {payMode === 'custom' && <label>{t.amount}<input type="number" min="1" max={totals.balance} value={customAmount} onChange={event => setCustomAmount(event.target.value)} /></label>}
      {payMode === 'items' && <p className="guest-field-help">{t.payItems}</p>}
      <div className="guest-payment-provider"><label><CreditCard /><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}><option value="card">{t.card}</option><option value="cash">{t.cash}</option><option value="local_manual">{t.local}</option></select></label></div>
      <p className="guest-simulation-note">{paymentMethod === 'local_manual' ? t.local : t.simulator}</p>
      {state.restaurant?.loyalty?.enabled && <details className="guest-loyalty-entry"><summary>{t.loyalty} · +{state.restaurant.loyalty.pointsPerVisit}</summary><label>{t.owner}<input value={loyaltyName} onChange={event => setLoyaltyName(event.target.value)} /></label><label>{t.contact}<input value={loyaltyContact} onChange={event => setLoyaltyContact(event.target.value)} /></label><small>{state.restaurant.loyalty.rewards.map(reward => `${reward.points} pts · ${reward.label}`).join(' / ')}</small></details>}
      <button type="button" className="guest-primary-button" onClick={onPay} disabled={saving || amount <= 0}>{saving ? <LoaderCircle className="guest-spinner" /> : <Wallet />}{t.pay} · {money(amount, currency, lang)}</button>
      </>
    ) : <div className="guest-paid-box"><span><Check />{t.paid}</span><button type="button" className="guest-primary-button" onClick={onReview}>{t.continue}</button></div>}
    {notice && <p className="guest-status-message" role="status">{notice}</p>}
    <button type="button" className="guest-receipt-button" onClick={onReceipt}><ReceiptText />{t.receipt}</button>
  </div>;
}
