import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const MAGIC = Buffer.from('DGFB1');

function parseKey(keyB64) {
  const key = Buffer.from(keyB64 ?? '', 'base64');
  if (key.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY doit être 32 octets en base64 (openssl rand -base64 32)');
  return key;
}

/** AES-256-GCM : MAGIC | iv(12) | tag(16) | données chiffrées */
export function encryptBuffer(plain, keyB64) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', parseKey(keyB64), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), data]);
}

export function decryptBuffer(blob, keyB64) {
  if (!blob.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Fichier de sauvegarde invalide');
  const iv = blob.subarray(5, 17);
  const tag = blob.subarray(17, 33);
  const decipher = createDecipheriv('aes-256-gcm', parseKey(keyB64), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(33)), decipher.final()]);
}