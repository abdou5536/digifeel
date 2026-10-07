'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { ThemePicker } from './ThemePicker';

export function SiteHeader() {
  const { locale, toggleLocale, text } = useLanguage();

  return (
    <header className="product-topbar immersive-nav next-nav">
      <Link className="product-brand" href="/" aria-label="Digifeel, accueil">
        <img src="/icons/icon.svg" alt="" />
        DIGIFEEL
      </Link>
      <nav className="product-topbar__links" aria-label="Navigation principale">
        <Link href="/#logiciel">{text('navModules')}</Link>
        <Link href="/#fonctionnement">{text('navFlow')}</Link>
        <Link href="/#avis">{text('navReviews')}</Link>
        <Link href="/#serveurs">{text('navTeam')}</Link>
        <Link href="/#gestion">{text('navDashboard')}</Link>
        <Link href="/#tarifs">{text('navPricing')}</Link>
      </nav>
      <div className="next-nav__actions">
        <ThemePicker locale={locale} compact />
        <button className="next-language-toggle" type="button" onClick={toggleLocale} aria-label={text('language')}>
          {locale === 'fr' ? 'العربية' : locale === 'ar' ? 'EN' : 'FR'}
        </button>
        <Link className="product-button product-button--small" href="/login">{text('login')}</Link>
      </div>
    </header>
  );
}
