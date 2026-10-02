/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Internationalization & RTL Management
 * Full French & Arabic localization with contextual formatting.
 */

export type Language = 'fr' | 'ar';

export interface Translations {
  // Brand & Nav
  brandTagline: string;
  navHome: string;
  navHowItWorks: string;
  navDemo: string;
  navPricing: string;
  navFaq: string;
  navContact: string;
  navLogin: string;
  navLogout: string;
  navDashboard: string;
  navSuperAdmin: string;
  demoBadge: string;
  switchLang: string;

  // Hero Section
  heroTitle1: string;
  heroTitleHighlight: string;
  heroTitle2: string;
  heroSubtitle: string;
  heroCtaOrder: string;
  heroCtaDemo: string;
  heroStatRating: string;
  heroStatSpeed: string;
  heroStatConversion: string;

  // Interactive 3D NFC
  nfcChipLabel: string;
  nfcScanTooltip: string;
  nfcInteractiveNotice: string;

  // How it works
  howTitle: string;
  howSubtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;

  // Interactive Phone Demo
  demoSectionTitle: string;
  demoSectionSubtitle: string;
  demoBtnSimulateScan: string;
  demoScanSimulated: string;
  demoWaitersSelect: string;
  demoRatingPrompt: string;
  demoTipPrompt: string;
  demoSubmitReview: string;
  demoSuccessTitle: string;
  demoSuccessSubtitle: string;
  demoGoogleCta: string;
  demoGoogleSimulatedNotice: string;
  demoReset: string;

  // Pricing & Installation Pack
  pricingTitle: string;
  pricingSubtitle: string;
  packTitle: string;
  packPrice: string;
  packPriceSub: string;
  packFeature1: string;
  packFeature2: string;
  packFeature3: string;
  packFeature4: string;
  packFeature5: string;
  packCta: string;
  subTitle: string;
  subPrice: string;
  subPriceSub: string;
  subFeature1: string;
  subFeature2: string;
  subFeature3: string;
  subFeature4: string;

  // Chip Activation Flow
  activationTitle: string;
  activationSubtitle: string;
  activationCodeLabel: string;
  activationCodePlaceholder: string;
  restaurantNameLabel: string;
  googleReviewUrlLabel: string;
  ownerEmailLabel: string;
  passwordLabel: string;
  targetTypeLabel: string;
  targetServer: string;
  targetTable: string;
  btnActivateChip: string;
  activationSuccess: string;

  // Customer Rating & Review
  ratingTitle: string;
  ratingSubtitle: string;
  stars5: string;
  stars4: string;
  stars3: string;
  stars2: string;
  stars1: string;
  complimentFast: string;
  complimentFriendly: string;
  complimentDelicious: string;
  complimentClean: string;
  complimentAtmosphere: string;
  commentPlaceholder: string;
  tipSelection: string;
  tipCustom: string;
  btnSubmitReview: string;
  thankYouTitle: string;
  thankYouDesc: string;
  btnLeaveGoogleReview: string;

  // Manager Dashboard
  managerTitle: string;
  managerTabOverview: string;
  managerTabReviews: string;
  managerTabServers: string;
  managerTabSettings: string;
  managerTabExports: string;
  statsAverageRating: string;
  statsScansToday: string;
  statsTotalTips: string;
  statsGoogleConversions: string;
  exportPdfBtn: string;
  exportExcelBtn: string;
  exportSubscriptionNotice: string;
  btnUpgradeSubscription: string;

  // Super Admin
  superAdminTitle: string;
  superAdminBatchTitle: string;
  btnGenerateBatch: string;
  batchGeneratedSuccess: string;
  totalChipsRegistered: string;
  totalRestaurants: string;

  // Footer & Contact
  footerTagline: string;
  footerRights: string;
  whatsappContact: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    brandTagline: 'Puces NFC & QR codes pour avis et pourboires restaurant',
    navHome: 'Accueil',
    navHowItWorks: 'Fonctionnement',
    navDemo: 'Démo interactive',
    navPricing: 'Tarifs',
    navFaq: 'FAQ',
    navContact: 'Contact',
    navLogin: 'Espace Gérant',
    navLogout: 'Déconnexion',
    navDashboard: 'Tableau de bord',
    navSuperAdmin: 'Super Admin',
    demoBadge: 'Mode Démo',
    switchLang: 'العربية',

    heroTitle1: 'Multipliez vos avis Google &',
    heroTitleHighlight: 'pourboires en 1 clic',
    heroTitle2: 'sans application.',
    heroSubtitle: 'Les puces NFC et chevalets connectés Digifeel permettent à vos clients d’évaluer leur serveur, laisser un pourboire et déposer un avis 5 étoiles sur votre fiche Google Maps en 3 secondes.',
    heroCtaOrder: 'Commander le Pack 100€',
    heroCtaDemo: 'Tester la démo en direct',
    heroStatRating: 'Note moyenne constatée',
    heroStatSpeed: 'Secondes pour noter',
    heroStatConversion: 'Taux de redirection Google',

    nfcChipLabel: 'Puce Connectée Digifeel NTAG',
    nfcScanTooltip: 'Passez votre téléphone pour scanner',
    nfcInteractiveNotice: 'Puce interactive en temps réel • Compatible iPhone & Android sans application',

    howTitle: 'Un fonctionnement instantané et sans friction',
    howSubtitle: 'Une technologie NFC ultra-rapide qui transforme chaque addition en avis Google 5 étoiles et en pourboires motivants pour votre équipe.',
    step1Title: '1. Scan instantané',
    step1Desc: 'Le client approche son smartphone de la puce NFC du serveur ou du chevalet de table QR. La page s’ouvre immédiatement sans aucune application.',
    step2Title: '2. Évaluation & Pourboire',
    step2Desc: 'En 2 touches, le client attribue des étoiles, sélectionne son serveur, laisse un mot chaleureux et ajoute un pourboire par carte bancaire.',
    step3Title: '3. Redirection Google Maps',
    step3Desc: 'L’avis est enregistré en base et le client est guidé d’un clic vers votre page officielle Google Reviews pour propulser votre référencement local.',

    demoSectionTitle: 'Faites l’expérience du scan en direct',
    demoSectionSubtitle: 'Découvrez exactement ce que voit et ressent votre client lorsqu’il approche son smartphone d’une puce Digifeel.',
    demoBtnSimulateScan: 'Simuler un scan NFC',
    demoScanSimulated: 'Ondes NFC détectées — Chargement du service...',
    demoWaitersSelect: 'Votre serveur aujourd’hui',
    demoRatingPrompt: 'Comment s’est déroulé votre repas ?',
    demoTipPrompt: 'Laisser un pourboire au serveur',
    demoSubmitReview: 'Valider mon évaluation',
    demoSuccessTitle: 'Merci pour votre visite !',
    demoSuccessSubtitle: 'Votre avis a bien été enregistré. Partagez votre expérience sur Google pour soutenir l’établissement.',
    demoGoogleCta: 'Publier mon avis sur Google Maps',
    demoGoogleSimulatedNotice: 'Redirection sécurisée vers la fiche Google Business du restaurant.',
    demoReset: 'Recommencer la simulation',

    pricingTitle: 'Une offre claire, rentable dès le premier week-end',
    pricingSubtitle: 'Un équipement physique complet, configuré sur mesure et prêt à l’emploi dès la réception.',
    packTitle: 'Pack d’Installation Clé en Main',
    packPrice: '100 €',
    packPriceSub: 'Paiement unique • 1er mois offert',
    packFeature1: 'Compte Admin Restaurant sécurisé & prêt à l’emploi',
    packFeature2: 'Puces NFC serveurs + Chevalets QR de table encodés',
    packFeature3: 'Lien direct vers votre fiche Google Reviews vérifiée',
    packFeature4: '1er mois d’abonnement Premium inclus gratuitement',
    packFeature5: 'Support personnalisé & expédition rapide',
    packCta: 'Commander mon Pack 100€',
    subTitle: 'Abonnement Gestion & Exports Pro',
    subPrice: '29 € / mois',
    subPriceSub: 'Sans engagement • Résiliable en 1 clic',
    subFeature1: 'Exports comptables illimités en PDF & Excel',
    subFeature2: 'Tableau de bord de performance par serveur en direct',
    subFeature3: 'Statistiques avancées, filtres et répartition des pourboires',
    subFeature4: 'Générateur de QR codes de table dynamiques',

    activationTitle: 'Activation de votre puce Digifeel',
    activationSubtitle: 'Cette puce est prête à être associée à votre établissement. Entrez le code d’activation présent sur votre carte.',
    activationCodeLabel: 'Code d’activation',
    activationCodePlaceholder: 'Ex: DF-8492-PARIS',
    restaurantNameLabel: 'Nom du restaurant',
    googleReviewUrlLabel: 'Lien d’avis Google Maps (g.page/... ou maps.google.com)',
    ownerEmailLabel: 'Email administrateur',
    passwordLabel: 'Mot de passe sécurisé',
    targetTypeLabel: 'Affectation de la puce',
    targetServer: 'Associer à un serveur',
    targetTable: 'Associer à une table / chevalet',
    btnActivateChip: 'Activer la puce maintenant',
    activationSuccess: 'Puce activée avec succès ! Vous pouvez désormais la faire scanner à vos clients.',

    ratingTitle: 'Votre avis sur le service',
    ratingSubtitle: 'Prenez 5 secondes pour nous faire part de votre ressenti',
    stars5: 'Exceptionnel ! ⭐⭐⭐⭐⭐',
    stars4: 'Très bon service ⭐⭐⭐⭐',
    stars3: 'Correct ⭐⭐⭐',
    stars2: 'Moyen ⭐⭐',
    stars1: 'Décevant ⭐',
    complimentFast: 'Service rapide ⚡',
    complimentFriendly: 'Souriant & Chaleureux 😊',
    complimentDelicious: 'Plats délicieux 🍽️',
    complimentClean: 'Cadre impeccable ✨',
    complimentAtmosphere: 'Ambiance agréable 🎵',
    commentPlaceholder: 'Un commentaire ou un mot pour l’équipe ? (facultatif)',
    tipSelection: 'Ajouter un pourboire pour le serveur',
    tipCustom: 'Montant libre',
    btnSubmitReview: 'Envoyer mon avis',
    thankYouTitle: 'Un grand merci !',
    thankYouDesc: 'Votre avis et votre pourboire ont bien été transmis à l’équipe.',
    btnLeaveGoogleReview: 'Déposer mon avis sur Google Maps ★★★★★',

    managerTitle: 'Espace Direction & Pilotage',
    managerTabOverview: 'Vue d’ensemble',
    managerTabReviews: 'Avis clients',
    managerTabServers: 'Serveurs & Équipe',
    managerTabSettings: 'Paramètres & Puces',
    managerTabExports: 'Exports & Comptabilité',
    statsAverageRating: 'Note moyenne globale',
    statsScansToday: 'Scans enregistrés aujourd’hui',
    statsTotalTips: 'Pourboires collectés ce mois',
    statsGoogleConversions: 'Redirections Google Maps',
    exportPdfBtn: 'Exporter le rapport complet PDF',
    exportExcelBtn: 'Exporter en tableur Excel (CSV)',
    exportSubscriptionNotice: 'Les exports PDF et Excel officiels sont inclus avec l’abonnement Pro.',
    btnUpgradeSubscription: 'Activer l’abonnement Pro (29€/mois)',

    superAdminTitle: 'Portail Super-Administrateur',
    superAdminBatchTitle: 'Génération de lots de puces NFC',
    btnGenerateBatch: 'Générer un lot de puces',
    batchGeneratedSuccess: 'Lot généré avec succès ! Prêt pour encodage NTAG.',
    totalChipsRegistered: 'Puces enregistrées',
    totalRestaurants: 'Restaurants actifs',

    footerTagline: 'La technologie NFC & QR au service de la réputation de votre restaurant.',
    footerRights: 'Tous droits réservés. Conçu pour booster votre e-réputation et valoriser vos équipes.',
    whatsappContact: 'Contacter sur WhatsApp'
  },
  ar: {
    brandTagline: 'شرائح NFC ورموز QR لتقييمات وإكراميات المطاعم',
    navHome: 'الرئيسية',
    navHowItWorks: 'كيف يعمل',
    navDemo: 'تجربة تفاعلية',
    navPricing: 'الأسعار',
    navFaq: 'الأسئلة الشائعة',
    navContact: 'اتصل بنا',
    navLogin: 'حساب المدير',
    navLogout: 'تسجيل الخروج',
    navDashboard: 'لوحة التحكم',
    navSuperAdmin: 'المدير العام',
    demoBadge: 'وضع تجريبي',
    switchLang: 'Français',

    heroTitle1: 'ضاعف تقييماتك على Google و',
    heroTitleHighlight: 'الإكراميات بنقرة واحدة',
    heroTitle2: 'بدون أي تطبيق.',
    heroSubtitle: 'تتيح شرائح Digifeel الذكية لزبائنك تقييم النادل، ترك إكرامية ومشاركة تقييم 5 نجوم على خرائط Google في 3 ثوانٍ فقط.',
    heroCtaOrder: 'طلب باقة التثبيت (100€)',
    heroCtaDemo: 'تجربة العرض الحي',
    heroStatRating: 'متوسط التقييم العام',
    heroStatSpeed: 'ثوانٍ لترك التقييم',
    heroStatConversion: 'نسبة التحويل إلى Google',

    nfcChipLabel: 'شريحة Digifeel NTAG الذكية',
    nfcScanTooltip: 'قرّب هاتفك للمسح الفوري',
    nfcInteractiveNotice: 'شريحة ذكية فورية • متوافقة مع iPhone و Android بدون تطبيق',

    howTitle: 'طريقة عمل فورية وبسيطة للغاية',
    howSubtitle: 'تقنية NFC فائقة السرعة تحول كل فاتورة إلى تقييم 5 نجوم على Google وإكرامية تشجيعية لفريقك.',
    step1Title: '1. مسح فوري',
    step1Desc: 'يقرب الزبون هاتفه الذكي من شريحة النادل أو حامل الطاولة QR. تفتح الصفحة فوراً بدون تحميل أي تطبيق.',
    step2Title: '2. التقييم والإكرامية',
    step2Desc: 'بلمستين فقط، يضع الزبون النجوم، يختار النادل، يترك تعليقاً لطيفاً ويضيف إكرامية بالبطاقة المصرفية.',
    step3Title: '3. التوجيه إلى Google Maps',
    step3Desc: 'يتم حفظ التقييم فوراً ويتم توجيه الزبون بضغطة زر لنشر تقييمه على Google لدعم ظهور مطعمك.',

    demoSectionTitle: 'جرّب المسح التفاعلي الآن',
    demoSectionSubtitle: 'اكتشف بالضبط ما يراه ويشعر به زبونك عند تقريب هاتفه من شريحة Digifeel.',
    demoBtnSimulateScan: 'محاكاة مسح NFC',
    demoScanSimulated: 'تم التقاط إشارة NFC — جاري تحميل الخدمة...',
    demoWaitersSelect: 'نادل الخدمة اليوم',
    demoRatingPrompt: 'كيف كانت تجربتك معنا ؟',
    demoTipPrompt: 'ترك إكرامية للنادل',
    demoSubmitReview: 'تأكيد تقييمي',
    demoSuccessTitle: 'شكراً جزيلاً لزيارتك !',
    demoSuccessSubtitle: 'تم تسجيل تقييمك بنجاح. شارك تجربتك على Google لدعم المطعم.',
    demoGoogleCta: 'نشر تقييمي على خرائط Google',
    demoGoogleSimulatedNotice: 'إعادة توجيه آمنة إلى صفحة Google الرسمية للمطعم.',
    demoReset: 'إعادة المحاكاة من جديد',

    pricingTitle: 'عرض واضح ومربح منذ أول أسبوع',
    pricingSubtitle: 'معدات فيزيائية متكاملة ومبرمجة وجاهزة للاستخدام فور الاستلام.',
    packTitle: 'باقة التثبيت المتكاملة',
    packPrice: '100 € / 15000 دج',
    packPriceSub: 'دفع لمرة واحدة • الشهر الأول مجاناً',
    packFeature1: 'حساب إدارة المطعم جاهز ومؤمّن بالكامل',
    packFeature2: 'شرائح NFC للنادلين + حوامل طاولات QR مبرمجة',
    packFeature3: 'ربط مباشر وموثق مع صفحة تقييمات Google Maps',
    packFeature4: 'اشتراك شهري كامل مجاني للشهر الأول',
    packFeature5: 'دعم فني مخصص وشحن سريع للمطعم',
    packCta: 'طلب باقتي الآن',
    subTitle: 'اشتراك الإدارة والتقارير المتقدمة',
    subPrice: '29 € / 4500 دج شهرياً',
    subPriceSub: 'بدون التزام • إلغاء في أي وقت بنقرة واحدة',
    subFeature1: 'تصدير غير محدود لتقارير PDF و Excel',
    subFeature2: 'لوحة متابعة أداء النادلين والإكراميات مباشرة',
    subFeature3: 'إحصائيات دقيقة وتوزيع عادل للإكراميات',
    subFeature4: 'مولد رموز QR ديناميكي للطاولات',

    activationTitle: 'تفعيل شريحة Digifeel الخاصة بك',
    activationSubtitle: 'هذه الشريحة جاهزة للربط بمطعمك. أدخل رمز التفعيل المرفق مع البطاقة.',
    activationCodeLabel: 'رمز التفعيل',
    activationCodePlaceholder: 'مثال: DF-8492-PARIS',
    restaurantNameLabel: 'اسم المطعم',
    googleReviewUrlLabel: 'رابط تقييمات Google Maps للمطعم',
    ownerEmailLabel: 'البريد الإلكتروني للإدارة',
    passwordLabel: 'كلمة مرور آمنة',
    targetTypeLabel: 'تعيين الشريحة إلى',
    targetServer: 'ربط بنادل محدد',
    targetTable: 'ربط بطاولة / حامل محدد',
    btnActivateChip: 'تفعيل الشريحة الآن',
    activationSuccess: 'تم تفعيل الشريحة بنجاح! يمكنك الآن تقديمها للزبائن للمسح.',

    ratingTitle: 'تقييم الخدمة والاستقبال',
    ratingSubtitle: '5 ثوانٍ فقط لمشاركتنا انطباعك',
    stars5: 'خدمة استثنائية ! ⭐⭐⭐⭐⭐',
    stars4: 'خدمة ممتازة ⭐⭐⭐⭐',
    stars3: 'جيد ومقبول ⭐⭐⭐',
    stars2: 'متوسط ⭐⭐',
    stars1: 'غير مرضي ⭐',
    complimentFast: 'خدمة سريعة ⚡',
    complimentFriendly: 'استقبال مبتسم وودود 😊',
    complimentDelicious: 'أطباق شهية ولذيذة 🍽️',
    complimentClean: 'نظافة وترتيب مثالي ✨',
    complimentAtmosphere: 'أجواء ممتعة 🎵',
    commentPlaceholder: 'كلمة لطيفة أو ملاحظة لفريق العمل ؟ (اختياري)',
    tipSelection: 'إضافة إكرامية للنادل',
    tipCustom: 'مبلغ مخصص',
    btnSubmitReview: 'إرسال تقييمي',
    thankYouTitle: 'شكراً جزيلاً لكم !',
    thankYouDesc: 'تم إيصال تقييمك وإكراميتك إلى فريق العمل بكل سرور.',
    btnLeaveGoogleReview: 'وضع تقييمي على خرائط Google ★★★★★',

    managerTitle: 'لوحة إدارة المطعم والقيادة',
    managerTabOverview: 'نظرة عامة',
    managerTabReviews: 'آراء الزبائن',
    managerTabServers: 'النادلين والفريق',
    managerTabSettings: 'الإعدادات والشرائح',
    managerTabExports: 'التصدير والمحاسبة',
    statsAverageRating: 'متوسط التقييم العام',
    statsScansToday: 'عمليات المسح المسجلة اليوم',
    statsTotalTips: 'إجمالي الإكراميات هذا الشهر',
    statsGoogleConversions: 'التحويلات إلى Google Maps',
    exportPdfBtn: 'تصدير التقرير الشامل PDF',
    exportExcelBtn: 'تصدير جدول البيانات Excel (CSV)',
    exportSubscriptionNotice: 'تقارير PDF و Excel الرسمية متاحة حصرياً مع الاشتراك الاحترافي.',
    btnUpgradeSubscription: 'تفعيل الاشتراك الاحترافي (29€ / 4500 دج)',

    superAdminTitle: 'بوابة المدير العام (Super Admin)',
    superAdminBatchTitle: 'توليد دفعات شرائح NFC الجديدة',
    btnGenerateBatch: 'توليد دفعة شرائح',
    batchGeneratedSuccess: 'تم توليد الدفعة بنجاح! جاهزة لبرمجة NTAG.',
    totalChipsRegistered: 'الشرائح المسجلة',
    totalRestaurants: 'المطاعم النشطة',

    footerTagline: 'تقنية NFC و QR في خدمة سمعة مطعمك وتحفيز فريق عملك.',
    footerRights: 'جميع الحقوق محفوظة. مصمم لتعزيز تقييماتك وتقدير جهود موظفيك.',
    whatsappContact: 'تواصل عبر واتساب'
  }
};
