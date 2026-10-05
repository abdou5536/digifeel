'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const choices = {
  fr: { light: 'Clair', dark: 'Sombre', system: 'Système', label: 'Apparence' },
  ar: { light: 'فاتح', dark: 'داكن', system: 'النظام', label: 'المظهر' },
  en: { light: 'Light', dark: 'Dark', system: 'System', label: 'Appearance' }
} as const;

export function ThemePicker({ locale = 'fr', compact = false }: { locale?: 'fr' | 'ar' | 'en'; compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const text = choices[locale];
  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;
  return <label className={`digifeel-theme-picker ${compact ? 'is-compact' : ''}`}>
    {!compact && <span>{text.label}</span>}
    <Icon aria-hidden="true" size={16} />
    <select aria-label={text.label} value={preference} onChange={event => setPreference(event.target.value as 'light' | 'dark' | 'system')}>
      <option value="light">{text.light}</option>
      <option value="dark">{text.dark}</option>
      <option value="system">{text.system}</option>
    </select>
  </label>;
}
