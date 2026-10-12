'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { messages, type Locale } from '@/src/lib/i18n/messages';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  text: (key: keyof typeof messages.fr) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('fr');

  useEffect(() => {
    const savedLocale = window.localStorage.getItem('digifeel-app-locale') ?? window.localStorage.getItem('digifeel-locale');
    if (savedLocale === 'ar' || savedLocale === 'fr' || savedLocale === 'en') setLocale(savedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.locale = locale;
    window.localStorage.setItem('digifeel-locale', locale);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(current => current === 'fr' ? 'ar' : current === 'ar' ? 'en' : 'fr'),
    text: key => messages[locale][key]
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage doit être utilisé dans LanguageProvider.');
  return context;
}
