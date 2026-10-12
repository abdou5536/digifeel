'use client';

import type { ReactNode } from 'react';
import { AppCommandCenter } from './AppCommandCenter';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useLanguage } from './LanguageProvider';

export function AppChrome({ children }: { children: ReactNode }) {
  const { locale } = useLanguage();
  return <>{children}<ImpersonationBanner /><AppCommandCenter locale={locale} /></>;
}
