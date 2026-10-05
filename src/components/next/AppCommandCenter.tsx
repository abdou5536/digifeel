'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Command, HelpCircle, Search, X } from 'lucide-react';

const items = [
  { href: '/app', fr: 'Accueil', ar: 'الرئيسية', en: 'Overview', keywords: 'dashboard chiffres' },
  { href: '/app/analyse', fr: 'Analyse des avis', ar: 'تحليل التقييمات', en: 'Review analysis', keywords: 'avis évaluations' },
  { href: '/app/cuisine', fr: 'Écran cuisine', ar: 'المطبخ', en: 'Kitchen', keywords: 'commandes' },
  { href: '/app/fidelite', fr: 'Fidélité', ar: 'الولاء', en: 'Loyalty', keywords: 'points clients' },
  { href: '/app/pourboires', fr: 'Pourboires', ar: 'الإكراميات', en: 'Tips', keywords: 'pot commun' },
  { href: '/app/etablissements', fr: 'Établissements', ar: 'الفروع', en: 'Locations', keywords: 'restaurant groupes' },
  { href: '/app/journal', fr: 'Journal d’activité', ar: 'سجل النشاط', en: 'Activity log', keywords: 'historique' },
  { href: '/app/reglages', fr: 'Réglages', ar: 'الإعدادات', en: 'Settings', keywords: 'profil apparence langue sécurité' },
  { href: '/app/aide', fr: 'Aide et raccourcis', ar: 'المساعدة', en: 'Help and shortcuts', keywords: 'support visite guidée' },
  { href: '/admin', fr: 'Console super-admin', ar: 'إدارة النظام', en: 'Super admin', keywords: 'puces lots comptes' },
  { href: '/caisse', fr: 'Caisse POS', ar: 'نقطة البيع', en: 'POS', keywords: 'ventes' }
];

export function AppCommandCenter({ locale = 'fr' }: { locale?: 'fr' | 'ar' | 'en' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();
  const rtl = locale === 'ar';
  const enabled = pathname.startsWith('/app') || pathname.startsWith('/admin') || pathname.startsWith('/caisse') || pathname.startsWith('/cuisine');
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return items;
    return items.filter(item => `${item.fr} ${item.ar} ${item.en} ${item.keywords}`.toLocaleLowerCase().includes(value));
  }, [query]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(current => !current);
      } else if (event.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName ?? '')) {
        setOpen(true);
      } else if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  useEffect(() => { setOpen(false); setQuery(''); }, [pathname]);

  if (!enabled) return null;
  return <>
    {open && <div className="command-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title" dir={rtl ? 'rtl' : 'ltr'}>
        <h2 id="command-title" className="sr-only">{locale === 'ar' ? 'البحث والتنقل' : locale === 'en' ? 'Search and navigate' : 'Recherche et navigation'}</h2>
        <div className="command-search"><Search size={18} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={locale === 'ar' ? 'ابحث عن صفحة أو إجراء…' : locale === 'en' ? 'Search pages and actions…' : 'Rechercher une page ou une action…'} /><kbd>ESC</kbd><button type="button" aria-label="Fermer" onClick={() => setOpen(false)}><X size={17} /></button></div>
        <div className="command-list" role="listbox" aria-label={locale === 'ar' ? 'النتائج' : locale === 'en' ? 'Results' : 'Résultats'}>
          {filtered.map(item => <Link role="option" aria-selected={pathname === item.href} href={item.href} key={item.href}><span>{locale === 'ar' ? item.ar : locale === 'en' ? item.en : item.fr}</span><ArrowRight size={15} /></Link>)}
          {filtered.length === 0 && <p>{locale === 'ar' ? 'لا توجد نتائج.' : locale === 'en' ? 'No results found.' : 'Aucun résultat.'}</p>}
        </div>
        <footer><span><Command size={13} /> K</span><small>{locale === 'ar' ? 'للتنقل السريع' : locale === 'en' ? 'Quick navigation' : 'Navigation rapide'}</small><Link href="/app/aide"><HelpCircle size={14} />{locale === 'ar' ? 'المساعدة' : locale === 'en' ? 'Help' : 'Aide'}</Link></footer>
      </section>
    </div>}
    <button className="command-shortcut" type="button" aria-label={locale === 'ar' ? 'فتح البحث السريع' : locale === 'en' ? 'Open quick search' : 'Ouvrir la recherche rapide'} onClick={() => setOpen(true)}><Search size={15} /><span>{locale === 'ar' ? 'بحث' : locale === 'en' ? 'Search' : 'Rechercher'}</span><kbd>Ctrl K</kbd></button>
  </>;
}
