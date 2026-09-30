import { MirrorThemeConfig, MirrorThemeId } from '../types';

export const ICE_GLASS_THEME: MirrorThemeConfig = {
  id: 'ice_glass',
  name: 'Effet Miroir de Glace & Verre Givré',
  tagline: 'Reflets cristal givré, transparence glaciale pure et éclat chrome liquide',
  emoji: '🧊',
  primaryColor: '#00f0ff',
  accentColor: '#e0f2fe',
  bgGlow: 'rgba(0, 240, 255, 0.22)',
  borderGlow: 'rgba(224, 242, 254, 0.65)',
  gradient: 'from-cyan-300 via-sky-200 to-white'
};

export const MIRROR_THEMES: Record<MirrorThemeId, MirrorThemeConfig> = {
  ice_glass: ICE_GLASS_THEME,
  specular_chrome: {
    id: 'specular_chrome',
    name: 'Miroir Chrome & Glace Argentée',
    tagline: 'Reflets chrome liquide ultra-purs, titane argenté et verre pur',
    emoji: '🪞',
    primaryColor: '#38bdf8',
    accentColor: '#e2e8f0',
    bgGlow: 'rgba(56, 189, 248, 0.22)',
    borderGlow: 'rgba(226, 232, 240, 0.55)',
    gradient: 'from-slate-100 via-sky-300 to-slate-300'
  },
  amber_gold: {
    id: 'amber_gold',
    name: 'Miroir Ambre & Or Impérial',
    tagline: 'Chaleur bistronomique noble, ambre étincelant et reflets d\'or',
    emoji: '🌟',
    primaryColor: '#f59e0b',
    accentColor: '#fbbf24',
    bgGlow: 'rgba(245, 158, 11, 0.18)',
    borderGlow: 'rgba(245, 158, 11, 0.45)',
    gradient: 'from-amber-400 via-amber-500 to-amber-600'
  },
  emerald_palace: {
    id: 'emerald_palace',
    name: 'Miroir Émeraude Palace & Laiton',
    tagline: 'Vert impérial précieux, reflets jade glacé et atmosphère palace 5★',
    emoji: '🌿',
    primaryColor: '#10b981',
    accentColor: '#34d399',
    bgGlow: 'rgba(16, 185, 129, 0.20)',
    borderGlow: 'rgba(16, 185, 129, 0.45)',
    gradient: 'from-emerald-400 via-emerald-500 to-teal-600'
  },
  sapphire_cobalt: {
    id: 'sapphire_cobalt',
    name: 'Miroir Saphir Royal & Cobalt',
    tagline: 'Bleu cobalt électrique, azur vibrant et esprit lounge moderne',
    emoji: '🌌',
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
    bgGlow: 'rgba(59, 130, 246, 0.22)',
    borderGlow: 'rgba(59, 130, 246, 0.50)',
    gradient: 'from-blue-400 via-blue-500 to-indigo-600'
  },
  ruby_velvet: {
    id: 'ruby_velvet',
    name: 'Miroir Rubis & Cristal Carmin',
    tagline: 'Bordeaux noble, carmin intense et esprit grands crus d\'exception',
    emoji: '🍷',
    primaryColor: '#f43f5e',
    accentColor: '#fb7185',
    bgGlow: 'rgba(244, 63, 94, 0.20)',
    borderGlow: 'rgba(244, 63, 94, 0.48)',
    gradient: 'from-rose-400 via-rose-500 to-red-600'
  },
  pure_gold: {
    id: 'pure_gold',
    name: 'Miroir Or 24K & Cristal Brillant',
    tagline: 'Or pur éclatant, cristal miroitant et finition joaillerie',
    emoji: '👑',
    primaryColor: '#eab308',
    accentColor: '#fde047',
    bgGlow: 'rgba(234, 179, 8, 0.25)',
    borderGlow: 'rgba(234, 179, 8, 0.60)',
    gradient: 'from-yellow-300 via-amber-400 to-yellow-500'
  }
};

export const applyMirrorThemeToDom = (themeId: MirrorThemeId = 'ice_glass', _isSpecularMode: boolean = true) => {
  if (typeof document === 'undefined') return;
  const theme = MIRROR_THEMES[themeId] || ICE_GLASS_THEME;
  const root = document.documentElement;

  root.setAttribute('data-mirror-theme', 'ice_glass');
  root.setAttribute('data-mirror-mode', 'ice_glass');

  root.style.setProperty('--mirror-primary', theme.primaryColor || '#00f0ff');
  root.style.setProperty('--mirror-accent', theme.accentColor || '#e0f2fe');
  root.style.setProperty('--mirror-glow', theme.bgGlow || 'rgba(0, 240, 255, 0.25)');
  root.style.setProperty('--mirror-border-glow', theme.borderGlow || 'rgba(224, 242, 254, 0.65)');
};
