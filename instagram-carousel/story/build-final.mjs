// Spot 60 s sans voix, sound design stéréo : node story/build-final.mjs [--preview --t=...]
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "output");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const FPS = 30, TOTAL = 60;
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript((c) => { window.NOFX = true; if (c) window.CONTACT = c; }, process.env.CONTACT || "");
const xl = JSON.parse((await readFile(path.join(here, "assets", "doc", "xlsx.json"), "utf8")).replace(/^\uFEFF/, ""));
await page.addInitScript((d) => { window.XLDATA = d; }, xl);
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(pathToFileURL(path.join(here, "spot.html")).href);
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
  const sr = 44100, n = sr * TOTAL, beat = 0.5, TAU = 2 * Math.PI;
  const bus = () => ({ L: new Float32Array(n), R: new Float32Array(n) });
  const D = bus(), M = bus(), F = bus();
  const add = (B, t0, len, fn, pan = 0) => {
    const s = Math.floor(t0 * sr), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < len * sr && s + i >= 0 && s + i < n; i++) { const v = fn(i / sr); B.L[s + i] += v * gl; B.R[s + i] += v * gr; }
  };
  let seed = 11; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const kicks = [];
  const kick = (t, v = .9) => { kicks.push(t); add(D, t, 0.45, (x) => Math.sin(TAU * (48 * x + 55 * (1 - Math.exp(-x * 25)) / 25 * 1)) * Math.exp(-x * 8) * v + noise() * Math.exp(-x * 120) * .08 * v); };
  const hat = (t, v = .1, pan = .3) => add(D, t, 0.06, (x) => noise() * Math.exp(-x * 80) * v, pan);
  const clap = (t) => { for (let k = 0; k < 3; k++) add(D, t + k * .011, .12, (x) => noise() * Math.exp(-x * 40) * .13); add(D, t + .035, .25, (x) => noise() * Math.exp(-x * 14) * .16); };
  const sub = (t, f, len, v) => add(M, t, len, (x) => (Math.sin(TAU * f * x) + .25 * Math.sin(TAU * f * 2 * x)) * Math.min(1, x * 80) * Math.exp(-x * 1.6) * v);
  const padNote = (t, f, len, v, pan) => { let lp = 0; add(M, t, len, (x) => { const a = Math.min(1, x / .35) * Math.min(1, (len - x) / .5); let s = 0; for (const d of [-.006, 0, .006]) { const ph = (f * (1 + d) * x) % 1; s += 2 * ph - 1; } lp += .07 * (s / 3 - lp); return lp * a * v; }, pan); };
  const pluck = (t, f, v, pan) => add(M, t, .35, (x) => (Math.sin(TAU * f * x) + .3 * Math.sin(TAU * f * 2 * x)) * Math.exp(-x * 9) * v, pan);
  const boom = (t, v = 1) => { add(F, t, 2.2, (x) => Math.sin(TAU * (34 + 46 * Math.exp(-x * 7)) * x) * Math.exp(-x * 1.9) * v); add(F, t, .5, (x) => noise() * Math.exp(-x * 9) * .35 * v); };
  const riser = (t, len, v = .3) => { let lp = 0; add(F, t, len, (x) => { const u = x / len; lp += (.02 + .6 * u * u) * (noise() - lp); return lp * u * u * v * 2.4 + Math.sin(TAU * (180 + 1800 * u * u) * x) * u * .05 * v; }, 0); };
  const whoosh = (t, len = 1) => { let lp = 0; for (const [ch, ph] of [["L", 0], ["R", 1]]) { lp = 0; const s = Math.floor((t - len * .45) * sr); for (let i = 0; i < len * sr && s + i < n; i++) { const x = i / sr, u = x / len, a = Math.sin(Math.PI * u) ** 2.2, g = ch === "L" ? 1 - u * .8 : .2 + u * .8; lp += (.03 + .55 * Math.sin(Math.PI * u * .9 + .1)) * (noise() - lp); F[ch][s + i] += lp * a * 1.9 * g; } } };
  const click = (t) => { add(F, t, .06, (x) => noise() * Math.exp(-x * 170) * .5); add(F, t, .06, (x) => Math.sin(TAU * 2100 * x) * Math.exp(-x * 110) * .3); add(F, t + .03, .06, (x) => Math.sin(TAU * 950 * x) * Math.exp(-x * 90) * .2); };
  const ding = (t, f = 1320, v = .28) => add(F, t, 1.3, (x) => (Math.sin(TAU * f * x) + .5 * Math.sin(TAU * f * 2.01 * x) + .25 * Math.sin(TAU * f * 3.02 * x)) * Math.exp(-x * 4.5) * v);
  const pop = (t, pan = 0) => add(F, t, .15, (x) => Math.sin(TAU * (450 + 4200 * x) * x) * Math.exp(-x * 28) * .28, pan);
  const shimmer = (t) => { for (let k = 0; k < 6; k++) ding(t + k * .07, 1568 * (1 + k * .25), .1); };

  const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
  const roots = [55, 43.65, 65.4, 49];
  const bars = Math.ceil(TOTAL / 2);
  for (let b = 0; b < bars; b++) {
    const t = b * 2, c = chords[b % 4];
    if (t >= 53.2 && t < 54.5) continue;
    if (t >= 54.5) continue;
    const vol = t < 6 ? .14 : t < 46 ? .2 : .26;
    if (t >= 2) c.forEach((f, i) => padNote(t, f, 2.3, vol, (i - 1) * .5));
    if (t >= 6) sub(t, roots[b % 4], 1.9, t >= 26 ? .5 : .34);
  }
  add(M, 0, 3, (x) => Math.sin(TAU * 55 * x) * .13 * Math.min(1, x / 2));
  for (let b = 12; b < 110; b++) {
    const t = b * beat;
    if (t >= 53.2) continue;
    const peak = t >= 46, mid = t >= 16, breakdown = t >= 36 && t < 46;
    if (t >= 6) { if (!breakdown || b % 2 === 0) kick(t, peak ? 1 : .8); }
    if (t >= 6) hat(t + beat / 2, breakdown ? .07 : .11, .35);
    if (mid && b % 2 === 1 && !breakdown) clap(t);
    if (t >= 16) { hat(t + beat / 4, .045, -.3); hat(t + beat * .75, .045, .3); }
    if (t >= 16 && t < 54) { const ch = chords[Math.floor(t / 2) % 4]; pluck(t + beat * .25, ch[(b * 2) % 3] * 2, .1, ((b % 4) - 1.5) * .45); }
    if (t >= 26 && !breakdown) { const r = roots[Math.floor(t / 2) % 4]; sub(t + beat / 2, r * 2, .4, .22); }
  }

  riser(1.0, 1.5, .22); boom(2.5, 1.1); shimmer(2.6);
  TR.forEach((T) => { riser(T.t - 1.4, 1.4, .22); whoosh(T.t, 1.1); boom(T.t + .12, .55); });
  [48, 50, 52].forEach((t) => { riser(t - 1, 1, .2); boom(t, .85); add(F, t, .6, (x) => (Math.sin(TAU * 220 * x) + Math.sin(TAU * 330 * x)) * Math.exp(-x * 4) * .16); });
  boom(54.5, 1.4); shimmer(54.55);
  [220, 329.6, 440, 554.4].forEach((f, i) => padNote(54.5, f, 5.5, .22, (i - 1.5) * .4));
  sub(54.5, 55, 5, .55);

  const clicks = [9.0, 9.6, 10.0, 10.6, 11.1, 12.0, 62, 63, 64, 33.5, 35.7];
  clicks.forEach((V) => { const tt = tOfV(V); if (tt > 0) click(tt); });
  const tp = tOfV(12.0); ding(tp, 1100); ding(tp + .3, 1320); ding(tp + .45, 1760);
  add(F, tOfV(14.6), .25, (x) => Math.sin(TAU * 2400 * x) * Math.exp(-x * 14) * .3);
  [27.2, 28.6, 30, 31.5, 37, 41.6].forEach((t, i) => pop(t, i % 2 ? .5 : -.5));

  // sidechain sur la musique
  const sc = new Float32Array(n).fill(1);
  for (const t of kicks) { const s = Math.floor(t * sr); for (let i = 0; i < .28 * sr && s + i < n; i++) sc[s + i] = Math.min(sc[s + i], .35 + .65 * (i / (.28 * sr)) ** 1.5); }

  // mixage + reverb
  const mix = { L: new Float32Array(n), R: new Float32Array(n) };
  for (let i = 0; i < n; i++) for (const ch of ["L", "R"]) mix[ch][i] = D[ch][i] * .9 + M[ch][i] * sc[i] + F[ch][i];
  for (const [ch, taps] of [["L", [.083, .151, .227]], ["R", [.097, .173, .251]]]) {
    const src = new Float32Array(n); for (let i = 0; i < n; i++) src[i] = (M[ch][i] * .5 + F[ch][i] * .6);
    for (const [k, d] of taps.entries()) { const o = Math.floor(d * sr), g = .3 / (k + 1); for (let i = o; i < n; i++) mix[ch][i] += src[i - o] * g; }
  }
  let max = 0; for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(mix.L[i]), Math.abs(mix.R[i]));
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, (n - i) / (sr * 1.5), i / (sr * .05));
    buf.writeInt16LE(Math.round(Math.tanh(mix.L[i] / max * 1.3) * 30000 * fade), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.tanh(mix.R[i] / max * 1.3) * 30000 * fade), 46 + i * 4);
  }
  return buf;
}

const frame = (t) => page.evaluate((x) => window.render(x), t);

if (process.argv.includes("--audio")) {
  await writeFile(path.join(out, "final-music.wav"), makeMusic());
  await browser.close();
  process.exit(0);
}

const wav = path.join(out, "final-music.wav"), vid = path.join(out, "final-video.mp4");
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
spawnSync(ffmpeg, ["-y", "-i", vid, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-t", String(TOTAL), "-movflags", "+faststart", path.join(out, "digifeel-spot-pro-60s.mp4")], { stdio: "inherit" });
console.log("OK");
