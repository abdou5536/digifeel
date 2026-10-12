'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ThemeContextValue = { preference: ThemePreference; effectiveTheme: 'light' | 'dark'; setPreference: (preference: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(preference: ThemePreference): 'light' | 'dark' {
  const resolved = 'dark' as const;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    setPreferenceState('dark');
    setEffectiveTheme(applyTheme('dark'));
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
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
