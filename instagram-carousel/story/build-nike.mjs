// Pub style Nike/Adidas 46 s : node story/build-nike.mjs [--preview --t=1,5,...]
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "output");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const FPS = 30, TOTAL = 46;
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript((c) => { window.NOFX = true; if (c) window.CONTACT = c; }, process.env.CONTACT || "");
const xl = JSON.parse((await readFile(path.join(here, "assets", "doc", "xlsx.json"), "utf8")).replace(/^\uFEFF/, ""));
await page.addInitScript((d) => { window.XLDATA = d; }, xl);
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(pathToFileURL(path.join(here, "nike.html")).href);
await page.evaluate(() => window.ready);
const NS = await page.evaluate(() => window.NS);

const tOfV = (V) => { for (const s of NS) if (V >= s.V[0] && V <= s.V[1]) return s.a + (s.b - s.a) * (V - s.V[0]) / (s.V[1] - s.V[0]); return 0; };

function makeMusic() {
  const sr = 44100, n = sr * TOTAL, L = new Float32Array(n);
  const beat = 0.5;
  const add = (t0, len, fn) => { const s = Math.floor(t0 * sr); for (let i = 0; i < len * sr && s + i < n; i++) L[s + i] += fn(i / sr); };
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const kick = (t, v = .9) => add(t, 0.4, (x) => Math.sin(2 * Math.PI * (45 * x + 50 * Math.exp(-x * 18) * x)) * Math.exp(-x * 9) * v);
  const hat = (t, v = .1) => add(t, 0.05, (x) => noise() * Math.exp(-x * 90) * v);
  const clap = (t) => add(t, 0.2, (x) => noise() * Math.exp(-x * 22) * 0.35);
  const bass = (t, f, len, v) => add(t, len, (x) => (Math.sin(2 * Math.PI * f * x) + .4 * Math.sin(4 * Math.PI * f * x)) * Math.exp(-x * 3) * v);
  const boom = (t, v = 1) => add(t, 1.4, (x) => Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-x * 6)) * x) * Math.exp(-x * 2.4) * v + noise() * Math.exp(-x * 7) * .3 * v);
  const hit = (t, f = 90) => { add(t, .35, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 12) * .9 + noise() * Math.exp(-x * 40) * .5); };
  const riser = (t, len, v = .35) => add(t, len, (x) => noise() * Math.pow(x / len, 2) * v + Math.sin(2 * Math.PI * (200 + 1400 * (x / len) ** 2) * x) * (x / len) * .08);
  const click = (t) => { add(t, 0.06, (x) => noise() * Math.exp(-x * 160) * 0.55); add(t, 0.08, (x) => Math.sin(2 * Math.PI * 1900 * x) * Math.exp(-x * 90) * 0.35); add(t + 0.035, 0.06, (x) => Math.sin(2 * Math.PI * 900 * x) * Math.exp(-x * 80) * 0.25); };
  const whoosh = (t, len = .5) => { let lp = 0; add(t - len * .8, len, (x) => { const u = x / len, a = u * u; lp += (0.05 + 0.5 * u) * (noise() - lp); return lp * a * 1.7; }); };
  const ding = (t, f = 1320) => add(t, 0.9, (x) => (Math.sin(2 * Math.PI * f * x) + 0.5 * Math.sin(2 * Math.PI * f * 1.5 * x)) * Math.exp(-x * 5) * 0.3);
  const tick = (t) => add(t, 0.04, (x) => Math.sin(2 * Math.PI * 1200 * x) * Math.exp(-x * 120) * 0.18);
  const glitch = (t) => add(t, 0.3, (x) => (Math.floor(x * 60) % 2 ? 1 : -1) * (noise() > 0 ? 1 : .3) * Math.exp(-x * 7) * .25);
  const notes = [55, 55, 65.4, 49], arp = [220, 261.6, 329.6, 392];

  // intro : mots frappés sur le temps
  [.5, 1, 2, 2.5].forEach((t) => hit(t, 80));
  riser(1.0, 2.5, .25);
  boom(3.5, 1.1);
  for (let t = 3.5; t < 5; t += beat) kick(t, .5);
  for (let b = 10; b < 92; b++) {
    const t = b * beat;
    if (t < 5 || t >= 45) continue;
    const drop = t >= 37 && t < 41;
    kick(t, drop ? 1 : .9);
    hat(t + beat / 2, .12);
    if (b % 2 === 1) clap(t);
    bass(t, notes[Math.floor(b / 4) % 4] * (t >= 15 ? 1 : 2), beat * .9, .32);
    if (t >= 10) { hat(t + beat / 4, .06); hat(t + beat * .75, .06); }
    if (t >= 15) add(t, beat * .5, (x) => Math.sin(2 * Math.PI * arp[b % 4] * x) * Math.exp(-x * 8) * .12);
    if (t >= 23) add(t, beat, (x) => Math.sin(2 * Math.PI * notes[Math.floor(b / 4) % 4] * 4 * x) * .05 * Math.exp(-x * 2));
  }
  riser(33.5, 2.5, .4);
  [37, 38, 39].forEach((t) => { boom(t, .9); glitch(t); });
  riser(39.5, 1.5, .3);
  boom(41, 1.2); add(41, 5, (x) => (Math.sin(2 * Math.PI * 220 * x) + Math.sin(2 * Math.PI * 329.6 * x) + Math.sin(2 * Math.PI * 440 * x)) * .07 * Math.exp(-x * .5));
  // coupures à chaque plan
  NS.forEach((s) => { whoosh(s.a, .5); hit(s.a, 70); });
  [9.0, 9.6, 10.0, 10.6, 11.1, 12.0, 17.55, 18.0, 20.6].forEach((V) => click(tOfV(V)));
  [0, 1, 2, 3, 4, 5].forEach((i) => click(tOfV(33.5 + 2.2 * i)));
  const tp = tOfV(12.0); ding(tp, 1100); ding(tp + .3, 1320); ding(tp + .45, 1760);
  add(tOfV(14.6), 0.25, (x) => Math.sin(2 * Math.PI * 2400 * x) * Math.exp(-x * 14) * 0.3);
  for (let i = 0; i < 6; i++) tick(tOfV(18.0 + i * .2));
  let max = 0; for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(L[i]));
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const fade = Math.min(1, (n - i) / (sr * 0.8)); buf.writeInt16LE(Math.round(Math.tanh(L[i] / max * 1.4) * 30000 * fade), 44 + i * 2); }
  return buf;
}

const frame = (t) => page.evaluate((x) => window.render(x), t);

if (process.argv.includes("--preview")) {
  const times = (process.argv.find((a) => a.startsWith("--t=")) || "--t=.7,1.3,2.2,3,3.6,4.5,5.1,7,10.1,12,15.1,17,19.1,21,23.2,26,29.2,33,36.2,37.2,38.2,41.3,44").slice(4).split(",").map(Number);
  for (const t of times) {
    await frame(t);
    await page.screenshot({ path: path.join(out, `nike-${String(t).replace(".", "_")}.jpg`), type: "jpeg", quality: 80 });
  }
  await browser.close();
  process.exit(0);
}

const wav = path.join(out, "nike-music.wav"), vid = path.join(out, "nike-video.mp4");
await writeFile(wav, makeMusic());
const proc = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", vid], { stdio: ["pipe", "ignore", "inherit"] });
for (let i = 0; i < FPS * TOTAL; i++) {
  await frame(i / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once("drain", r));
}
proc.stdin.end();
await new Promise((r) => proc.on("close", r));
await browser.close();
spawnSync(ffmpeg, ["-y", "-i", vid, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", path.join(out, "digifeel-nike-46s.mp4")], { stdio: "inherit" });
console.log("OK");
