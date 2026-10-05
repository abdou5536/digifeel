// Sauvegarde complète chiffrée : base PostgreSQL (pg_dump) + fichiers Supabase Storage (si présents).
// Usage : node scripts/backup.mjs
// Env requis : BACKUP_DB_URL (connexion directe Supabase), BACKUP_DIR (emplacement SÉPARÉ du projet),
//              BACKUP_ENCRYPTION_KEY (base64 32 octets). Optionnel : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Storage).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encryptBuffer } from './backup-crypto.mjs';

const { BACKUP_DB_URL, BACKUP_DIR, BACKUP_ENCRYPTION_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
for (const [k, v] of Object.entries({ BACKUP_DB_URL, BACKUP_DIR, BACKUP_ENCRYPTION_KEY })) {
  if (!v) { console.error(`Variable manquante : ${k}`); process.exit(2); }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(BACKUP_DIR, `digifeel-${stamp}`);
mkdirSync(outDir, { recursive: true });

const dump = spawnSync('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--schema=public', '--schema=auth', BACKUP_DB_URL], { maxBuffer: 1024 ** 3 });
if (dump.status !== 0) { console.error('pg_dump a échoué :', dump.stderr?.toString()); process.exit(1); }
writeFileSync(join(outDir, 'database.dump.enc'), encryptBuffer(dump.stdout, BACKUP_ENCRYPTION_KEY));

const manifest = { createdAt: new Date().toISOString(), dbBytes: dump.stdout.length, dbSha256: createHash('sha256').update(dump.stdout).digest('hex'), storage: [] };

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };
  const buckets = await (await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers })).json();
  for (const bucket of Array.isArray(buckets) ? buckets : []) {
    const list = await (await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket.name}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 1000 }) })).json();
    for (const obj of Array.isArray(list) ? list : []) {
      if (!obj.name || obj.id === null) continue;
      const file = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket.name}/${obj.name}`, { headers });
      if (!file.ok) continue;
      const name = `storage-${bucket.name}-${obj.name.replace(/[^\w.-]/g, '_')}.enc`;
      writeFileSync(join(outDir, name), encryptBuffer(Buffer.from(await file.arrayBuffer()), BACKUP_ENCRYPTION_KEY));
      manifest.storage.push(name);
    }
  }
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Sauvegarde chiffrée écrite dans ${outDir}`);