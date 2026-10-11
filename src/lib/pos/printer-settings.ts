export type PaperWidth = '58' | '80' | 'a4';

export const PAPER_OPTIONS: Array<{ value: PaperWidth; label: string }> = [
  { value: '80', label: 'Ticket thermique 80 mm' },
  { value: '58', label: 'Ticket thermique 58 mm' },
  { value: 'a4', label: 'Feuille A4 / PDF' }
];

const STORAGE_KEY = 'digifeel-printer-paper';

export function readPaperWidth(): PaperWidth {
  if (typeof window === 'undefined') return '80';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === '58' || stored === '80' || stored === 'a4' ? stored : '80';
  } catch {
    return '80';
  }
}

export function savePaperWidth(value: PaperWidth): void {
  try { window.localStorage.setItem(STORAGE_KEY, value); } catch { /* stockage indisponible */ }
}

export function paperCss(width: PaperWidth): string {
  if (width === 'a4') return '@page{size:A4;margin:15mm}body{max-width:170mm;margin:0}';
  return `@page{size:${width}mm auto;margin:3mm}body{width:${width === '58' ? 48 : 72}mm;margin:0}`;
}
