export const NOT_AVAILABLE = 'Non disponible';
export const REPORT_TIMEZONE = 'Africa/Algiers';

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: REPORT_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });

export function dayKey(value: string | Date) {
  return dayFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

export function monthKeyOf(value: string | Date) {
  return dayKey(value).slice(0, 7);
}

export function groupDigits(value: number) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

export function formatInt(value: number) {
  return groupDigits(value);
}

export function formatDzd(value: number) {
  return `${groupDigits(value)} DZD`;
}

export function formatPercent(ratio: number, digits = 1) {
  if (!Number.isFinite(ratio)) return NOT_AVAILABLE;
  return `${(ratio * 100).toFixed(digits).replace('.', ',')} %`;
}

export function formatRating(value: number) {
  return Number.isFinite(value) ? value.toFixed(1).replace('.', ',') : NOT_AVAILABLE;
}

export function formatDay(key: string) {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

export function formatShortDay(key: string) {
  const [, month, day] = key.split('-');
  return `${day}/${month}`;
}

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso)).replace(/\u202f|\u00a0/g, ' ');
}

export function formatDayTime(iso: string) {
  return `${formatDay(dayKey(iso))} ${formatTime(iso)}`;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function formatMonth(key: string) {
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function fileSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant';
}

export const PAYMENT_LABELS: Record<string, string> = { cash: 'Espèces', card: 'Carte', baridimob: 'BaridiMob' };
