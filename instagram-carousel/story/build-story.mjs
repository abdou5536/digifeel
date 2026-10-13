// Génère output/digifeel-story.mp4 (1080x1920, 9:16) pour une story Instagram.
// Usage : FFMPEG=chemin\vers\ffmpeg.exe node story/build-story.mjs
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const portfolio = path.join(here, "..", "output", "social", "portfolio");
const out = path.join(here, "output");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const card of ["intro", "outro"]) {
  await page.goto(`${pathToFileURL(path.join(here, "cards.html")).href}?card=${card}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, `${card}.png`) });
}
await browser.close();

const images = [
  path.join(out, "intro.png"),
  path.join(portfolio, "01-avis-nfc.png"),
  path.join(portfolio, "02-caisse.png"),
  path.join(portfolio, "04-ticket.png"),
  path.join(portfolio, "08-exports.png"),
  path.join(out, "outro.png"),
];
const hold = 3.2;
const fade = 0.5;
const fps = 30;
const frames = Math.round((hold + fade) * fps);

const inputs = images.flatMap((file) => ["-i", file]);
const clips = images.map(
  (_, i) =>
    `[${i}:v]scale=2160:3840:flags=lanczos,zoompan=z='min(1.0+0.0004*on,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps},setsar=1[v${i}]`,
);
let chain = "[v0]";
let label = "v0";
const parts = [];
for (let i = 1; i < images.length; i++) {
  const next = `x${i}`;
  parts.push(`${chain}[v${i}]xfade=transition=fade:duration=${fade}:offset=${(hold * i).toFixed(2)}[${next}]`);
  chain = `[${next}]`;
  label = next;
}
const filter = [...clips, ...parts].join(";");

const result = spawnSync(
  ffmpeg,
  [
    "-y",
    ...inputs,
    "-filter_complex", filter,
    "-map", `[${label}]`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-crf", "18", "-r", String(fps), "-movflags", "+faststart",
    path.join(out, "digifeel-story.mp4"),
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) throw new Error("ffmpeg a échoué");
console.log("OK →", path.join(out, "digifeel-story.mp4"));
