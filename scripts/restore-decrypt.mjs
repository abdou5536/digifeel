// Déchiffre une sauvegarde : node scripts/restore-decrypt.mjs <fichier.enc> <sortie>
// Env requis : BACKUP_ENCRYPTION_KEY. Ensuite : pg_restore --clean --if-exists -d <URL_TEST> <sortie>
import { readFileSync, writeFileSync } from 'node:fs';
import { decryptBuffer } from './backup-crypto.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output || !process.env.BACKUP_ENCRYPTION_KEY) {
  console.error('Usage : BACKUP_ENCRYPTION_KEY=... node scripts/restore-decrypt.mjs <fichier.enc> <sortie>');
  process.exit(2);
}
writeFileSync(output, decryptBuffer(readFileSync(input), process.env.BACKUP_ENCRYPTION_KEY));
console.log(`Déchiffré : ${output}`);