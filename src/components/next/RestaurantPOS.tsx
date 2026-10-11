'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, Check, ChefHat, CircleDollarSign, CreditCard, Minus, Plus, Printer, ReceiptText, RefreshCw, ShoppingBag, Table2, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { ThemePicker } from './ThemePicker';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';
import { deleteCatalog, deleteLocalSale, loadCatalog, loadLocalSales, saveCatalog, saveLocalSale } from '@/src/lib/pos/offline-store';
import { totalSaleDzd, type LocalPosSale, type PaymentMethod, type PosCatalog, type PosProduct, type PosSaleLine, type PosSaleRecord } from '@/src/lib/pos/types';

interface CartProduct extends PosSaleLine {
  category: string;
}

interface ActiveBill {
  id: string;
  table_label: string;
  discount_dzd: number | string;
  created_at: string;
  bill_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price_dzd: number;
    line_total_dzd: number | string;
  }>;
  payments: Array<{
    id: string;
    amount_dzd: number | string;
    tip_dzd: number | string;
    method: string;
    status: string;
  }>;
}

function PrintReset({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    window.addEventListener('afterprint', onDone, { once: true });
    return () => window.removeEventListener('afterprint', onDone);
  }, [onDone]);
  return null;
}

function money(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(value)} دج`;
}

function normalizeSale(sale: PosSaleRecord): LocalPosSale {
  return {
    id: sale.id,
    ownerId: 'synced',
    ticketNumber: sale.ticket_number ?? null,
    items: sale.pos_sale_items.map(item => ({
      productId: '',
      productName: item.product_name,
      quantity: item.quantity,
      priceDzd: item.unit_price_dzd
    })),
    paymentMethod: sale.payment_method,
    paymentReference: sale.payment_reference ?? '',
    syncSource: sale.sync_source,
    createdAt: sale.sold_at,
    status: 'synced',
    voidedAt: sale.voided_at ?? null,
    voidReason: sale.void_reason ?? null
  };
}

export function RestaurantPOS() {
  const { locale, toggleLocale } = useLanguage();
  const isArabic = locale === 'ar';
  const [catalog, setCatalog] = useState<PosCatalog | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [cart, setCart] = useState<CartProduct[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [localSales, setLocalSales] = useState<LocalPosSale[]>([]);
  const [serverSales, setServerSales] = useState<LocalPosSale[]>([]);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'cashier' | 'tables' | 'products' | 'history'>('cashier');
  const [bills, setBills] = useState<ActiveBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [tableLabel, setTableLabel] = useState('');
  const [billProductId, setBillProductId] = useState('');
  const [billPaymentAmount, setBillPaymentAmount] = useState('');
  const [billPaymentTip, setBillPaymentTip] = useState('');
  const [billPaymentMethod, setBillPaymentMethod] = useState<'cash' | 'card' | 'baridimob'>('cash');
  const [billBusy, setBillBusy] = useState(false);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [menuCategory, setMenuCategory] = useState('Tout');
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'80' | '58' | 'a4'>('80');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const saleSubmissionInProgress = useRef(false);
  const billActionInProgress = useRef(false);

  const refreshSales = useCallback(async () => {
    if (!navigator.onLine) return;
    const response = await fetch('/api/pos/sales?period=today', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Historique indisponible.');
    setServerSales((result.sales as PosSaleRecord[]).map(normalizeSale));
  }, []);

  const refreshBills = useCallback(async () => {
    if (!navigator.onLine) return;
    const response = await fetch('/api/pos/bills', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Les additions ouvertes n’ont pas pu être chargées.');
    const nextBills = result.bills as ActiveBill[];
    setBills(nextBills);
    setSelectedBillId(current => current && nextBills.some(bill => bill.id === current)
      ? current
      : nextBills[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (activeTab === 'tables' && online) void refreshBills().catch(loadError => {
      setError(loadError instanceof Error ? loadError.message : 'Les additions n’ont pas pu être chargées.');
    });
  }, [activeTab, online, refreshBills]);

  const openTableBill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = tableLabel.trim();
    if (!label || billBusy || billActionInProgress.current) return;
    if (!online) {
      setError('L’ouverture des additions par table nécessite une connexion Internet.');
      return;
    }
    const existing = bills.find(bill => bill.table_label.toLocaleLowerCase() === label.toLocaleLowerCase());
    if (existing) {
      setSelectedBillId(existing.id);
      setTableLabel('');
      setError('');
      return;
    }
    billActionInProgress.current = true;
    setBillBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/pos/bills', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ table: label })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'L’addition n’a pas pu être ouverte.');
      await refreshBills();
      setSelectedBillId(result.id as string);
      setTableLabel('');
      setMessage(`Addition ouverte pour ${label}.`);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'L’addition n’a pas pu être ouverte.');
    } finally {
      billActionInProgress.current = false;
      setBillBusy(false);
    }
  };

  const addBillProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBillId || !billProductId || billBusy || billActionInProgress.current) return;
    billActionInProgress.current = true;
    setBillBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/pos/bills/${selectedBillId}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: billProductId, quantity: 1 })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le produit n’a pas pu être ajouté.');
      await refreshBills();
      setBillProductId('');
      setMessage('Produit ajouté à l’addition.');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Le produit n’a pas pu être ajouté.');
    } finally {
      billActionInProgress.current = false;
      setBillBusy(false);
    }
  };

  const recordBillPayment = async (event: FormEvent<HTMLFormElement>, bill: ActiveBill, remainingDzd: number) => {
    event.preventDefault();
    if (billBusy || billActionInProgress.current) return;
    const amountDzd = billPaymentAmount.trim() ? Number(billPaymentAmount) : remainingDzd;
    const tipDzd = billPaymentTip.trim() ? Number(billPaymentTip) : 0;
    if (!Number.isSafeInteger(amountDzd) || amountDzd < 1 || amountDzd > remainingDzd ||
        !Number.isSafeInteger(tipDzd) || tipDzd < 0 || tipDzd > selectedBillTotal) {
      setError('Vérifiez le montant du paiement et le pourboire.');
      return;
    }
    billActionInProgress.current = true;
    setBillBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/pos/bills/${bill.id}/payments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amountDzd,
          tipDzd,
          method: billPaymentMethod,
          idempotencyKey: crypto.randomUUID()
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le paiement n’a pas pu être enregistré.');
      await refreshBills();
      setBillPaymentAmount('');
      setBillPaymentTip('');
      setMessage(billPaymentMethod === 'card'
        ? 'Paiement carte enregistré en attente de confirmation du terminal.'
        : amountDzd === remainingDzd
          ? 'Addition réglée et clôturée.'
          : 'Paiement partiel enregistré ; un solde reste à payer.');
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Le paiement n’a pas pu être enregistré.');
    } finally {
      billActionInProgress.current = false;
      setBillBusy(false);
    }
  };

  const synchronize = useCallback(async (ownerId = catalog?.userId ?? '') => {
    if (!navigator.onLine || !ownerId) return;
    setOnline(true);
    setError('');
    try {
      const pending = await loadLocalSales(ownerId);
      for (const sale of pending.filter(item => item.status !== 'synced')) {
        try {
          const response = await fetch('/api/pos/sales', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              id: sale.id,
              items: sale.items.map(item => ({ productId: item.productId, quantity: item.quantity, priceDzd: item.priceDzd })),
              paymentMethod: sale.paymentMethod,
              paymentReference: sale.paymentReference,
              syncSource: 'offline',
              soldAt: sale.createdAt
            })
          });
          const result = await response.json();
          if (!response.ok) {
            await saveLocalSale({ ...sale, status: response.status === 409 ? 'conflict' : 'pending', error: result.error });
            continue;
          }
          await deleteLocalSale(sale.id);
          setLocalSales(current => current.filter(item => item.id !== sale.id));
          setMessage(isArabic ? 'تمت مزامنة المبيعات المحفوظة.' : 'Les ventes en attente sont synchronisées.');
        } catch {
          setOnline(false);
          return;
        }
      }
      await refreshSales();
    } catch {
      setOnline(false);
    }
  }, [catalog?.userId, isArabic, refreshSales]);

  useEffect(() => {
    let alive = true;
    const start = async () => {
      setOnline(navigator.onLine);
      let savedCatalog: PosCatalog | null = null;
      let ownerId = '';
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await createSupabaseBrowserClient().auth.getSession();
          ownerId = sessionData.session?.user.id ?? '';
        } catch {
          ownerId = '';
        }
      }
      try {
        const [cachedCatalog, cachedSales] = ownerId
          ? await Promise.all([loadCatalog(ownerId), loadLocalSales(ownerId)])
          : [null, [] as LocalPosSale[]];
        savedCatalog = cachedCatalog;
        if (alive) {
          if (cachedCatalog) setCatalog(cachedCatalog);
          setLocalSales(cachedSales);
        }
      } catch (storageError) {
        if (alive) setError(storageError instanceof Error ? storageError.message : 'Stockage hors connexion indisponible.');
      }
      if (!navigator.onLine) {
        if (alive && !savedCatalog) setError(isArabic
          ? 'اتصل بالإنترنت مرة واحدة لتحميل القائمة قبل العمل دون اتصال.'
          : 'Connectez-vous une première fois pour charger le menu avant de travailler hors ligne.');
        return;
      }
      try {
        const response = await fetch('/api/pos/catalog', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Connexion requise.');
        if (result.unconfigured) {
          if (alive) {
            setUnconfigured(true);
            setCatalog(null);
          }
          if (ownerId) await deleteCatalog(ownerId);
          return;
        }
        const nextCatalog = result as PosCatalog;
        if (alive) {
          setCatalog(nextCatalog);
          setUnconfigured(false);
          setError('');
        }
        await saveCatalog(nextCatalog);
        const salesResponse = await fetch('/api/pos/sales?period=today', { cache: 'no-store' });
        const salesResult = await salesResponse.json();
        if (!salesResponse.ok) throw new Error(salesResult.error || 'Historique indisponible.');
        if (alive) setServerSales((salesResult.sales as PosSaleRecord[]).map(normalizeSale));
        void synchronize(nextCatalog.userId);
      } catch (loadError) {
        if (alive && !savedCatalog) setError(loadError instanceof Error ? loadError.message : 'La caisse est indisponible.');
      }
    };
    void start();
    const goOnline = () => { setOnline(true); void synchronize(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      alive = false;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [isArabic, synchronize]);

  const categories = useMemo(() => ['Tout', ...new Set((catalog?.products ?? []).filter(product => product.active).map(product => product.category))], [catalog]);
  const visibleProducts = useMemo(() => (catalog?.products ?? []).filter(product =>
    product.active && (menuCategory === 'Tout' || product.category === menuCategory)
  ), [catalog, menuCategory]);
  const ticketTotal = useMemo(() => totalSaleDzd(cart), [cart]);
  const visibleSales = useMemo(() => {
    const byId = new Map<string, LocalPosSale>();
    for (const sale of [...localSales, ...serverSales]) byId.set(sale.id, sale);
    return [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [localSales, serverSales]);
  const pendingCount = localSales.filter(sale => sale.status !== 'synced').length;
  const dayTotalDzd = useMemo(() => visibleSales
    .filter(sale => !sale.voidedAt)
    .reduce((sum, sale) => sum + totalSaleDzd(sale.items), 0), [visibleSales]);
  const voidedCount = useMemo(() => visibleSales.filter(sale => sale.voidedAt).length, [visibleSales]);
  const selectedBill = bills.find(bill => bill.id === selectedBillId) ?? null;
  const selectedBillTotal = selectedBill
    ? Math.max(0, selectedBill.bill_items.reduce((sum, item) => sum + Number(item.line_total_dzd), 0) - Number(selectedBill.discount_dzd))
    : 0;
  const selectedBillPaid = selectedBill
    ? selectedBill.payments.filter(payment => payment.status === 'succeeded')
      .reduce((sum, payment) => sum + Number(payment.amount_dzd), 0)
    : 0;
  const selectedBillRemaining = Math.max(0, selectedBillTotal - selectedBillPaid);

  const addProduct = (product: PosProduct) => {
    setCart(current => {
      const existing = current.find(item => item.productId === product.id);
      if (existing) return current.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId: product.id, productName: product.name, category: product.category, quantity: 1, priceDzd: product.price_dzd }];
    });
  };

  const changeQuantity = (productId: string, change: number) => {
    setCart(current => current
      .map(item => item.productId === productId ? { ...item, quantity: item.quantity + change } : item)
      .filter(item => item.quantity > 0));
  };

  const saveSale = async () => {
    if (cart.length === 0 || busy || saleSubmissionInProgress.current) return;
    saleSubmissionInProgress.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const sale: LocalPosSale = {
      id: crypto.randomUUID(),
      items: cart.map(({ productId, productName, quantity, priceDzd }) => ({ productId, productName, quantity, priceDzd })),
      paymentMethod,
      paymentReference: paymentReference.trim(),
      syncSource: navigator.onLine ? 'online' : 'offline',
      ownerId: catalog.userId,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    try {
      await saveLocalSale(sale);
      setLocalSales(current => [sale, ...current]);
      if (navigator.onLine) {
        try {
          const response = await fetch('/api/pos/sales', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              id: sale.id,
              items: sale.items.map(item => ({ productId: item.productId, quantity: item.quantity, priceDzd: item.priceDzd })),
              paymentMethod: sale.paymentMethod,
              paymentReference: sale.paymentReference,
              syncSource: sale.syncSource,
              soldAt: sale.createdAt
            })
          });
          const result = await response.json();
          if (!response.ok) {
            if (response.status === 409) {
              const conflict = { ...sale, status: 'conflict' as const, error: result.error };
              await saveLocalSale(conflict);
              setLocalSales(current => current.map(item => item.id === sale.id ? conflict : item));
              setError(result.error);
            } else if (response.status === 503) {
              setMessage(isArabic ? 'تم حفظ البيع محلياً وستتم مزامنته لاحقاً.' : 'Vente conservée sur cet appareil, synchronisation à venir.');
            } else {
              throw new Error(result.error || 'La vente a été enregistrée uniquement sur cet appareil.');
            }
          } else {
            await deleteLocalSale(sale.id);
            setLocalSales(current => current.filter(item => item.id !== sale.id));
            await refreshSales();
          }
        } catch (saveError) {
          if (saveError instanceof TypeError) {
            setOnline(false);
            setMessage(isArabic ? 'تم حفظ البيع محلياً وستتم مزامنته عند عودة الإنترنت.' : 'Vente conservée sur cet appareil, synchronisation au retour du réseau.');
          }
          else if (saveError instanceof Error) setError(saveError.message);
        }
      } else {
        setMessage(isArabic ? 'تم حفظ البيع على هذا الجهاز، وسيتم إرساله عند عودة الإنترنت.' : 'Vente enregistrée sur cet appareil. Synchronisation dès le retour du réseau.');
      }
      setCart([]);
      setPaymentReference('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Le ticket n’a pas pu être enregistré.');
    } finally {
      saleSubmissionInProgress.current = false;
      setBusy(false);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceDzd = Number(productPrice);
    if (!productName.trim() || !category.trim() || !Number.isSafeInteger(priceDzd) || priceDzd < 0) {
      setError(isArabic ? 'تحقق من اسم المنتج والقسم والسعر.' : 'Vérifiez le nom, la catégorie et le prix en dinars.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/pos/catalog', {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(editingProductId ? { id: editingProductId, active: true } : {}),
          name: productName.trim(),
          category: category.trim(),
          priceDzd
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le produit n’a pas pu être enregistré.');
      setCatalog(current => current ? {
        ...current,
        products: editingProductId
          ? current.products.map(product => product.id === editingProductId ? result as PosProduct : product)
          : [...current.products, result as PosProduct]
      } : current);
      if (catalog) await saveCatalog({
        ...catalog,
        products: editingProductId
          ? catalog.products.map(product => product.id === editingProductId ? result as PosProduct : product)
          : [...catalog.products, result as PosProduct]
      });
      setProductName('');
      setCategory('');
      setProductPrice('');
      setEditingProductId(null);
      setMessage(isArabic ? 'تم حفظ قائمة الطعام.' : 'Produit enregistré.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Le produit n’a pas pu être enregistré.');
    } finally {
      setBusy(false);
    }
  };

  const toggleProduct = async (product: PosProduct) => {
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/pos/catalog', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: product.id, name: product.name, category: product.category, priceDzd: product.price_dzd, active: !product.active })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Le produit n’a pas pu être modifié.');
      const nextCatalog = catalog ? { ...catalog, products: catalog.products.map(item => item.id === product.id ? result as PosProduct : item) } : null;
      if (nextCatalog) {
        setCatalog(nextCatalog);
        await saveCatalog(nextCatalog);
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Le produit n’a pas pu être modifié.');
    } finally {
      setBusy(false);
    }
  };

  const startEditing = (product: PosProduct) => {
    setEditingProductId(product.id);
    setProductName(product.name);
    setCategory(product.category);
    setProductPrice(String(product.price_dzd));
  };

  const setupRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/pos/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: restaurantName.trim(), address: restaurantAddress.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'L’espace restaurant n’a pas pu être créé.');
      window.location.reload();
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'L’espace restaurant n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  };

  const printSale = (saleId: string) => {
    setPrintingSaleId(saleId);
    window.requestAnimationFrame(() => window.print());
  };

  const voidSale = async (saleId: string) => {
    if (!catalog || catalog.role !== 'restaurant_admin' || voidingSaleId) return;
    const reason = window.prompt(isArabic ? 'سبب الإلغاء (اختياري):' : 'Motif de l’annulation (optionnel) :', '');
    if (reason === null) return;
    if (!window.confirm(isArabic ? 'هل تريد إلغاء هذه العملية؟ لن تُحتسب في الإيرادات.' : 'Annuler cette vente ? Elle ne sera plus comptée dans le chiffre d’affaires.')) return;
    setVoidingSaleId(saleId);
    setError('');
    try {
      const response = await fetch(`/api/pos/sales/${saleId}/void`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'La vente n’a pas pu être annulée.');
      await refreshSales();
      setMessage(isArabic ? 'تم إلغاء العملية.' : 'Vente annulée.');
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : 'La vente n’a pas pu être annulée.');
    } finally {
      setVoidingSaleId(null);
    }
  };

  const closeDay = async () => {
    if (!catalog || catalog.role !== 'restaurant_admin' || closingDay) return;
    if (!window.confirm(isArabic ? 'إغلاق الصندوق؟ لا يمكن إلغاء المبيعات السابقة بعد ذلك.' : 'Clôturer la caisse (Z) ? Les ventes déjà encaissées ne pourront plus être annulées.')) return;
    setClosingDay(true);
    setError('');
    try {
      const response = await fetch('/api/pos/z', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'La clôture a échoué.');
      setMessage(isArabic ? 'تم إغلاق الصندوق.' : 'Caisse clôturée (Z).');
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'La clôture a échoué.');
    } finally {
      setClosingDay(false);
    }
  };

  if (unconfigured) {
    return <main className="pos-shell">
      <header className="pos-topbar"><Link href="/" className="pos-brand"><span className="pos-brand-mark"><ChefHat /></span>DIGIFEEL POS</Link><div className="pos-topbar__actions"><ThemePicker locale={locale} compact /><button className="pos-language" onClick={toggleLocale} type="button">{locale === 'fr' ? 'العربية' : locale === 'ar' ? 'EN' : 'FR'}</button></div></header>
      <section className="pos-empty next-glass-card">
        <ChefHat />
        <span className="pos-eyebrow">{isArabic ? 'مساحة جديدة' : 'NOUVEL ÉTABLISSEMENT'}</span>
        <h1>{isArabic ? 'أنشئ مساحة مطعمك.' : 'Configurez votre restaurant.'}</h1>
        <p>{isArabic ? 'أضف اسم المطعم لبدء إعداد قائمة الطعام والصندوق.' : 'Ajoutez les informations de base pour préparer votre menu et votre caisse.'}</p>
        <form className="pos-product-form" onSubmit={setupRestaurant}>
          <label>{isArabic ? 'اسم المطعم' : 'Nom du restaurant'}<input required minLength={2} maxLength={120} value={restaurantName} onChange={event => setRestaurantName(event.target.value)} /></label>
          <label>{isArabic ? 'العنوان (اختياري)' : 'Adresse (facultatif)'}<input maxLength={200} value={restaurantAddress} onChange={event => setRestaurantAddress(event.target.value)} /></label>
          {error && <p className="pos-error" role="alert">{error}</p>}
          <button className="pos-checkout-button" type="submit" disabled={busy}>{busy ? (isArabic ? 'جارٍ الإعداد…' : 'Configuration…') : (isArabic ? 'إنشاء مساحة المطعم' : 'Créer mon espace restaurant')}</button>
        </form>
      </section>
    </main>;
  }

  if (error && !catalog) {
    return <main className="pos-shell">
      <header className="pos-topbar"><Link href="/" className="pos-brand"><ChefHat /> DGI</Link><div className="pos-topbar__actions"><ThemePicker locale={locale} compact /><button className="pos-language" onClick={toggleLocale} type="button">{locale === 'fr' ? 'العربية' : locale === 'ar' ? 'EN' : 'FR'}</button></div></header>
      <section className="pos-empty next-glass-card"><WifiOff /><h1>{isArabic ? 'تعذر فتح الصندوق' : 'Caisse indisponible'}</h1><p role="alert">{error}</p><p>{isArabic ? 'افتح الصندوق مرة واحدة مع اتصال الإنترنت لتحميل القائمة.' : 'Ouvrez la caisse une première fois en ligne pour charger votre menu et activer le mode hors connexion.'}</p><Link className="product-button" href="/login?next=/caisse">{isArabic ? 'تسجيل الدخول' : 'Se connecter'}</Link></section>
    </main>;
  }

  if (!catalog) return <main className="pos-shell"><p role="status">{isArabic ? 'جارٍ تحميل الصندوق…' : 'Chargement de la caisse…'}</p></main>;

  return (
    <main className="pos-shell" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="pos-topbar">
        <Link href="/" className="pos-brand"><span className="pos-brand-mark"><ChefHat aria-hidden="true" /></span><span>DIGIFEEL <small>POS</small></span></Link>
        <div className="pos-topbar__restaurant"><span>{catalog.restaurant.name}</span><span className={`pos-connection ${online ? 'is-online' : 'is-offline'}`}>{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? (isArabic ? 'متصل' : 'En ligne') : (isArabic ? 'بدون إنترنت' : 'Hors ligne')}</span></div>
        <div className="pos-topbar__actions">
          {pendingCount > 0 && <button className="pos-sync-button" type="button" onClick={() => void synchronize()}><RefreshCw size={16} />{pendingCount} {isArabic ? 'للمزامنة' : 'à synchroniser'}</button>}
          <ThemePicker locale={locale} compact />
          <button className="pos-language" type="button" onClick={toggleLocale}>{locale === 'fr' ? 'العربية' : locale === 'ar' ? 'EN' : 'FR'}</button>
          <Link className="pos-logout" href="/dashboard">{isArabic ? 'الإدارة' : 'Gestion'}</Link>
          <button className="pos-logout" onClick={() => { window.location.assign('/'); }} type="button">{isArabic ? 'الرئيسية' : 'Accueil'}</button>
        </div>
      </header>

      <nav className="pos-tabs" aria-label={isArabic ? 'أقسام نقطة البيع' : 'Sections du logiciel'}>
        <button type="button" className={activeTab === 'cashier' ? 'is-active' : ''} onClick={() => setActiveTab('cashier')}><ShoppingBag size={17} />{isArabic ? 'الصندوق' : 'Caisse'}</button>
        <button type="button" className={activeTab === 'tables' ? 'is-active' : ''} onClick={() => setActiveTab('tables')}><Table2 size={17} />{isArabic ? 'الطاولات' : 'Tables'}{bills.length > 0 ? ` (${bills.length})` : ''}</button>
        {catalog.role === 'restaurant_admin' && <button type="button" className={activeTab === 'products' ? 'is-active' : ''} onClick={() => setActiveTab('products')}><ChefHat size={17} />{isArabic ? 'قائمة الطعام' : 'Menu'}</button>}
        <button type="button" className={activeTab === 'history' ? 'is-active' : ''} onClick={() => setActiveTab('history')}><ReceiptText size={17} />{isArabic ? 'المبيعات' : 'Ventes du jour'}</button>
      </nav>

      {message && <p className="pos-notice" role="status"><Check size={16} />{message}</p>}
      {error && <p className="pos-error" role="alert">{error}</p>}

      {activeTab === 'cashier' && <div className="pos-cashier-layout">
        <section className="pos-menu-panel">
          <div className="pos-section-heading"><div><span className="pos-eyebrow">{isArabic ? 'الطلبات' : 'PRISE DE COMMANDE'}</span><h1>{isArabic ? 'القائمة' : 'Menu du restaurant'}</h1></div><span>{visibleProducts.length} {isArabic ? 'منتج' : 'produits'}</span></div>
          <div className="pos-category-list">
            {categories.map(item => <button type="button" key={item} className={menuCategory === item ? 'is-active' : ''} onClick={() => setMenuCategory(item)}>{item === 'Tout' && isArabic ? 'الكل' : item}</button>)}
          </div>
          <div className="pos-product-grid">
            {visibleProducts.map(product => <button type="button" className="pos-product-card" key={product.id} onClick={() => addProduct(product)}>
              <span className="pos-product-icon"><ChefHat aria-hidden="true" /></span><span className="pos-product-category">{product.category}</span><strong>{product.name}</strong><span className="pos-product-price">{money(product.price_dzd, locale)}</span><span className="pos-product-add"><Plus size={16} /></span>
            </button>)}
            {visibleProducts.length === 0 && <p className="pos-empty-hint">{isArabic ? 'أضف منتجات من قائمة الطعام.' : 'Ajoutez des produits dans l’onglet Menu.'}</p>}
          </div>
        </section>

        <aside className="pos-ticket-panel">
          <div className="pos-section-heading"><div><span className="pos-eyebrow">{isArabic ? 'الطلب الحالي' : 'COMMANDE EN COURS'}</span><h2>{isArabic ? 'التذكرة' : 'Ticket'}</h2></div><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} {isArabic ? 'منتج' : 'article(s)'}</span></div>
          <div className="pos-ticket-lines">
            {cart.length === 0 ? <div className="pos-ticket-empty"><ShoppingBag /><span>{isArabic ? 'اختر المنتجات لبدء الطلب.' : 'Ajoutez des produits pour commencer.'}</span></div> : cart.map(item => <article className="pos-ticket-line" key={item.productId}>
              <div><strong>{item.productName}</strong><small>{money(item.priceDzd, locale)} × {item.quantity}</small></div><strong>{money(item.priceDzd * item.quantity, locale)}</strong>
              <div className="pos-quantity-control"><button type="button" aria-label={isArabic ? 'إنقاص الكمية' : `Retirer un ${item.productName}`} onClick={() => changeQuantity(item.productId, -1)}><Minus size={15} /></button><span>{item.quantity}</span><button type="button" aria-label={isArabic ? 'زيادة الكمية' : `Ajouter un ${item.productName}`} onClick={() => changeQuantity(item.productId, 1)}><Plus size={15} /></button></div>
            </article>)}
          </div>
          <div className="pos-ticket-total"><span>{isArabic ? 'المجموع' : 'Total à payer'}</span><strong>{money(ticketTotal, locale)}</strong></div>
          <fieldset className="pos-payment-methods">
            <legend>{isArabic ? 'طريقة الدفع' : 'Mode de paiement'}</legend>
            <button type="button" className={paymentMethod === 'cash' ? 'is-active' : ''} aria-pressed={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')}><CircleDollarSign />{isArabic ? 'نقداً' : 'Espèces'}</button>
            <button type="button" className={paymentMethod === 'card' ? 'is-active' : ''} aria-pressed={paymentMethod === 'card'} onClick={() => setPaymentMethod('card')}><CreditCard />{isArabic ? 'بطاقة' : 'Carte'}</button>
            <button type="button" className={paymentMethod === 'baridimob' ? 'is-active' : ''} aria-pressed={paymentMethod === 'baridimob'} onClick={() => setPaymentMethod('baridimob')}><ArrowDownToLine />BaridiMob</button>
          </fieldset>
          {paymentMethod !== 'cash' && <label className="pos-reference">{isArabic ? 'مرجع الدفع (اختياري)' : 'Référence de paiement (facultatif)'}<input maxLength={120} value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder={isArabic ? 'رقم العملية' : 'N° de transaction'} /></label>}
          <button className="pos-checkout-button" type="button" disabled={cart.length === 0 || busy} onClick={() => void saveSale()}>{busy ? (isArabic ? 'جارٍ التسجيل…' : 'Enregistrement…') : <><Check size={18} />{isArabic ? 'تسجيل البيع' : 'Enregistrer la vente'}</>}</button>
          {paymentMethod !== 'cash' && <p className="pos-payment-note">{paymentMethod === 'card'
            ? (isArabic ? 'تحقق من الدفع على جهاز الدفع البنكي قبل تسجيل البيع.' : 'Vérifiez le paiement sur le terminal bancaire avant d’enregistrer la vente.')
            : (isArabic ? 'تحقق من تحويل BaridiMob خارج التطبيق قبل تسجيل البيع.' : 'Vérifiez le virement BaridiMob en dehors de l’application avant d’enregistrer la vente.')}</p>}
        </aside>
      </div>}

      {activeTab === 'tables' && <section className="pos-history-page">
        <div className="pos-section-heading">
          <div><span className="pos-eyebrow">{isArabic ? 'الطاولات والطلبات المفتوحة' : 'SERVICE EN SALLE'}</span><h1>{isArabic ? 'إضافات الطاولات' : 'Tables et additions'}</h1></div>
          <button className="pos-sync-button" type="button" disabled={!online || billBusy} onClick={() => void refreshBills().catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Actualisation impossible.'))}><RefreshCw size={16} />{isArabic ? 'تحديث' : 'Actualiser'}</button>
        </div>
        {!online && <p className="pos-payment-note">{isArabic ? 'إضافات الطاولات تتطلب اتصالاً بالإنترنت.' : 'Les additions par table nécessitent une connexion Internet. La caisse hors ligne reste disponible.'}</p>}
        <form className="pos-product-form" onSubmit={openTableBill}>
          <label>{isArabic ? 'رقم أو اسم الطاولة' : 'Numéro ou nom de table'}<input required maxLength={40} value={tableLabel} onChange={event => setTableLabel(event.target.value)} placeholder={isArabic ? 'مثال: 4' : 'Ex. Table 4'} /></label>
          <button className="pos-checkout-button" type="submit" disabled={!online || billBusy}>{billBusy ? (isArabic ? 'جارٍ التسجيل…' : 'Traitement…') : (isArabic ? 'فتح / استرجاع الإضافة' : 'Ouvrir ou retrouver la table')}</button>
        </form>

        <div className="pos-sales-list">
          {bills.map(bill => {
            const total = Math.max(0, bill.bill_items.reduce((sum, item) => sum + Number(item.line_total_dzd), 0) - Number(bill.discount_dzd));
            const paid = bill.payments.filter(payment => payment.status === 'succeeded').reduce((sum, payment) => sum + Number(payment.amount_dzd), 0);
            return <button key={bill.id} type="button" className={`pos-tab-selector ${selectedBillId === bill.id ? 'is-active' : ''}`} onClick={() => setSelectedBillId(bill.id)}>
              <strong>{bill.table_label}</strong><span>{money(Math.max(0, total - paid), locale)} {isArabic ? 'متبقي' : 'restant'}</span>
            </button>;
          })}
          {bills.length === 0 && <p className="pos-empty-hint">{isArabic ? 'لا توجد إضافات مفتوحة.' : 'Aucune addition ouverte pour le moment.'}</p>}
        </div>

        {selectedBill && <article className="pos-ticket-panel">
          <div className="pos-section-heading"><div><span className="pos-eyebrow">{isArabic ? 'الطلب المفتوح' : 'ADDITION OUVERTE'}</span><h2>{selectedBill.table_label}</h2></div><span>{new Date(selectedBill.created_at).toLocaleTimeString(isArabic ? 'ar-DZ' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="pos-ticket-lines">
            {selectedBill.bill_items.map(item => <article className="pos-ticket-line" key={item.id}>
              <div><strong>{item.product_name}</strong><small>{money(item.unit_price_dzd, locale)} × {item.quantity}</small></div>
              <strong>{money(Number(item.line_total_dzd), locale)}</strong>
            </article>)}
            {selectedBill.bill_items.length === 0 && <p className="pos-empty-hint">{isArabic ? 'أضف منتجات إلى هذه الإضافة.' : 'Ajoutez des produits pour commencer cette addition.'}</p>}
          </div>
          <form className="pos-product-form" onSubmit={addBillProduct}>
            <label>{isArabic ? 'إضافة منتج' : 'Ajouter un produit'}<select required value={billProductId} onChange={event => setBillProductId(event.target.value)}>
              <option value="">{isArabic ? 'اختر منتجاً' : 'Choisir un produit'}</option>
              {catalog.products.filter(product => product.active).map(product => <option key={product.id} value={product.id}>{product.name} · {money(product.price_dzd, locale)}</option>)}
            </select></label>
            <button className="pos-checkout-button" type="submit" disabled={billBusy || !billProductId}><Plus size={17} />{isArabic ? 'إضافة' : 'Ajouter à la table'}</button>
          </form>
          <div className="pos-ticket-total"><span>{isArabic ? 'المجموع' : 'Total'}</span><strong>{money(selectedBillTotal, locale)}</strong></div>
          <div className="pos-ticket-total"><span>{isArabic ? 'مدفوع' : 'Déjà payé'}</span><strong>{money(selectedBillPaid, locale)}</strong></div>
          {selectedBill.payments.some(payment => payment.status === 'pending') && <p className="pos-payment-note">{isArabic ? 'يوجد دفع بالبطاقة بانتظار التأكيد من جهاز الدفع.' : 'Un paiement carte attend la confirmation du terminal ; il ne réduit pas encore le solde.'}</p>}
          {selectedBillRemaining > 0 && <form className="pos-product-form" onSubmit={event => void recordBillPayment(event, selectedBill, selectedBillRemaining)}>
            <h3>{isArabic ? 'تسجيل دفعة' : 'Encaisser un paiement'}</h3>
            <label>{isArabic ? 'المبلغ بالدينار (فارغ = الرصيد)' : 'Montant en dinars (vide = solde)'}<input type="number" min="1" max={selectedBillRemaining} step="1" value={billPaymentAmount} onChange={event => setBillPaymentAmount(event.target.value)} /></label>
            <label>{isArabic ? 'الإكرامية' : 'Pourboire en dinars'}<input type="number" min="0" step="1" value={billPaymentTip} onChange={event => setBillPaymentTip(event.target.value)} /></label>
            <fieldset className="pos-payment-methods">
              <legend>{isArabic ? 'طريقة الدفع' : 'Mode de paiement'}</legend>
              <button type="button" className={billPaymentMethod === 'cash' ? 'is-active' : ''} aria-pressed={billPaymentMethod === 'cash'} onClick={() => setBillPaymentMethod('cash')}><CircleDollarSign />{isArabic ? 'نقداً' : 'Espèces'}</button>
              <button type="button" className={billPaymentMethod === 'card' ? 'is-active' : ''} aria-pressed={billPaymentMethod === 'card'} onClick={() => setBillPaymentMethod('card')}><CreditCard />{isArabic ? 'بطاقة' : 'Carte'}</button>
              <button type="button" className={billPaymentMethod === 'baridimob' ? 'is-active' : ''} aria-pressed={billPaymentMethod === 'baridimob'} onClick={() => setBillPaymentMethod('baridimob')}><ArrowDownToLine />BaridiMob</button>
            </fieldset>
            <button className="pos-checkout-button" type="submit" disabled={billBusy || selectedBillTotal <= 0}>{billBusy ? (isArabic ? 'جارٍ التسجيل…' : 'Enregistrement…') : (isArabic ? 'تسجيل الدفعة' : 'Enregistrer le paiement')}</button>
            {billPaymentMethod === 'card' && <p className="pos-payment-note">{isArabic ? 'تحقق من الدفع على جهاز الدفع. ستبقى الدفعة معلقة حتى تأكيدها.' : 'La carte est enregistrée en attente : vérifiez le terminal, la confirmation bancaire n’est pas encore intégrée.'}</p>}
          </form>}
        </article>}
      </section>}

      {activeTab === 'products' && catalog.role === 'restaurant_admin' && <section className="pos-products-page">
        <div className="pos-section-heading"><div><span className="pos-eyebrow">{isArabic ? 'الإعدادات' : 'CONFIGURATION'}</span><h1>{isArabic ? 'قائمة الطعام والأسعار' : 'Produits et prix'}</h1></div></div>
        <div className="pos-products-layout">
          <form className="pos-product-form" onSubmit={saveProduct}>
            <h2>{editingProductId ? (isArabic ? 'تعديل المنتج' : 'Modifier un produit') : (isArabic ? 'إضافة منتج' : 'Ajouter un produit')}</h2>
            <label>{isArabic ? 'الاسم' : 'Nom du produit'}<input required maxLength={120} value={productName} onChange={event => setProductName(event.target.value)} /></label>
            <label>{isArabic ? 'القسم' : 'Catégorie'}<input required maxLength={60} value={category} onChange={event => setCategory(event.target.value)} placeholder={isArabic ? 'مثال: مشروبات' : 'Ex. Boissons'} /></label>
            <label>{isArabic ? 'السعر بالدينار' : 'Prix en dinars'}<input required type="number" min="0" max="100000000" step="1" value={productPrice} onChange={event => setProductPrice(event.target.value)} /></label>
            <button className="pos-checkout-button" type="submit" disabled={busy}>{editingProductId ? (isArabic ? 'حفظ التعديلات' : 'Enregistrer les modifications') : (isArabic ? 'إضافة إلى القائمة' : 'Ajouter au menu')}</button>
            {editingProductId && <button className="pos-cancel-edit" type="button" onClick={() => { setEditingProductId(null); setProductName(''); setCategory(''); setProductPrice(''); }}>{isArabic ? 'إلغاء' : 'Annuler'}</button>}
          </form>
          <div className="pos-products-table">
            {catalog.products.map(product => <article key={product.id} className={!product.active ? 'is-inactive' : ''}>
              <div><strong>{product.name}</strong><small>{product.category} · {money(product.price_dzd, locale)}</small></div>
              <div className="pos-product-actions"><button type="button" onClick={() => startEditing(product)}>{isArabic ? 'تعديل' : 'Modifier'}</button><button type="button" disabled={busy} onClick={() => void toggleProduct(product)}>{product.active ? (isArabic ? 'إيقاف' : 'Désactiver') : (isArabic ? 'تفعيل' : 'Réactiver')}</button></div>
            </article>)}
          </div>
        </div>
      </section>}

      {activeTab === 'history' && <section className="pos-history-page">
        <div className="pos-section-heading"><div><span className="pos-eyebrow">{isArabic ? 'العمليات المسجلة' : 'JOURNÉE EN COURS'}</span><h1>{isArabic ? 'المبيعات' : 'Ventes du jour'}</h1></div><span className="pos-heading-tools"><label className="pos-receipt-format">{isArabic ? 'ورق التذكرة' : 'Format du ticket'}<select value={receiptFormat} onChange={event => setReceiptFormat(event.target.value as '80' | '58' | 'a4')}><option value="80">80 mm</option><option value="58">58 mm</option><option value="a4">A4</option></select></label><span>{visibleSales.length} {isArabic ? 'عملية' : 'ticket(s)'}</span></span></div>
        <div className="pos-day-summary">
          <span>{isArabic ? 'إجمالي اليوم' : 'Total du jour'} : <strong>{money(dayTotalDzd, locale)}</strong></span>
          {voidedCount > 0 && <span className="pos-day-summary__voided">{voidedCount} {isArabic ? 'عملية ملغاة' : 'vente(s) annulée(s) (non comptée(s))'}</span>}
          {catalog.role === 'restaurant_admin' && <button type="button" className="pos-sync-button" disabled={closingDay || !online} onClick={() => void closeDay()}>{closingDay ? (isArabic ? 'جارٍ الإغلاق…' : 'Clôture…') : (isArabic ? 'إغلاق الصندوق (Z)' : 'Clôturer la caisse (Z)')}</button>}
        </div>
        <div className="pos-sales-list">
          {visibleSales.length === 0 && <p className="pos-empty-hint">{isArabic ? 'لا توجد مبيعات بعد.' : 'Aucune vente enregistrée pour le moment.'}</p>}
          {visibleSales.map(sale => <article className={`pos-sale-card${printingSaleId === sale.id ? ' is-printing' : ''}${sale.voidedAt ? ' is-voided' : ''}`} key={sale.id}>
            <div className="pos-sale-card__main"><span className={`pos-sale-state is-${sale.voidedAt ? 'voided' : sale.status}`}>{sale.voidedAt ? (isArabic ? 'ملغاة' : 'Annulée') : sale.status === 'synced' ? (isArabic ? 'مزامن' : 'Synchronisée') : sale.status === 'conflict' ? (isArabic ? 'تحتاج مراجعة' : 'À vérifier') : (isArabic ? 'بانتظار المزامنة' : 'En attente')}</span>{sale.ticketNumber != null && <b className="pos-ticket-number">N° {String(sale.ticketNumber).padStart(6, '0')}</b>}<strong>{money(totalSaleDzd(sale.items), locale)}</strong><small>{new Date(sale.createdAt).toLocaleString(isArabic ? 'ar-DZ' : 'fr-DZ')}</small></div>
            <ul>{sale.items.map((item, index) => <li key={`${sale.id}-${index}`}>{item.quantity} × {item.productName} <span>{money(item.priceDzd * item.quantity, locale)}</span></li>)}</ul>
            <div className="pos-sale-card__footer"><span>{sale.paymentMethod === 'cash' ? (isArabic ? 'نقداً' : 'Espèces') : sale.paymentMethod === 'card' ? (isArabic ? 'بطاقة' : 'Carte') : 'BaridiMob'}{sale.paymentReference && ` · ${sale.paymentReference}`}</span><span className="pos-sale-card__actions">{sale.status === 'synced' && !sale.voidedAt && <button type="button" onClick={() => printSale(sale.id)}><Printer size={15} />{isArabic ? 'طباعة' : 'Imprimer'}</button>}{sale.status === 'synced' && !sale.voidedAt && catalog.role === 'restaurant_admin' && <button type="button" className="pos-sale-void" disabled={voidingSaleId === sale.id} onClick={() => void voidSale(sale.id)}>{isArabic ? 'إلغاء' : 'Annuler'}</button>}</span>{sale.error && <small className="pos-sale-error">{sale.error}</small>}</div>
            {sale.voidedAt && <small className="pos-sale-void-reason">{isArabic ? 'ملغاة' : 'Annulée'} {new Date(sale.voidedAt).toLocaleString(isArabic ? 'ar-DZ' : 'fr-DZ')}{sale.voidReason ? ` · ${sale.voidReason}` : ''}</small>}
          </article>)}
        </div>
        <button className="pos-sync-button pos-sync-button--large" type="button" disabled={pendingCount === 0 || !online} onClick={() => void synchronize()}><RefreshCw size={16} />{isArabic ? 'مزامنة المبيعات المحفوظة' : 'Synchroniser les ventes en attente'}</button>
      </section>}
      {printingSaleId && (() => {
        const sale = visibleSales.find(item => item.id === printingSaleId);
        if (!sale) return null;
        const paymentLabel = sale.paymentMethod === 'cash' ? (isArabic ? 'نقداً' : 'Espèces') : sale.paymentMethod === 'card' ? (isArabic ? 'بطاقة' : 'Carte') : 'BaridiMob';
        const date = new Date(sale.createdAt);
        const units = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        const vatBp = catalog?.restaurant.vat_rate_bp ?? 0;
        const vatAmount = vatBp > 0 ? Math.round(totalSaleDzd(sale.items) * vatBp / (10000 + vatBp)) : 0;
        return <div className={`pos-receipt pos-receipt--${receiptFormat}`} aria-hidden="true">
          <header>
            <strong className="pos-receipt__name">{catalog?.restaurant.name ?? 'Digifeel'}</strong>
            <span>{date.toLocaleDateString('fr-DZ')} · {date.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{isArabic ? 'تذكرة' : 'Ticket'}             n° {sale.ticketNumber ? String(sale.ticketNumber).padStart(6, '0') : sale.id.slice(0, 8).toUpperCase()}</span>
          </header>
          <table>
            <thead><tr><th>{isArabic ? 'المنتج' : 'Article'}</th><th>{isArabic ? 'الكمية' : 'Qté'}</th><th>{isArabic ? 'المبلغ' : 'Montant'}</th></tr></thead>
            <tbody>{sale.items.map((item, index) => <tr key={`${sale.id}-r-${index}`}><td>{item.productName}<small>{money(item.priceDzd, locale)} {isArabic ? '/ وحدة' : 'l’unité'}</small></td><td>{item.quantity}</td><td>{money(item.priceDzd * item.quantity, locale)}</td></tr>)}</tbody>
          </table>
          <div className="pos-receipt__total"><span>{isArabic ? 'المجموع' : 'TOTAL'} ({units})</span><strong>{money(totalSaleDzd(sale.items), locale)}</strong></div>
          {vatBp > 0 && <div className="pos-receipt__meta"><span>{isArabic ? 'قبل الضريبة' : 'Total HT'} : {money(totalSaleDzd(sale.items) - vatAmount, locale)}</span><span>{isArabic ? 'ضريبة' : 'TVA'} {vatBp / 100} % : {money(vatAmount, locale)}</span></div>}
          <div className="pos-receipt__meta"><span>{isArabic ? 'الدفع' : 'Paiement'} : {paymentLabel}</span>{sale.paymentReference && <span>Réf. {sale.paymentReference}</span>}</div>
          <footer>{isArabic ? 'شكراً لزيارتكم' : 'Merci de votre visite'}</footer>
        </div>;
      })()}
      {printingSaleId && <PrintReset onDone={() => setPrintingSaleId(null)} />}
      <footer className="pos-footer"><span>{isArabic ? 'يتم تخزين التذاكر غير المتصلة على هذا الجهاز حتى المزامنة.' : 'Les tickets hors ligne restent sur cet appareil jusqu’à leur synchronisation.'}</span><span>{isArabic ? 'العملة: الدينار الجزائري' : 'Devise : dinar algérien (DZD)'}</span></footer>
    </main>
  );
}
