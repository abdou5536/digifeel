'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, Check, ChefHat, CircleDollarSign, CreditCard, Minus, Plus, Printer, ReceiptText, RefreshCw, ShoppingBag, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { ThemePicker } from './ThemePicker';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';
import { deleteCatalog, deleteLocalSale, loadCatalog, loadLocalSales, saveCatalog, saveLocalSale } from '@/src/lib/pos/offline-store';
import { totalSaleDzd, type LocalPosSale, type PaymentMethod, type PosCatalog, type PosProduct, type PosSaleLine, type PosSaleRecord } from '@/src/lib/pos/types';

const demoProducts: PosProduct[] = [
  { id: 'demo-product-1', name: 'Café crème', category: 'Boissons', price_dzd: 180, active: true, updated_at: '' },
  { id: 'demo-product-2', name: 'Thé à la menthe', category: 'Boissons', price_dzd: 150, active: true, updated_at: '' },
  { id: 'demo-product-3', name: 'Chakchouka', category: 'Plats', price_dzd: 850, active: true, updated_at: '' },
  { id: 'demo-product-4', name: 'Couscous maison', category: 'Plats', price_dzd: 1400, active: true, updated_at: '' },
  { id: 'demo-product-5', name: 'Salade méchouia', category: 'Entrées', price_dzd: 500, active: true, updated_at: '' },
  { id: 'demo-product-6', name: 'Tiramisu', category: 'Desserts', price_dzd: 450, active: true, updated_at: '' }
];

const demoCatalog: PosCatalog = {
  userId: 'demo',
  restaurant: { id: 'demo-restaurant', name: 'Dar El Bahia' },
  role: 'restaurant_admin',
  products: demoProducts
};

interface CartProduct extends PosSaleLine {
  category: string;
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
    status: 'synced'
  };
}

export function RestaurantPOS({ demo = false }: { demo?: boolean }) {
  const { locale, toggleLocale } = useLanguage();
  const isArabic = locale === 'ar';
  const [catalog, setCatalog] = useState<PosCatalog | null>(demo ? demoCatalog : null);
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
  const [activeTab, setActiveTab] = useState<'cashier' | 'products' | 'history'>('cashier');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [menuCategory, setMenuCategory] = useState('Tout');
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'80' | '58' | 'a4'>('80');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');

  const refreshSales = useCallback(async () => {
    if (demo || !navigator.onLine) return;
    const response = await fetch('/api/pos/sales?period=today', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Historique indisponible.');
    setServerSales((result.sales as PosSaleRecord[]).map(normalizeSale));
  }, [demo]);

  const synchronize = useCallback(async (ownerId = catalog?.userId ?? '') => {
    if (demo || !navigator.onLine || !ownerId) return;
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
  }, [catalog?.userId, demo, isArabic, refreshSales]);

  useEffect(() => {
    let alive = true;
    const start = async () => {
      setOnline(navigator.onLine);
      if (demo) return;
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
  }, [demo, isArabic, synchronize]);

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
    if (cart.length === 0 || busy) return;
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
      if (demo) {
        setLocalSales(current => [{ ...sale, status: 'synced' }, ...current]);
      } else {
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
      }
      setCart([]);
      setPaymentReference('');
      if (demo) setMessage(isArabic ? 'تم تسجيل عملية البيع التجريبية.' : 'Vente de démonstration enregistrée.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Le ticket n’a pas pu être enregistré.');
    } finally {
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
      if (demo) {
        if (editingProductId) {
          setCatalog(current => current ? {
            ...current,
            products: current.products.map(product => product.id === editingProductId
              ? { ...product, name: productName.trim(), category: category.trim(), price_dzd: priceDzd }
              : product)
          } : current);
        } else {
          setCatalog(current => current ? {
            ...current,
            products: [...current.products, {
              id: crypto.randomUUID(),
              name: productName.trim(),
              category: category.trim(),
              price_dzd: priceDzd,
              active: true,
              updated_at: new Date().toISOString()
            }]
          } : current);
        }
      } else {
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
      }
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
    if (!demo) setBusy(true);
    try {
      if (demo) {
        setCatalog(current => current ? { ...current, products: current.products.map(item => item.id === product.id ? { ...item, active: !item.active } : item) } : current);
      } else {
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
          {demo ? <Link className="pos-logout" href="/login?next=/caisse">{isArabic ? 'تسجيل الدخول' : 'Connexion'}</Link> : <button className="pos-logout" onClick={() => { window.location.assign('/'); }} type="button">{isArabic ? 'الرئيسية' : 'Accueil'}</button>}
        </div>
      </header>

      <nav className="pos-tabs" aria-label={isArabic ? 'أقسام نقطة البيع' : 'Sections du logiciel'}>
        <button type="button" className={activeTab === 'cashier' ? 'is-active' : ''} onClick={() => setActiveTab('cashier')}><ShoppingBag size={17} />{isArabic ? 'الصندوق' : 'Caisse'}</button>
        {catalog.role === 'restaurant_admin' && <button type="button" className={activeTab === 'products' ? 'is-active' : ''} onClick={() => setActiveTab('products')}><ChefHat size={17} />{isArabic ? 'قائمة الطعام' : 'Menu'}</button>}
        <button type="button" className={activeTab === 'history' ? 'is-active' : ''} onClick={() => setActiveTab('history')}><ReceiptText size={17} />{isArabic ? 'المبيعات' : 'Ventes du jour'}</button>
        {demo && <span className="pos-demo-tag">{isArabic ? 'عرض تجريبي' : 'Mode démo'}</span>}
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
          <p className="pos-payment-note">{isArabic ? 'الدفع عبر BaridiMob يتم خارج التطبيق، ويتم تسجيله يدوياً.' : 'BaridiMob est confirmé en dehors de l’application puis enregistré ici.'}</p>
        </aside>
      </div>}

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
        <div className="pos-sales-list">
          {visibleSales.length === 0 && <p className="pos-empty-hint">{isArabic ? 'لا توجد مبيعات بعد.' : 'Aucune vente enregistrée pour le moment.'}</p>}
          {visibleSales.map(sale => <article className={`pos-sale-card${printingSaleId === sale.id ? ' is-printing' : ''}`} key={sale.id}>
            <div className="pos-sale-card__main"><span className={`pos-sale-state is-${sale.status}`}>{sale.status === 'synced' ? (isArabic ? 'مزامن' : 'Synchronisée') : sale.status === 'conflict' ? (isArabic ? 'تحتاج مراجعة' : 'À vérifier') : (isArabic ? 'بانتظار المزامنة' : 'En attente')}</span><strong>{money(totalSaleDzd(sale.items), locale)}</strong><small>{new Date(sale.createdAt).toLocaleString(isArabic ? 'ar-DZ' : 'fr-DZ')}</small></div>
            <ul>{sale.items.map((item, index) => <li key={`${sale.id}-${index}`}>{item.quantity} × {item.productName} <span>{money(item.priceDzd * item.quantity, locale)}</span></li>)}</ul>
            <div className="pos-sale-card__footer"><span>{sale.paymentMethod === 'cash' ? (isArabic ? 'نقداً' : 'Espèces') : sale.paymentMethod === 'card' ? (isArabic ? 'بطاقة' : 'Carte') : 'BaridiMob'}{sale.paymentReference && ` · ${sale.paymentReference}`}</span>{sale.status === 'synced' && <button type="button" onClick={() => printSale(sale.id)}><Printer size={15} />{isArabic ? 'طباعة' : 'Imprimer'}</button>}{sale.error && <small className="pos-sale-error">{sale.error}</small>}</div>
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
        return <div className={`pos-receipt pos-receipt--${receiptFormat}`} aria-hidden="true">
          <header>
            <strong className="pos-receipt__name">{catalog?.restaurant.name ?? 'Digifeel'}</strong>
            <span>{date.toLocaleDateString('fr-DZ')} · {date.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{isArabic ? 'تذكرة' : 'Ticket'} n° {sale.id.slice(0, 8).toUpperCase()}</span>
          </header>
          <table>
            <thead><tr><th>{isArabic ? 'المنتج' : 'Article'}</th><th>{isArabic ? 'الكمية' : 'Qté'}</th><th>{isArabic ? 'المبلغ' : 'Montant'}</th></tr></thead>
            <tbody>{sale.items.map((item, index) => <tr key={`${sale.id}-r-${index}`}><td>{item.productName}<small>{money(item.priceDzd, locale)} {isArabic ? '/ وحدة' : 'l’unité'}</small></td><td>{item.quantity}</td><td>{money(item.priceDzd * item.quantity, locale)}</td></tr>)}</tbody>
          </table>
          <div className="pos-receipt__total"><span>{isArabic ? 'المجموع' : 'TOTAL'} ({units})</span><strong>{money(totalSaleDzd(sale.items), locale)}</strong></div>
          <div className="pos-receipt__meta"><span>{isArabic ? 'الدفع' : 'Paiement'} : {paymentLabel}</span>{sale.paymentReference && <span>Réf. {sale.paymentReference}</span>}</div>
          <footer>{isArabic ? 'شكراً لزيارتكم' : 'Merci de votre visite'}</footer>
        </div>;
      })()}
      {printingSaleId && <PrintReset onDone={() => setPrintingSaleId(null)} />}
      <footer className="pos-footer"><span>{isArabic ? 'يتم تخزين التذاكر غير المتصلة على هذا الجهاز حتى المزامنة.' : 'Les tickets hors ligne restent sur cet appareil jusqu’à leur synchronisation.'}</span><span>{isArabic ? 'العملة: الدينار الجزائري' : 'Devise : dinar algérien (DZD)'}</span></footer>
    </main>
  );
}
