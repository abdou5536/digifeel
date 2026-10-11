const ACCENT_VARS = ['--df-accent', '--df-accent-strong', '--workspace-gold'] as const;

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)) as Rgb;
}

function toHex(rgb: Rgb) {
  return `#${rgb.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

/** Applique la couleur du restaurant aux accents de l'interface ; sans valeur, le thème par défaut revient. */
export function applyBrandColor(hex: string | null | undefined) {
  const root = document.documentElement;
  if (!hex || !HEX_COLOR.test(hex)) {
    for (const name of ACCENT_VARS) root.style.removeProperty(name);
    return;
  }
  root.style.setProperty('--df-accent', hex);
  root.style.setProperty('--df-accent-strong', toHex(toRgb(hex).map(channel => channel * 0.72) as Rgb));
  root.style.setProperty('--workspace-gold', hex);
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
