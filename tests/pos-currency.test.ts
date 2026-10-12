import { describe, expect, it } from 'vitest';
import { formatMoney, minorToInput, parseMoneyInput } from '@/src/lib/pos/currency';

describe('devise de la caisse', () => {
  it('convertit les saisies en euros en centimes', () => {
    expect(parseMoneyInput('12,50', 'EUR')).toBe(1250);
    expect(parseMoneyInput('3', 'EUR')).toBe(300);
    expect(parseMoneyInput('0.1', 'EUR')).toBe(10);
  });

  it('garde les dinars entiers', () => {
    expect(parseMoneyInput('450', 'DZD')).toBe(450);
  });

  it('refuse les saisies invalides', () => {
    expect(parseMoneyInput('', 'EUR')).toBeNull();
    expect(parseMoneyInput('-5', 'EUR')).toBeNull();
    expect(parseMoneyInput('abc', 'DZD')).toBeNull();
  });

  it('reformate pour la saisie et l’affichage', () => {
    expect(minorToInput(1250, 'EUR')).toBe('12.50');
    expect(minorToInput(450, 'DZD')).toBe('450');
    expect(formatMoney(1250, 'EUR', 'fr')).toContain('12,50');
    expect(formatMoney(450, 'DZD', 'fr')).toContain('دج');
  });
});
