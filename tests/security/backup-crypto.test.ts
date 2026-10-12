import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptBuffer, encryptBuffer } from '../../scripts/backup-crypto.mjs';

const key = randomBytes(32).toString('base64');

describe('chiffrement des sauvegardes', () => {
  it('aller-retour identique et le clair n\'apparaît pas dans le fichier', () => {
    const plain = Buffer.from('données restaurant secrètes');
    const blob = encryptBuffer(plain, key);
    expect(blob.includes(plain)).toBe(false);
    expect(decryptBuffer(blob, key).equals(plain)).toBe(true);
  });
  it('refuse une mauvaise clé et un fichier altéré', () => {
    const blob = encryptBuffer(Buffer.from('abc'), key);
    expect(() => decryptBuffer(blob, randomBytes(32).toString('base64'))).toThrow();
    blob[blob.length - 1] ^= 1;
    expect(() => decryptBuffer(blob, key)).toThrow();
  });
  it('refuse une clé de mauvaise taille', () => {
    expect(() => encryptBuffer(Buffer.from('x'), 'court')).toThrow(/32 octets/);
  });
});