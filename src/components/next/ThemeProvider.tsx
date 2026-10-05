'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ThemeContextValue = { preference: ThemePreference; effectiveTheme: 'light' | 'dark'; setPreference: (preference: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(preference: ThemePreference) {
  const resolved = preference === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('digifeel-theme');
    const next: ThemePreference = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    setPreferenceState(next);
    setEffectiveTheme(applyTheme(next));
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if ((window.localStorage.getItem('digifeel-theme') ?? 'system') === 'system') setEffectiveTheme(applyTheme('system'));
    };
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    window.localStorage.setItem('digifeel-theme', next);
    setPreferenceState(next);
    setEffectiveTheme(applyTheme(next));
  }, []);
  const value = useMemo(() => ({ preference, effectiveTheme, setPreference }), [preference, effectiveTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme doit être utilisé dans ThemeProvider.');
  return value;
}
