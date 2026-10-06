import type { Metadata, Viewport } from 'next';
import React from 'react';
import Script from 'next/script';
import { LanguageProvider } from '@/src/components/next/LanguageProvider';
import { ThemeProvider } from '@/src/components/next/ThemeProvider';
import { AppChrome } from '@/src/components/next/AppChrome';
import { ServiceWorkerRegistration } from '@/src/components/next/ServiceWorkerRegistration';
import './globals.css';
import './polish.css';

export const metadata: Metadata = {
  title: {
    default: 'Digifeel POS — Caisse pour restaurant',
    template: '%s · Digifeel'
  },
  description: 'Caisse hors ligne et suivi des ventes en dinars algériens pour les restaurants.',
  applicationName: 'Digifeel POS',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg'
  },
  openGraph: {
    title: 'Digifeel POS — Caisse pour restaurant',
    description: 'Une caisse hors ligne, en dinars, pour les restaurants algériens.',
    type: 'website',
    locale: 'fr_FR'
  }
};

export const viewport: Viewport = {
  themeColor: '#080b0a',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="next-app">
        <Script id="digifeel-theme-init" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem('digifeel-theme')||'system';var d=t==='system'?matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light':t;document.documentElement.dataset.theme=d;document.documentElement.dataset.themePreference=t;document.documentElement.style.colorScheme=d}catch(e){document.documentElement.dataset.theme='dark'}})()`}</Script>
        <ThemeProvider>
          <LanguageProvider>
            <AppChrome>
              {children}
              <ServiceWorkerRegistration />
            </AppChrome>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
