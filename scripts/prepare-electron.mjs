import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appUrl = process.env.DIGIFEEL_APP_URL;

if (!appUrl) {
  throw new Error('Définissez DIGIFEEL_APP_URL (URL HTTPS du site Digifeel) avant de construire l’installateur.');
}

let parsedUrl;
try {
  parsedUrl = new URL(appUrl);
} catch {
  throw new Error('DIGIFEEL_APP_URL doit être une URL HTTPS valide.');
}

if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
  throw new Error('DIGIFEEL_APP_URL doit utiliser HTTPS et ne contenir aucun identifiant.');
}

const electronDirectory = path.join(projectRoot, 'electron');
const buildDirectory = path.join(projectRoot, 'build');
await fs.mkdir(buildDirectory, { recursive: true });
await fs.writeFile(
  path.join(electronDirectory, 'app-config.json'),
  `${JSON.stringify({ appUrl: parsedUrl.href }, null, 2)}\n`,
  'utf8'
);

const icon = await pngToIco(path.join(projectRoot, 'public', 'icons', 'icon-512.png'));
await fs.writeFile(path.join(buildDirectory, 'icon.ico'), icon);
