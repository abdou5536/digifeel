// Pub 45 s : node story/build-post.mjs [--preview --t=1,5,...]
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "output");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const FPS = 30, TOTAL = 22;
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript((c) => { window.NOFX = true; if (c) window.CONTACT = c; }, process.env.CONTACT || "");
const xl = JSON.parse((await readFile(path.join(here, "assets", "doc", "xlsx.json"), "utf8")).replace(/^\uFEFF/, ""));
await page.addInitScript((d) => { window.XLDATA = d; }, xl);
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(pathToFileURL(path.join(here, "post.html")).href);
await page.evaluate(() => window.ready);
const SEGS = await page.evaluate(() => window.SEGS);
const TR = await page.evaluate(() => window.TR);

const tOfV = (V) => {
  for (const s of SEGS) if (s.kn) for (let i = 0; i < s.kn.length - 1; i++) {
    const [t0, v0] = s.kn[i], [t1, v1] = s.kn[i + 1];
    if (V >= v0 && V <= v1) return t0 + (t1 - t0) * (V - v0) / (v1 - v0);
  }
  return 0;
};

async function snapshots() {
  for (const T of TR) {
    await page.evaluate((x) => window.render(x), T.t - 1 / 30);
    const b = await page.screenshot({ type: "jpeg", quality: 90 });
    await page.evaluate(([k, d]) => { window.SNAP[k] = d; }, [T.t, "data:image/jpeg;base64," + b.toString("base64")]);
  }
}
await snapshots();

function makeMusic() {
  const sr = 44100, n = sr * TOTAL, L = new Float32Array(n);
  const beat = 0.5;
  const add = (t0, len, fn) => { const s = Math.floor(t0 * sr); for (let i = 0; i < len * sr && s + i < n; i++) L[s + i] += fn(i / sr); };
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const kick = (t, v = .9) => add(t, 0.4, (x) => Math.sin(2 * Math.PI * (45 * x + 50 * Math.exp(-x * 18) * x)) * Math.exp(-x * 9) * v);
  const hat = (t, v = .1) => add(t, 0.05, (x) => noise() * Math.exp(-x * 90) * v);
  const clap = (t) => add(t, 0.2, (x) => noise() * Math.exp(-x * 22) * 0.3);
  const bass = (t, f, len, v) => add(t, len, (x) => (Math.sin(2 * Math.PI * f * x) + .4 * Math.sin(4 * Math.PI * f * x)) * Math.exp(-x * 3) * v);
  const boom = (t, v = 1) => add(t, 1.6, (x) => Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-x * 6)) * x) * Math.exp(-x * 2.2) * v + noise() * Math.exp(-x * 6) * .3 * v);
  const riser = (t, len, v = .35) => add(t, len, (x) => noise() * Math.pow(x / len, 2) * v + Math.sin(2 * Math.PI * (200 + 1400 * (x / len) ** 2) * x) * (x / len) * .08);
  const click = (t) => { add(t, 0.06, (x) => noise() * Math.exp(-x * 160) * 0.55); add(t, 0.08, (x) => Math.sin(2 * Math.PI * 1900 * x) * Math.exp(-x * 90) * 0.35); add(t + 0.035, 0.06, (x) => Math.sin(2 * Math.PI * 900 * x) * Math.exp(-x * 80) * 0.25); };
  const whoosh = (t, len = .7) => { let lp = 0; add(t - len * .4, len, (x) => { const u = x / len, a = Math.sin(Math.PI * u) ** 2; lp += (0.05 + 0.5 * u) * (noise() - lp); return lp * a * 1.7; }); };
  const ding = (t, f = 1320) => add(t, 0.9, (x) => (Math.sin(2 * Math.PI * f * x) + 0.5 * Math.sin(2 * Math.PI * f * 1.5 * x)) * Math.exp(-x * 5) * 0.3);
  const tick = (t) => add(t, 0.04, (x) => Math.sin(2 * Math.PI * 1200 * x) * Math.exp(-x * 120) * 0.18);
  const pop = (t) => add(t, 0.15, (x) => Math.sin(2 * Math.PI * (500 + 700 * x * 6) * x) * Math.exp(-x * 30) * 0.3);
  const glass = (t) => { add(t, 0.9, (x) => noise() * Math.exp(-x * 7) * .7); for (let k = 0; k < 14; k++) add(t + k * .035, .25, (x) => Math.sin(2 * Math.PI * (2500 + k * 420) * x) * Math.exp(-x * 25) * .25); };
  const notes = [55, 55, 65.4, 49];
  const arp = [220, 261.6, 329.6, 392];

  add(0, 2.4, (x) => Math.sin(2 * Math.PI * 55 * x) * 0.1 * Math.min(1, x));
  riser(0.6, 0.9, .25);
  ding(1.5, 1320); ding(1.62, 1760);
  add(1.5, 0.25, (x) => Math.sin(2 * Math.PI * 2400 * x) * Math.exp(-x * 14) * 0.3);
  boom(2.55, 1.1);
  riser(3.0, 1.0, .3);

  for (let b = 8; b < 44; b++) {
    const t = b * beat;
    if (t >= 21.5) continue;
    const peak = t >= 8 && t < 12.5;
    kick(t, peak ? 1 : .8);
    hat(t + beat / 2, .12);
    if (b % 2 === 1 && t >= 8) clap(t);
    bass(t, notes[Math.floor(b / 4) % 4] * (peak ? 1 : 2), beat * .9, peak ? .5 : .3);
    if (t >= 12.5) { hat(t + beat / 4, .06); add(t, beat * .5, (x) => Math.sin(2 * Math.PI * arp[b % 4] * x) * Math.exp(-x * 8) * .12); }
  }
  for (let t = 4; t < 8; t += beat) if (Math.floor(t / beat) % 2 === 0) kick(t, .55);
  riser(6.6, 1.4, .35); boom(8, .9);
  [9.5, 10.7, 11.9].forEach((t) => { boom(t, .8); riser(t - .8, .8, .2); });
  riser(16.6, 1.4, .3);
  boom(18, 1.2);
  add(18, 4, (x) => (Math.sin(2 * Math.PI * 220 * x) + Math.sin(2 * Math.PI * 329.6 * x) + Math.sin(2 * Math.PI * 440 * x)) * .07 * Math.exp(-x * .5));

  TR.forEach((T) => whoosh(T.t, ["zoom", "liquid"].includes(T.type) ? 1 : .7));
  const clicks = [9.0, 9.6, 10.0, 10.6, 11.1, 12.0, 62, 63, 64, 33.5, 35.7];
  clicks.forEach((V) => { const tt = tOfV(V); if (tt > 0) click(tt); });
  const tp = tOfV(12.0); ding(tp, 1100); ding(tp + .3, 1320); ding(tp + .45, 1760);
  [13.1, 16.2].forEach(pop);
  [4.5, 8.4, 13, 15.9].forEach((t) => add(t, 0.3, (x) => Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-x * 20)) * x) * Math.exp(-x * 10) * .7));
  let max = 0; for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(L[i]));
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const fade = Math.min(1, (n - i) / (sr * 0.8)); buf.writeInt16LE(Math.round(Math.tanh(L[i] / max * 1.4) * 30000 * fade), 44 + i * 2); }
  return buf;
}

const frame = (t) => page.evaluate((x) => window.render(x), t);

if (process.argv.includes("--preview")) {
  const times = (process.argv.find((a) => a.startsWith("--t=")) || "--t=1,2.7,3.5").slice(4).split(",").map(Number);
  for (const t of times) {
    await frame(t);
    await page.screenshot({ path: path.join(out, `post-${String(t).replace(".", "_")}.jpg`), type: "jpeg", quality: 80 });
  }
  await browser.close();
  process.exit(0);
}

const wav = path.join(out, "post-music.wav"), vid = path.join(out, "post-video.mp4");
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
spawnSync(ffmpeg, ["-y", "-i", vid, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", path.join(out, "digifeel-publication-pro.mp4")], { stdio: "inherit" });
console.log("OK");
