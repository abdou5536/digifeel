// Pub 68 s (1080x1920) : node story/build-ad.mjs [--preview --t=1,5,...]
// Env : FFMPEG=chemin, CONTACT="Instagram : @toncompte"
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "output");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const FPS = 30, TOTAL = 68, DROP = 60;
await mkdir(out, { recursive: true });

// --- musique synthétisée (120 bpm, drop à 22 s) ---
function makeMusic() {
  const sr = 44100, n = sr * TOTAL, L = new Float32Array(n);
  const beat = 0.5;
  const add = (t0, len, fn) => { const s = Math.floor(t0 * sr); for (let i = 0; i < len * sr && s + i < n; i++) L[s + i] += fn(i / sr); };
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const kick = (t) => add(t, 0.4, (x) => Math.sin(2 * Math.PI * (45 * x + 110 * (1 - Math.exp(-x * 25)) / 25 * 25 * 0.04 + 50 * Math.exp(-x * 18) * x)) * Math.exp(-x * 9) * 0.9);
  const hat = (t, v = .12) => add(t, 0.05, (x) => noise() * Math.exp(-x * 90) * v);
  const clap = (t) => add(t, 0.2, (x) => noise() * Math.exp(-x * 22) * 0.3);
  const bass = (t, f, len, v) => add(t, len, (x) => (Math.sin(2 * Math.PI * f * x) + .4 * Math.sin(4 * Math.PI * f * x)) * Math.exp(-x * 3) * v);
  const notes = [55, 55, 65.4, 49];
  add(0, 2, (x) => Math.sin(2 * Math.PI * 55 * x) * 0.18 * Math.min(1, x));
  add(2.0, 1.2, (x) => Math.sin(2 * Math.PI * 40 * x) * Math.exp(-x * 3) * 0.9 + noise() * Math.exp(-x * 5) * .3);
  for (let b = 6; b < 60; b++) {
    const t = b * beat; if (t < 3 || t >= TOTAL - 0.6) continue;
    const drop = t >= DROP;
    if (t < DROP - 2.5 || drop) kick(t);
    if (drop || t >= 8) { hat(t + beat / 2, drop ? .16 : .1); }
    if ((drop || t >= 31) && b % 2 === 1) clap(t);
    if (t >= 8) bass(t, notes[Math.floor(b / 4) % 4] * (drop ? 1 : 2), beat * .9, drop ? .5 : .25);
    if (drop || t >= 45) hat(t + beat / 4, .06), hat(t + beat * .75, .06);
  }
  // riser 19.5 -> 22
  add(DROP - 2.5, 2.5, (x) => noise() * Math.pow(x / 2.5, 2) * 0.35);
  add(DROP, 1.2, (x) => Math.sin(2 * Math.PI * 38 * x) * Math.exp(-x * 2.2) * 1.0);
  add(TOTAL - 4, 2, (x) => Math.sin(2 * Math.PI * 45 * x) * Math.exp(-x * 2) * 0.9 + noise() * Math.exp(-x * 4) * .25);
  // --- bruitages synchronisés avec l'image ---
  const click = (t) => { add(t, 0.06, (x) => noise() * Math.exp(-x * 160) * 0.55); add(t, 0.08, (x) => Math.sin(2 * Math.PI * 1900 * x) * Math.exp(-x * 90) * 0.35); add(t + 0.035, 0.06, (x) => Math.sin(2 * Math.PI * 900 * x) * Math.exp(-x * 80) * 0.25); };
  const whoosh = (t) => { let lp = 0; add(t - 0.25, 0.6, (x) => { const u = x / 0.6, a = Math.sin(Math.PI * u) ** 2; const k = 0.05 + 0.5 * u; lp += k * (noise() - lp); return lp * a * 1.6; }); };
  const ding = (t, f = 1320) => add(t, 0.9, (x) => (Math.sin(2 * Math.PI * f * x) + 0.5 * Math.sin(2 * Math.PI * f * 1.5 * x)) * Math.exp(-x * 5) * 0.3);
  const tick = (t) => add(t, 0.04, (x) => Math.sin(2 * Math.PI * 1200 * x) * Math.exp(-x * 120) * 0.18);
  [9.0, 9.6, 10.0, 10.6, 11.1, 12.0, 17.55, 18.0].forEach(click);
  for (let i = 1; i <= 5; i++) click(31.5 + i * 2.2);
  [59.95, 60.0, 61.0, 62.0].forEach(click);
  [3, 8, 13, 17, 19, 31, 45, 59].forEach(whoosh);
  [23, 27].forEach(whoosh);
  ding(12.3, 1320); ding(12.45, 1760); ding(19.1, 1568);
  add(14.6, 0.25, (x) => Math.sin(2 * Math.PI * 2400 * x) * Math.exp(-x * 14) * 0.3);
  for (let i = 0; i < 12; i++) tick(45.6 + i * 0.55);
  for (let i = 0; i < 6; i++) tick(18.0 + i * 0.2);
  let max = 0; for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(L[i]));
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const fade = Math.min(1, (n - i) / (sr * 0.8)); buf.writeInt16LE(Math.round(Math.tanh(L[i] / max * 1.4) * 30000 * fade), 44 + i * 2); }
  return buf;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
if (process.env.CONTACT) await page.addInitScript((c) => { window.CONTACT = c; }, process.env.CONTACT);
const { readFile } = await import("node:fs/promises");
const xl = JSON.parse((await readFile(path.join(here, "assets", "doc", "xlsx.json"), "utf8")).replace(/^\uFEFF/, ""));
await page.addInitScript((d) => { window.XLDATA = d; }, xl);
await page.goto(pathToFileURL(path.join(here, "ad.html")).href);
await page.evaluate(() => window.ready);

if (process.argv.includes("--preview")) {
  const times = (process.argv.find((a) => a.startsWith("--t=")) || "--t=1,2.5,5,10,11.5,12.5,14,15.5,18.5,19.5,20.8,22.1,23.5,25,28").slice(4).split(",").map(Number);
  for (const t of times) {
    await page.evaluate((x) => window.render(x), t);
    await page.screenshot({ path: path.join(out, `ad-${String(t).replace(".", "_")}.jpg`), type: "jpeg", quality: 80 });
  }
  await browser.close();
  process.exit(0);
}

const wav = path.join(out, "ad-music.wav"), vid = path.join(out, "ad-video.mp4");
await writeFile(wav, makeMusic());
const proc = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", vid], { stdio: ["pipe", "ignore", "inherit"] });
for (let i = 0; i < FPS * TOTAL; i++) {
  await page.evaluate((x) => window.render(x), i / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once("drain", r));
}
proc.stdin.end();
await new Promise((r) => proc.on("close", r));
await browser.close();
spawnSync(ffmpeg, ["-y", "-i", vid, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", path.join(out, "digifeel-pub-complete.mp4")], { stdio: "inherit" });
console.log("OK");

