// Génère output/digifeel-film.mp4 (1080x1920, 24 fps, ~60 s).
// Usage : FFMPEG=chemin\ffmpeg.exe node story/build-film.mjs [--preview]
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "output");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const FPS = 24, TOTAL = 60;
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const xl = await readFile(path.join(here, "assets", "doc", "xlsx.json"), "utf8");
await page.addInitScript((d) => { window.XLDATA = JSON.parse(d); }, xl);
await page.goto(pathToFileURL(path.join(here, "film.html")).href);
await page.evaluate(() => window.ready);

if (process.argv.includes("--preview")) {
  const times = (process.argv.find((a) => a.startsWith("--t=")) || "--t=1.5,3,5,6.8,9,12,20,26,34,38,42,50,56,59").slice(4).split(",").map(Number);
  for (const t of times) {
    await page.evaluate((x) => window.render(x), t);
    await page.screenshot({ path: path.join(out, `prev-${String(t).replace(".", "_")}.jpg`), type: "jpeg", quality: 80 });
  }
  await browser.close();
  process.exit(0);
}

const proc = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", path.join(out, "digifeel-film.mp4")], { stdio: ["pipe", "ignore", "inherit"] });
const frames = FPS * TOTAL;
for (let i = 0; i < frames; i++) {
  await page.evaluate((x) => window.render(x), i / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once("drain", r));
}
proc.stdin.end();
await new Promise((r) => proc.on("close", r));
await browser.close();
console.log("OK");
