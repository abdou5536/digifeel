// Voix off FR masculine : node story/make-voice.mjs
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "output", "voice");
await mkdir(dir, { recursive: true });
const LINES = [
  "Gérer un restaurant, ça ne devrait jamais être compliqué.",
  "Une caisse rapide, pensée pour le rush. Chaque commande, chaque option, en quelques secondes.",
  "Un scan, et l'addition de la table apparaît. Sans papier. Sans erreur.",
  "Gérez vos serveurs, suivez vos avis, et gardez le contrôle de tout votre restaurant.",
  "Vos rapports du jour, de la semaine et du mois, prêts en un clic, en PDF et en Excel.",
  "Et il s'adapte à vous. Vos couleurs. Votre identité.",
  "Digifeel. Le logiciel qui fait tourner votre restaurant.",
];
const tts = new MsEdgeTTS();
await tts.setMetadata("fr-FR-HenriNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
for (let i = 0; i < LINES.length; i++) {
  const { audioFilePath } = await tts.toFile(dir, LINES[i], { rate: "-12%", pitch: "-4Hz" });
  const fs = await import("node:fs");
  fs.renameSync(audioFilePath, path.join(dir, `v${i + 1}.mp3`));
  console.log("ok", i + 1);
}
