import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { EquipmentChoice, ShippingPreference, PaymentMethodChoice, EstablishmentType } from '../types';
import { soundFX } from '../utils/soundEffects';
import { PRODUCT_PRICING } from '../config/product';
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Radio,
  QrCode,
  X,
  Truck,
  MapPin,
  Copy,
  Check,
  Key,
  ArrowRight,
  Building,
  Smartphone,
  Mail,
  Lock,
  Zap,
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const OrderPackModal: React.FC = () => {
  const {
    isOrderModalOpen,
    setIsOrderModalOpen,
    restaurant,
    createRestaurant,
    setCurrentRestaurantId,
    setMode,
    setActiveEmailModal,
    emailLogs
  } = useApp();

  // Restaurant details
  const [establishmentType, setEstablishmentType] = useState<EstablishmentType>('restaurant');
  const [restaurantName, setRestaurantName] = useState(restaurant?.name || 'Le Grand Café');
  const [managerName, setManagerName] = useState(restaurant?.ownerName || 'David');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(restaurant?.address ? `${restaurant.address}, ${restaurant.city}` : '14 Avenue des Champs-Élysées, Paris');
  const [tableCount, setTableCount] = useState(restaurant?.tableCount || 12);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(restaurant?.googleReviewUrl || 'https://maps.app.goo.gl/LeGrandCafeParis');

  // Delivery / Installation preference
  const [shippingPreference, setShippingPreference] = useState<ShippingPreference>('on_site');

  // Website question & equipment question
  const [hasWebsite, setHasWebsite] = useState<boolean>(restaurant?.hasWebsite || false);
  const [websiteUrl, setWebsiteUrl] = useState<string>(restaurant?.websiteUrl || '');
  const [equipmentChoice, setEquipmentChoice] = useState<EquipmentChoice>(restaurant?.equipmentChoice || 'full_pack');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>('card_stripe');

  // Stripe Checkout Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [postalCode, setPostalCode] = useState('75008');
  const [saveCard, setSaveCard] = useState(true);

  // Stripe Processing state
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [stripeStep, setStripeStep] = useState<'idle' | 'authorizing' | '3ds_verification' | 'confirmed'>('idle');
  const [stripePaymentId, setStripePaymentId] = useState('');

  // Credentials created
  const [createdSlug, setCreatedSlug] = useState('');
  const [createdPin, setCreatedPin] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [orderCurrency, setOrderCurrency] = useState<'DZD' | 'EUR' | 'USD'>('DZD');
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const isProcessingStripeRef = React.useRef(isProcessingStripe);
  isProcessingStripeRef.current = isProcessingStripe;

  useEffect(() => {
    if (!isOrderModalOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      dialog.scrollTop = 0;
      dialog.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessingStripeRef.current) {
        setIsOrderModalOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements?.length) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || activeElement === dialogRef.current)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOrderModalOpen, setIsOrderModalOpen]);

  const getPriceInOrderCurrency = (euroPrice: number) => {
    return `${euroPrice} €`;
  };
  useEffect(() => {
    if (!cardName && managerName) {
      setCardName(managerName.toUpperCase());
    }
  }, [managerName, cardName]);

  if (!isOrderModalOpen) return null;

  // Equipment pricing
  const equipmentPricing: Record<EquipmentChoice, { price: number; title: string; subtitle: string; icon: string }> = {
    full_pack: {
      price: PRODUCT_PRICING.installationPacks.complete.priceEuros,
      title: 'Pack Complet 100 € (Recommandé)',
      subtitle: '5 puces NFC serveurs encodées + Chevalets QR étanches pour toutes vos tables',
      icon: '🏆'
    },
    nfc_servers_only: {
      price: PRODUCT_PRICING.installationPacks.nfc.priceEuros,
      title: 'Puces NFC Serveurs Uniquement (60 €)',
      subtitle: '5 badges électroniques sans contact encodés pour le personnel',
      icon: '📳'
    },
    qr_tables_only: {
      price: PRODUCT_PRICING.installationPacks.qr.priceEuros,
      title: `Chevalets QR Codes Tables Uniquement (${PRODUCT_PRICING.installationPacks.qr.priceEuros} €)`,
      subtitle: 'Chevalets rigides lavables haute définition avec QR unique par table',
      icon: '📱'
    }
  };

  const currentPrice = equipmentPricing[equipmentChoice].price;

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  // Format Card Expiry (MM/YY)
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Pre-fill Random Demo Restaurant for effortless testing & presentation
  const handleFillRandomDemo = () => {
    const sampleNames = ['Le Rooftop d\'Alger', 'La Table de Sidi Yahia', 'Bistrot La Madrague', 'Le Jardin Gourmand Alger', 'L\'Amirauté Port'];
    const sampleManagers = ['Hamza & Équipe', 'Rayan B.', 'Abdou K.', 'Lucas M.'];
    const sampleCities = ['Alger, Hydra', 'Alger, Didouche Mourad', 'Alger, Sidi Yahia', 'Alger, Chéraga'];
    const randomIdx = Math.floor(Math.random() * sampleNames.length);

    const chosenName = sampleNames[randomIdx];
    const chosenManager = sampleManagers[randomIdx % sampleManagers.length];
    const chosenCity = sampleCities[randomIdx % sampleCities.length];
    const cleanSlug = chosenName.toLowerCase().replace(/[^a-z0-9]/g, '');

    setRestaurantName(chosenName);
    setManagerName(chosenManager);
    setEmail(`direction@${cleanSlug}.com`);
    setPhone('+213 555 12 34 56');
    setAddress(`18 Boulevard Mohamed V, ${chosenCity}`);
    setGoogleReviewUrl(`https://maps.google.com/?q=${encodeURIComponent(chosenName + ' ' + chosenCity)}`);
    setTableCount(12);

    // Also fill Stripe Test Card
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('888');
    setCardName(chosenManager.toUpperCase());
    setPostalCode('16000');

    soundFX.playSuccessChime();
  };

  // Pre-fill Stripe Test Card for instant friction-free testing
  const handleFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('888');
    setCardName(managerName.toUpperCase() || 'DAVID RESTAURATEUR');
    setPostalCode('75008');
  };

  // Card brand detection
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'MASTERCARD';
    if (/^3[47]/.test(clean)) return 'AMEX';
    if (/^6(?:011|5)/.test(clean)) return 'DISCOVER';
    return 'CB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 16) || 'resto';
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const mockTxId = `pi_${Math.random().toString(36).substring(2, 11)}_secret_${Math.random().toString(36).substring(2, 9)}`;

    setCreatedSlug(slug);
    setCreatedPin(pin);
    setStripePaymentId(mockTxId);

    // If Stripe payment, execute realistic Stripe processing flow
    if (paymentMethod === 'card_stripe') {
      setIsProcessingStripe(true);
      setStripeStep('authorizing');

      await new Promise(resolve => setTimeout(resolve, 800));
      setStripeStep('3ds_verification');

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStripeStep('confirmed');

      await new Promise(resolve => setTimeout(resolve, 500));
      setIsProcessingStripe(false);
    }

    const newResto = createRestaurant({
      establishmentType,
      slug,
      username: slug,
      accessPin: pin,
      name: restaurantName,
      ownerName: managerName,
      email: email || `${slug}@restaurant.fr`,
      address,
      city: address.split(',')[1]?.trim() || 'Paris',
      phone,
      googleReviewUrl: googleReviewUrl.trim() || `https://maps.google.com/?q=${encodeURIComponent(restaurantName)}`,
      setupKitCost: currentPrice,
      tableCount,
      currency: '€',
      baselineRating: 2.0,
      starTiers: restaurant?.starTiers || [],
      hasWebsite,
      websiteUrl: hasWebsite ? websiteUrl : '',
      equipmentChoice,
      shippingPreference
    });

    setCurrentRestaurantId(newResto.id);
    setIsSuccess(true);

    try {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#ffffff', '#cbd5e1', '#f59e0b', '#00f0ff']
      });
    } catch {
      // ignore
    }
  };

  const dashboardUrl = `${window.location.origin}/?resto=${createdSlug}&view=manager`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(dashboardUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleClose = () => {
    setIsOrderModalOpen(false);
    setIsSuccess(false);
    setIsProcessingStripe(false);
  };

  const handleEnterDashboard = () => {
    setIsOrderModalOpen(false);
    setIsSuccess(false);
    setMode('manager');
  };

  const handleOpenEmailViewer = () => {
    if (emailLogs.length > 0) {
      setActiveEmailModal(emailLogs[0]);
    }
    setIsOrderModalOpen(false);
  };

  return createPortal((
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="order-pack-overlay fixed inset-0 z-50 bg-[#030508]/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4"
        onClick={event => {
          if (event.target === event.currentTarget && !isProcessingStripe) {
            setIsOrderModalOpen(false);
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-pack-title"
          tabIndex={-1}
          className="order-pack-dialog bg-gradient-to-b from-[#111625] via-[#090d18] to-[#04060c] text-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-white/20 relative my-6 glass-glow-silver"
        >
          {/* Top Close Button */}
          <button
            onClick={handleClose}
            type="button"
            aria-label="Fermer la fenêtre des packs"
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors z-20 border border-white/10"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* BRANDING HEADER: DIGIFEEL & NFC RESTO */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/30 flex items-center justify-center text-white shadow-lg">
                <Radio className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span id="order-pack-title" className="font-display font-black text-white text-base tracking-tight">DIGIFEEL · Choisir un pack</span>
                  <span className="text-[10px] font-mono uppercase bg-white/10 text-slate-300 border border-white/15 px-2 py-0.5 rounded-full font-bold">
                    13.56 MHz NFC
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Améliorez votre E-réputation & Décuplez vos Pourboires
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stripe Checkout 256-Bit</span>
            </div>
          </div>

          {/* 1. SUCCESS STATE AFTER PAYMENT */}
          {isSuccess ? (
            <div className="text-center py-2 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold mb-2 border border-emerald-500/30">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Paiement Stripe confirmé ({currentPrice} € TTC)</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Félicitations ! Votre Pack est Validé
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1">
                  Le restaurant <strong className="text-white underline decoration-amber-400">{restaurantName}</strong> a été initialisé. Vos accès privés et le reçu Stripe vous attendent.
                </p>
              </div>

              {/* Stripe Transaction Receipt Badge */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-xs flex items-center justify-between text-left">
                <div>
                  <span className="text-slate-400 text-[11px] block">Réf. Transaction Stripe :</span>
                  <span className="font-mono text-emerald-400 font-bold text-xs select-all">{stripePaymentId}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Statut Stripe :</span>
                  <span className="text-emerald-300 font-bold text-xs">Succeeded (Payé)</span>
                </div>
              </div>

              {/* Private Credentials Box */}
              <div className="glass-card-noir rounded-2xl p-5 text-left space-y-3 border border-white/20 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-200 font-bold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Vos Accès Secrets Gestionnaire</span>
                  </span>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-500/30">
                    Espace Dédié & Isolé
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Identifiant Restaurant :</span>
                    <span className="font-mono font-bold text-white text-sm">{createdSlug}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Code Secret PIN :</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{createdPin}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="text-[11px] text-slate-400">Lien direct de votre Dashboard Patron :</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={dashboardUrl}
                      className="w-full text-xs font-mono bg-white/5 border border-white/15 rounded-xl px-2.5 py-1.5 text-slate-200 select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-2 bg-white/15 text-white font-bold rounded-xl hover:bg-white/25 shrink-0 border border-white/20"
                      title="Copier le lien direct"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Fiche Google Avis programmée :</span>
                  <span className="font-mono text-amber-300 font-bold truncate max-w-[220px]">
                    {googleReviewUrl || `https://maps.google.com/?q=${encodeURIComponent(restaurantName)}`}
                  </span>
                </div>
              </div>

              {/* Hardware Delivery Summary */}
              <div className="glass-card-dark rounded-2xl p-4 text-left border border-white/10 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-white">
                    {shippingPreference === 'on_site' ? 'Installation sur place programmée' : 'Expédition Colissimo 48h en cours'}
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {shippingPreference === 'on_site'
                      ? `Notre technicien prendra contact au ${phone || 'votre numéro'} pour la pose et la programmation des 5 puces.`
                      : `Votre colis contenant les 5 puces NFC encodées et les chevalets tables sera livré à l'adresse : ${address}.`}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleEnterDashboard}
                  className="w-full py-4 px-5 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ArrowRight className="w-5 h-5 text-slate-950" />
                  <span>🚀 Ouvrir le Compte & Dashboard de ce Restaurant</span>
                </button>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenEmailViewer}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-white/15 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span>Consulter l'Email d'Activation Reçu</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                  >
                    <span>Fermer cette fenêtre</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 2. ORDER & STRIPE PAYMENT FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Modal Subtitle & Value Proposition */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
                <div className="space-y-0.5">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Pack Restaurant Clé en Main</span>
                    <span className="font-mono text-cyan-300 text-xl font-black">{getPriceInOrderCurrency(currentPrice)}</span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    5 puces NFC serveurs, QR codes tables, Dashboard gérant et redirection Google Avis.
                  </p>
                </div>

                {/* Quick Auto-Fill Demo Button */}
                <button
                  type="button"
                  onClick={handleFillRandomDemo}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95 shadow-md shadow-cyan-500/10"
                  title="Remplir instantanément avec des données d'exemple (Hamza, Rayan, Le Rooftop d'Alger...)"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Remplir Exemple Aléatoire</span>
                </button>
              </div>

              {/* Currency & Region Selector */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <label className="text-xs font-bold text-slate-200 font-mono flex items-center justify-between">
                  <span>Choisissez votre pays & devise de règlement :</span>
                  <span className="text-[10px] text-cyan-300 font-bold">Conversion indicative</span>
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderCurrency('DZD');
                      setPaymentMethod('ccp_algerie');
                      soundFX.playHoverTick();
                    }}
                    className={`py-2 px-2.5 rounded-xl border font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderCurrency === 'DZD'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span>🇩🇿 Algérie</span>
                    <span className="text-[10px] opacity-90">({getPriceInOrderCurrency(100)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderCurrency('EUR');
                      setPaymentMethod('card_stripe');
                      soundFX.playHoverTick();
                    }}
                    className={`py-2 px-2.5 rounded-xl border font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderCurrency === 'EUR'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span>🇪🇺 Europe</span>
                    <span className="text-[10px] opacity-90">(100 €)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderCurrency('USD');
                      setPaymentMethod('card_stripe');
                      soundFX.playHoverTick();
                    }}
                    className={`py-2 px-2.5 rounded-xl border font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderCurrency === 'USD'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span>🇺🇸 USA / Int.</span>
                    <span className="text-[10px] opacity-90">($110)</span>
                  </button>
                </div>
              </div>

              {/* Establishment Type Selector (Restaurant vs Hotel) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 block">
                  1. Type de votre établissement :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEstablishmentType('restaurant');
                      soundFX.playHoverTick();
                    }}
                    className={`p-3 rounded-2xl border text-left font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                      establishmentType === 'restaurant'
                        ? 'border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400/40 shadow-md'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">🍽️</span>
                    <div>
                      <div className="font-bold text-xs text-white">Restaurant & Bar</div>
                      <div className="text-[10px] text-slate-400">Tables, terrasses & puces serveurs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEstablishmentType('hotel');
                      soundFX.playHoverTick();
                    }}
                    className={`p-3 rounded-2xl border text-left font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                      establishmentType === 'hotel'
                        ? 'border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400/40 shadow-md'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">🏨</span>
                    <div>
                      <div className="font-bold text-xs text-white">Hôtel & Palace 5★</div>
                      <div className="text-[10px] text-slate-400">Chambres, conciergerie & room service</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Hardware Choice Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  2. Choisissez votre composition matérielle :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.keys(equipmentPricing) as EquipmentChoice[]).map(key => {
                    const item = equipmentPricing[key];
                    const isSelected = equipmentChoice === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEquipmentChoice(key)}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? 'border-white/40 bg-white/15 text-white shadow-lg ring-1 ring-white/30'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs font-black font-mono text-amber-400">{item.price} €</span>
                        </div>
                        <div className="font-bold text-xs text-white leading-snug">{item.title}</div>
                        <div className="text-[10px] text-slate-400 mt-1 leading-tight">{item.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Preference */}
              <div className="p-3.5 glass-card-noir rounded-2xl border border-white/10 space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  3. Mode de réception du matériel :
                </label>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShippingPreference('on_site')}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all flex items-center gap-2 ${
                      shippingPreference === 'on_site'
                        ? 'border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/40'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Installation sur place</div>
                      <div className="text-[10px] text-slate-400">Déplacement direct en salle</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingPreference('postal_shipping')}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all flex items-center gap-2 ${
                      shippingPreference === 'postal_shipping'
                        ? 'border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/40'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Envoi Colissimo 48h</div>
                      <div className="text-[10px] text-slate-400">Pré-encodé prêt à poser</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Restaurant & Manager Inputs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  4. Coordonnées de votre établissement :
                </label>
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-400 block mb-1">
                      {establishmentType === 'hotel' ? 'Nom de l\'hôtel' : 'Nom du restaurant'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={establishmentType === 'hotel' ? 'Ex: Grand Hôtel & Spa' : 'Ex: Le Grand Café'}
                      value={restaurantName}
                      onChange={e => setRestaurantName(e.target.value)}
                      className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-400 block mb-1">
                      {establishmentType === 'hotel' ? 'Directeur / Responsable' : 'Nom du gérant (responsable)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={managerName}
                      onChange={e => setManagerName(e.target.value)}
                      className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-400 block mb-1">Email (pour recevoir les accès & reçu)</label>
                    <input
                      type="email"
                      required
                      placeholder="direction@restaurant.fr"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-400 block mb-1">Téléphone de contact</label>
                    <input
                      type="tel"
                      required
                      placeholder="Téléphone de contact"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-400 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-400 block mb-1">Adresse complète de livraison ou installation</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-400 block mb-1">
                      {establishmentType === 'hotel' ? 'Nombre de chambres & suites à équiper' : 'Nombre de tables en salle & terrasse'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      required
                      value={tableCount}
                      onChange={e => setTableCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full p-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:ring-1 focus:ring-amber-400 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Google Maps / Reviews Redirection Input */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Fiche Google Avis de votre Restaurant (Lien officiel)</span>
                    </label>
                    <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                      Redirection NFC
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Quand le client scanne la puce NFC en salle, il note le travail du serveur sur notre application. Dès validation, il reçoit ce lien Google pour publier son avis 5 étoiles sur votre restaurant !
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      required
                      placeholder="Ex: https://maps.app.goo.gl/... ou https://g.page/r/.../review"
                      value={googleReviewUrl}
                      onChange={e => setGoogleReviewUrl(e.target.value)}
                      className="w-full p-2.5 bg-black/40 border border-white/20 rounded-xl text-white font-mono text-xs focus:ring-1 focus:ring-amber-400 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. STRIPE PAYMENT METHOD INTEGRATION */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 block">
                    4. Paiement Sécurisé ({currentPrice} € TTC) :
                  </label>
                  <button
                    type="button"
                    onClick={handleFillTestCard}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Remplir Carte Test Stripe ⚡</span>
                  </button>
                </div>

                {/* Payment Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card_stripe')}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      paymentMethod === 'card_stripe'
                        ? 'border-cyan-400/80 bg-gradient-to-r from-cyan-950/40 to-slate-900 text-white ring-1 ring-cyan-400/40 shadow-lg'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Carte Visa / CB</div>
                      <div className="text-[10px] text-slate-400">Paiement Stripe Sécurisé</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ccp_algerie')}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      paymentMethod === 'ccp_algerie'
                        ? 'border-amber-400/80 bg-gradient-to-r from-amber-950/40 to-slate-900 text-white ring-1 ring-amber-400/40 shadow-lg'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base shrink-0" aria-hidden="true">CCP</span>
                    <div>
                      <div className="font-bold text-xs text-white">CCP & BaridiMob</div>
                      <div className="text-[10px] text-amber-300 font-mono">Coordonnées serveur requises</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-emerald-400/80 bg-gradient-to-r from-emerald-950/40 to-slate-900 text-white ring-1 ring-emerald-400/40 shadow-lg'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Virement SEPA</div>
                      <div className="text-[10px] text-slate-400">IBAN Prestataire</div>
                    </div>
                  </button>
                </div>

                {/* CCP & BARIDIMOB ALGERIE FORM */}
                {paymentMethod === 'ccp_algerie' && (
                  <div className="glass-card-noir rounded-2xl border border-amber-500/40 p-4 text-sm text-slate-200">
                    Le paiement manuel n’est pas traité dans cette démonstration. Dans l’espace restaurateur connecté, les coordonnées CCP/Baridimob et le taux de conversion sont chargés depuis la configuration serveur.
                  </div>
                )}

                {/* STRIPE CARD ELEMENT FORM */}
                {paymentMethod === 'card_stripe' && (
                  <div className="glass-card-noir rounded-2xl p-4 border border-white/15 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Formulaire de Paiement Stripe Chiffré</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                          {getCardBrand()}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                          PCI-DSS Level 1
                        </span>
                      </div>
                    </div>

                    {/* Card Fields */}
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="font-medium text-slate-400 block mb-1">Numéro de carte de crédit / débit</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            onChange={e => handleCardNumberChange(e.target.value)}
                            className="w-full p-2.5 pl-9 bg-white/5 border border-white/20 rounded-xl text-white font-mono tracking-widest text-xs focus:ring-1 focus:ring-emerald-400"
                          />
                          <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="font-medium text-slate-400 block mb-1">Expiration (MM/AA)</label>
                          <input
                            type="text"
                            required
                            placeholder="12/28"
                            value={cardExpiry}
                            onChange={e => handleExpiryChange(e.target.value)}
                            className="w-full p-2.5 bg-white/5 border border-white/20 rounded-xl text-white font-mono text-center text-xs focus:ring-1 focus:ring-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="font-medium text-slate-400 block mb-1">CVC / CVV</label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            placeholder="123"
                            value={cardCvc}
                            onChange={e => setCardCvc(e.target.value.replace(/\D/g, ''))}
                            className="w-full p-2.5 bg-white/5 border border-white/20 rounded-xl text-white font-mono text-center text-xs focus:ring-1 focus:ring-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="font-medium text-slate-400 block mb-1">Code Postal</label>
                          <input
                            type="text"
                            required
                            placeholder="75008"
                            value={postalCode}
                            onChange={e => setPostalCode(e.target.value)}
                            className="w-full p-2.5 bg-white/5 border border-white/20 rounded-xl text-white font-mono text-center text-xs focus:ring-1 focus:ring-emerald-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-medium text-slate-400 block mb-1">Titulaire de la carte</label>
                        <input
                          type="text"
                          required
                          placeholder="DAVID NOM"
                          value={cardName}
                          onChange={e => setCardName(e.target.value.toUpperCase())}
                          className="w-full p-2.5 bg-white/5 border border-white/20 rounded-xl text-white font-mono text-xs focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={saveCard}
                          onChange={e => setSaveCard(e.target.checked)}
                          className="rounded bg-white/10 border-white/20 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-[11px] text-slate-400">
                          Mémoriser mes coordonnées sécurisées pour les futurs réassorts de puces
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* BANK TRANSFER ALTERNATIVE */}
                {paymentMethod === 'bank_transfer' && (
                  <div className="glass-card-noir rounded-2xl p-4 border border-white/15 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-amber-400" />
                        <span>Virement Bancaire (RIB Prestataire)</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                        Activation immédiate
                      </span>
                    </div>

                    <p className="text-sm text-slate-200">Les coordonnées bancaires ne sont pas disponibles dans la démonstration. Aucun virement n’est initié ici.</p>
                  </div>
                )}
              </div>

              {/* Total & Submit Button */}
              <div className="order-pack-submit pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                <div className="text-left w-full sm:w-auto">
                  <div className="text-xs text-slate-400">Total à régler :</div>
                  <div className="text-xl font-black text-white font-mono flex items-baseline gap-1">
                    <span>{currentPrice} €</span>
                    <span className="text-xs text-slate-400 font-sans font-normal">TTC · Sans abonnement</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isProcessingStripe}
                    className="px-4 py-2.5 text-slate-400 hover:text-white rounded-xl text-xs transition-colors"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessingStripe}
                    className="py-3 px-6 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {isProcessingStripe ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>
                          {stripeStep === 'authorizing' && 'Autorisation Stripe...'}
                          {stripeStep === '3ds_verification' && 'Vérification 3D Secure...'}
                          {stripeStep === 'confirmed' && 'Paiement Validé !'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Payer {currentPrice} € avec Stripe & Générer Compte</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  ), document.body);
};
