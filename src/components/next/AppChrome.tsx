'use client';

import type { ReactNode } from 'react';
import { AppCommandCenter } from './AppCommandCenter';
import { useLanguage } from './LanguageProvider';

export function AppChrome({ children }: { children: ReactNode }) {
  const { locale } = useLanguage();
  return <>{children}<AppCommandCenter locale={locale} /></>;
}
