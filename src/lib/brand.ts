const ACCENT_VARS = [
  '--df-accent',
  '--df-accent-strong',
  '--df-accent-foreground',
  '--workspace-gold'
] as const;

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const BRAND_PALETTE = [
  { name: 'Or', hex: '#d3a04d' },
  { name: 'Ambre', hex: '#e0952b' },
  { name: 'Corail', hex: '#d9755b' },
  { name: 'Rouge', hex: '#d64545' },
  { name: 'Framboise', hex: '#d46b91' },
  { name: 'Rose', hex: '#e0629f' },
  { name: 'Violet', hex: '#8974d6' },
  { name: 'Indigo', hex: '#5b6bd6' },
  { name: 'Bleu', hex: '#4f88d9' },
  { name: 'Ciel', hex: '#38a8d8' },
  { name: 'Turquoise', hex: '#2bb3b1' },
  { name: 'Émeraude', hex: '#2fa38a' },
  { name: 'Vert', hex: '#5aa845' },
  { name: 'Olive', hex: '#9a9a3a' },
  { name: 'Ardoise', hex: '#6b7a90' },
  { name: 'Cacao', hex: '#a2724f' }
] as const;

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)) as Rgb;
}

function relativeLuminance(hex: string) {
  const [r, g, b] = toRgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(first: number, second: number) {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function brandForegroundColor(hex: string) {
  const luminance = relativeLuminance(hex);
  const whiteContrast = contrastRatio(1, luminance);
  const darkContrast = contrastRatio(relativeLuminance('#14100a'), luminance);
  return whiteContrast >= darkContrast ? '#ffffff' : '#14100a';
}

function toHex(rgb: Rgb) {
  return `#${rgb.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, target: number, amount: number) {
  return toHex(toRgb(hex).map(channel => channel + (target - channel) * amount) as Rgb);
}

/** Ajuste la couleur pour rester lisible : plus sombre sur fond clair, plus lumineuse sur fond sombre. */
export function accentForTheme(hex: string, theme: 'light' | 'dark') {
  const background = theme === 'light' ? 1 : relativeLuminance('#14100a');
  let accent = hex;
  for (let step = 0; step < 12 && contrastRatio(Math.max(relativeLuminance(accent), background), Math.min(relativeLuminance(accent), background)) < 3; step += 1) {
    accent = mix(accent, theme === 'light' ? 0 : 255, 0.12);
  }
  return accent;
}

let currentBrand: string | null = null;
let themeObserver: MutationObserver | null = null;

function paintBrand(hex: string) {
  const root = document.documentElement;
  const theme = root.dataset.theme === 'light' ? 'light' : 'dark';
  const accent = accentForTheme(hex, theme);
  root.style.setProperty('--df-accent', accent);
  root.style.setProperty('--df-accent-strong', mix(accent, theme === 'light' ? 0 : 255, 0.25));
  root.style.setProperty('--df-accent-foreground', brandForegroundColor(accent));
  root.style.setProperty('--workspace-gold', accent);
}

/** Applique la couleur du restaurant aux accents de l'interface ; sans valeur, le thème par défaut revient. */
export function applyBrandColor(hex: string | null | undefined) {
  const root = document.documentElement;
  if (!hex || !HEX_COLOR.test(hex)) {
    currentBrand = null;
    themeObserver?.disconnect();
    themeObserver = null;
    for (const name of ACCENT_VARS) root.style.removeProperty(name);
    return;
  }
  currentBrand = hex;
  paintBrand(hex);
  if (!themeObserver) {
    themeObserver = new MutationObserver(() => { if (currentBrand) paintBrand(currentBrand); });
    themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
}

/** Couleur vive la plus présente d'une photo ou d'un logo, pour proposer une couleur de marque. */
export async function dominantColor(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const { data } = context.getImageData(0, 0, size, size);
  const buckets = new Map<string, { score: number; count: number; r: number; g: number; b: number }>();
  for (let index = 0; index < data.length; index += 4) {
    const [r, g, b, a] = [data[index], data[index + 1], data[index + 2], data[index + 3]];
    const max = Math.max(r, g, b);
    const saturation = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    if (a < 200 || saturation < 0.25 || max < 70 || max > 245) continue;
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const bucket = buckets.get(key) ?? { score: 0, count: 0, r: 0, g: 0, b: 0 };
    bucket.score += saturation;
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  let best: { score: number; count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) if (!best || bucket.score > best.score) best = bucket;
  return best ? toHex([best.r / best.count, best.g / best.count, best.b / best.count]) : null;
}
