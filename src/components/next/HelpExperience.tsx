'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpenCheck, CircleHelp, Keyboard, LifeBuoy, Store, Utensils } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { ThemePicker } from './ThemePicker';

const content = {
  fr: {
    back: 'Espace restaurant', title: 'Centre d’aide', subtitle: 'Les repères essentiels pour gérer votre service.',
    tour: 'Visite guidée', tourText: 'Commencez par charger les données de démonstration pour parcourir les principaux écrans.',
    home: 'Accueil', room: 'Salle', kitchen: 'Cuisine', client: 'Page client',
    keyboard: 'Raccourcis clavier', command: 'Ouvrir la recherche et navigation', help: 'Afficher l’aide',
    faq: 'Questions fréquentes', q1: 'Comment rendre une addition visible au client ?', a1: 'Depuis Salle, ouvrez la table, ajoutez les articles puis utilisez « Envoyer l’addition au client ». Elle apparaîtra sur la page liée à la puce de la table.',
    q2: 'Les paiements sont-ils réellement encaissés ?', a2: 'Non. La démonstration enregistre des simulations. Les paiements carte et locaux ne sont pas transmis à un prestataire réel.',
    q3: 'Le ticket est-il un justificatif fiscal ?', a3: 'Non. Digifeel n’est pas un logiciel de caisse certifié NF525. Le ticket est un justificatif d’information uniquement.',
    support: 'Contacter le support', supportText: 'Décrivez le problème et indiquez la page concernée. Le support en ligne sera relié lors du déploiement.',
    guided: 'Ouvrir la visite guidée'
  },
  ar: {
    back: 'مساحة المطعم', title: 'مركز المساعدة', subtitle: 'إرشادات أساسية لإدارة الخدمة.',
    tour: 'جولة إرشادية', tourText: 'ابدأ بتحميل بيانات العرض لاستكشاف الصفحات الرئيسية.',
    home: 'الرئيسية', room: 'القاعة', kitchen: 'المطبخ', client: 'صفحة الزبون',
    keyboard: 'اختصارات لوحة المفاتيح', command: 'فتح البحث والتنقل', help: 'عرض المساعدة',
    faq: 'أسئلة شائعة', q1: 'كيف أُظهر الفاتورة للزبون؟', a1: 'من صفحة القاعة، افتح الطاولة وأضف المنتجات، ثم اختر إرسال الفاتورة للزبون. ستظهر عند مسح رمز الطاولة.',
    q2: 'هل يتم تحصيل المدفوعات فعلياً؟', a2: 'لا. النسخة التجريبية تسجل عمليات محاكاة فقط.',
    q3: 'هل الإيصال وثيقة ضريبية؟', a3: 'لا. Digifeel ليس برنامج صندوق معتمداً وفق NF525. الإيصال للمعلومات فقط.',
    support: 'التواصل مع الدعم', supportText: 'سيتم ربط الدعم عبر الإنترنت عند الإطلاق.',
    guided: 'بدء الجولة الإرشادية'
  },
  en: {
    back: 'Restaurant workspace', title: 'Help centre', subtitle: 'Practical guidance for your service.',
    tour: 'Product tour', tourText: 'Load demo data to explore the main workspace screens.',
    home: 'Home', room: 'Floor', kitchen: 'Kitchen', client: 'Guest page',
    keyboard: 'Keyboard shortcuts', command: 'Open search and navigation', help: 'Show help',
    faq: 'Frequently asked questions', q1: 'How do I show a bill to a guest?', a1: 'Open a table in Floor, add items, then choose Send bill to guest. It appears on the page linked to the table tag.',
    q2: 'Are payments really collected?', a2: 'No. The demo only records simulations. Card and local payments are not sent to a real provider.',
    q3: 'Is the receipt a fiscal document?', a3: 'No. Digifeel is not NF525-certified cash register software. The receipt is informational only.',
    support: 'Contact support', supportText: 'Online support will be connected at launch.',
    guided: 'Start the guided tour'
  }
};

export function HelpExperience() {
  const { locale } = useLanguage();
  const t = content[locale];
  return <main className="help-page" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="help-header"><Link href="/app"><ArrowLeft size={16} />{t.back}</Link><div><span>DIGIFEEL · SUPPORT</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><ThemePicker locale={locale} compact /></header>
    <div className="help-grid">
      <section className="help-card help-tour"><BookOpenCheck /><h2>{t.tour}</h2><p>{t.tourText}</p><Link href="/app?tour=1">{t.guided}</Link></section>
      <section className="help-card"><Keyboard /><h2>{t.keyboard}</h2><div className="help-shortcut"><span>{t.command}</span><kbd>Ctrl / ⌘ + K</kbd></div><div className="help-shortcut"><span>{t.help}</span><kbd>?</kbd></div></section>
      <section className="help-card help-links"><Store /><h2>{t.tour}</h2><Link href="/app">{t.home}</Link><Link href="/caisse">{t.room}</Link><Link href="/app/cuisine">{t.kitchen}</Link><Link href="/t/PALM-0001">{t.client}</Link></section>
      <section className="help-card help-faq"><CircleHelp /><h2>{t.faq}</h2><details><summary>{t.q1}</summary><p>{t.a1}</p></details><details><summary>{t.q2}</summary><p>{t.a2}</p></details><details><summary>{t.q3}</summary><p>{t.a3}</p></details></section>
      <section className="help-card"><LifeBuoy /><h2>{t.support}</h2><p>{t.supportText}</p></section>
    </div>
  </main>;
}
