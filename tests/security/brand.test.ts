import { describe, expect, it } from 'vitest';
import { BRAND_PALETTE, HEX_COLOR, brandForegroundColor } from '../../src/lib/brand';

function luminance(hex: string) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('palette de marque de la caisse', () => {
  it('propose des couleurs hexadécimales valides et sans doublons', () => {
    expect(BRAND_PALETTE.length).toBeGreaterThanOrEqual(5);
    expect(new Set(BRAND_PALETTE.map(color => color.hex)).size).toBe(BRAND_PALETTE.length);
    for (const color of BRAND_PALETTE) expect(HEX_COLOR.test(color.hex)).toBe(true);
  });

  it('choisit un texte contrasté pour la couleur personnalisée ou prédéfinie', () => {
    for (const hex of [...BRAND_PALETTE.map(color => color.hex), '#000000', '#ffffff']) {
      const foreground = brandForegroundColor(hex);
      expect(['#ffffff', '#14100a']).toContain(foreground);
      expect(contrastRatio(hex, foreground)).toBeGreaterThanOrEqual(3);
    }
  });
});
