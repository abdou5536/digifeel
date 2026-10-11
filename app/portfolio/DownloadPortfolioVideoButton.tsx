'use client';

import { useEffect, useState } from 'react';
import { Download, LoaderCircle, Video } from 'lucide-react';
import styles from './Portfolio.module.css';

type Visual = 'dashboard' | 'customer' | 'cashier' | 'reports' | 'roles' | 'pricing' | 'roadmap';

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: Visual;
  note?: string;
}

const WIDTH = 1280;
const HEIGHT = 720;
const FRAMES_PER_SECOND = 24;
const SLIDE_DURATION_MS = 2800;
const GOLD = '#dbb777';
const MUTED = '#adb4aa';
const WHITE = '#f4f2ec';
const PANEL = '#18211d';

const slides: Slide[] = [
  {
    eyebrow: 'DIGIFEEL · PRÉSENTATION',
    title: 'Le service garde son rythme.',
    body: 'Une expérience simple pour les clients, des outils pratiques pour l’équipe du restaurant.',
    bullets: ['Caisse et suivi', 'QR code et avis', 'Rapports PDF et Excel'],
    visual: 'dashboard',
    note: 'Aperçus et chiffres de démonstration.'
  },
  {
    eyebrow: 'PARCOURS CLIENT',
    title: 'De la table au retour client.',
    body: 'Un QR code mène vers les services du restaurant, sans demander au client d’installer une application.',
    bullets: ['QR par table', 'Avis enregistrés', 'Accès à la fiche Google'],
    visual: 'customer',
    note: 'L’écriture d’une puce NFC depuis Digifeel reste à mettre en place.'
  },
  {
    eyebrow: 'CAISSE',
    title: 'Une caisse claire pendant le service.',
    body: 'Retrouvez le catalogue, composez un panier, choisissez un moyen de paiement et imprimez le ticket.',
    bullets: ['Produits et quantités', 'Espèces, carte ou BaridiMob', 'Historique et annulation tracée'],
    visual: 'cashier',
    note: 'La carte doit être confirmée par le prestataire ; BaridiMob est vérifié par l’équipe.'
  },
  {
    eyebrow: 'RAPPORTS',
    title: 'PDF à partager. Excel à analyser.',
    body: 'Les exports regroupent les ventes, les produits, l’équipe, les avis et les scans sur une période.',
    bullets: ['Rapport PDF', 'Classeur Excel', 'Synthèse et détails par activité'],
    visual: 'reports',
    note: 'Les données illustrées sont fictives ; ces exports ne sont pas des documents fiscaux.'
  },
  {
    eyebrow: 'GESTION DES ACCÈS',
    title: 'Un espace par établissement.',
    body: 'Les rôles et les règles de base de données séparent les accès opérationnels et administratifs.',
    bullets: ['Administrateur restaurant', 'Serveur', 'Essai de 30 jours selon configuration'],
    visual: 'roles'
  },
  {
    eyebrow: 'INSTALLATION',
    title: 'Un équipement à votre mesure.',
    body: 'Le tarif présenté pour l’installation QR est calculé par table, sans imposer un nombre fixe de tables.',
    bullets: ['9 € par table pour l’installation QR', 'Exemple : 12 tables = 108 €', 'NFC sur devis séparé'],
    visual: 'pricing',
    note: 'Prix de présentation à confirmer dans le devis du restaurant.'
  },
  {
    eyebrow: 'PÉRIMÈTRE TRANSPARENT',
    title: 'On prépare la suite avec vous.',
    body: 'Avant une mise en service complète, certaines fonctions doivent être terminées et validées sur le terrain.',
    bullets: ['Plan de salle et additions partagées', 'TVA et clôture de caisse Z', 'Sauvegardes vérifiées et écriture NFC'],
    visual: 'roadmap',
    note: 'Cette présentation distingue les fonctions disponibles des évolutions à finaliser.'
  }
];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function writeWrapped(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines = wrapText(ctx, value, maxWidth);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function drawBackground(ctx: CanvasRenderingContext2D, progress: number) {
  ctx.fillStyle = '#0a0e0e';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(1030, 210, 10, 1030, 210, 540);
  glow.addColorStop(0, 'rgba(168,126,61,.19)');
  glow.addColorStop(0.55, 'rgba(74,105,83,.08)');
  glow.addColorStop(1, 'rgba(10,14,14,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(231,225,208,.035)';
  ctx.lineWidth = 1;
  for (let x = 32; x < WIDTH; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 32; y < HEIGHT; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  ctx.fillRect(72, 42, 4, 22);
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText('DIGIFEEL', 88, 59);
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  ctx.fillText('PRÉSENTATION CLIENT · 2026', WIDTH - 72, 58);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.fillRect(72, HEIGHT - 34, WIDTH - 144, 2);
  ctx.fillStyle = GOLD;
  ctx.fillRect(72, HEIGHT - 34, (WIDTH - 144) * progress, 2);
}

function drawDashboard(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#99a093';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('VUE D’ENSEMBLE · EXEMPLE', 836, 204);
  ctx.fillStyle = WHITE;
  ctx.font = '600 25px system-ui, sans-serif';
  ctx.fillText('Le service, en un regard', 836, 244);
  const metrics = [['Scans', '1 284'], ['Avis', '96'], ['Note', '4,8 / 5']];
  metrics.forEach(([label, value], index) => {
    const x = 836 + index * 108;
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    roundedRect(ctx, x, 273, 96, 78, 12);
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillText(label, x + 12, 297);
    ctx.fillStyle = WHITE;
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText(value, x + 12, 331);
  });
  const bars = [34, 48, 40, 62, 54, 82, 68, 91, 60, 78, 58, 86];
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  roundedRect(ctx, 836, 374, 348, 155, 12);
  ctx.fill();
  bars.forEach((height, index) => {
    const x = 855 + index * 26;
    const barHeight = height * 1.12;
    ctx.fillStyle = index % 3 === 0 ? '#a4b28f' : GOLD;
    roundedRect(ctx, x, 500 - barHeight, 15, barHeight, 5);
    ctx.fill();
  });
}

function drawQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const cells = 21;
  const cell = size / cells;
  const inFinder = (row: number, col: number, top: number, left: number) =>
    row >= top && row < top + 7 && col >= left && col < left + 7;
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const finder = [[0, 0], [0, 14], [14, 0]].some(([top, left]) => inFinder(row, col, top, left));
      const value = finder
        ? [row % 14 === 0 || row % 14 === 6 || col % 14 === 0 || col % 14 === 6 || (row % 14 >= 2 && row % 14 <= 4 && col % 14 >= 2 && col % 14 <= 4)]
        : ((row * 7 + col * 11 + row * col) % 5 < 2);
      if (!value) continue;
      ctx.fillStyle = '#eee9da';
      ctx.fillRect(x + col * cell, y + row * cell, cell - 1, cell - 1);
    }
  }
}

function drawCustomer(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  roundedRect(ctx, 824, 190, 352, 330, 18);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('TABLE 04 · MAQUETTE', 850, 222);
  ctx.fillStyle = '#121917';
  roundedRect(ctx, 856, 250, 115, 115, 12);
  ctx.fill();
  drawQr(ctx, 869, 263, 89);
  ctx.fillStyle = MUTED;
  ctx.font = '500 11px system-ui, sans-serif';
  ctx.fillText('QR illustratif', 879, 387);

  ctx.fillStyle = PANEL;
  roundedRect(ctx, 998, 245, 145, 210, 18);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Votre avis', 1070, 282);
  ctx.fillStyle = MUTED;
  ctx.font = '400 11px system-ui, sans-serif';
  ctx.fillText('Comment était', 1070, 310);
  ctx.fillText('votre repas ?', 1070, 327);
  ctx.fillStyle = GOLD;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('★ ★ ★ ★ ☆', 1070, 367);
  ctx.fillStyle = 'rgba(219,183,119,.16)';
  roundedRect(ctx, 1022, 387, 97, 33, 9);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('Continuer', 1070, 408);
  ctx.textAlign = 'left';
}

function drawCashier(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  roundedRect(ctx, 820, 184, 365, 356, 16);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('COMMANDE · DÉMONSTRATION', 846, 218);
  const rows = [['Couscous maison', '1 800'], ['Tajine de poulet', '2 200'], ['Thé à la menthe', '200']];
  rows.forEach(([name, price], index) => {
    const y = 266 + index * 63;
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    roundedRect(ctx, 844, y - 24, 316, 48, 9);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = '500 15px system-ui, sans-serif';
    ctx.fillText(name, 860, y + 5);
    ctx.textAlign = 'right';
    ctx.fillStyle = GOLD;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`${price} DZD`, 1143, y + 5);
    ctx.textAlign = 'left';
  });
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.moveTo(844, 458);
  ctx.lineTo(1160, 458);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillText('TOTAL', 848, 494);
  ctx.textAlign = 'right';
  ctx.fillStyle = WHITE;
  ctx.font = '700 23px system-ui, sans-serif';
  ctx.fillText('4 200 DZD', 1155, 495);
  ctx.textAlign = 'left';
}

function drawReports(ctx: CanvasRenderingContext2D) {
  const reports = [
    { y: 213, icon: 'PDF', title: 'Rapport d’activité', detail: 'Synthèse · ventes · avis', color: '#dd8d7a' },
    { y: 316, icon: 'XLSX', title: 'Classeur Excel', detail: 'Données organisées par onglet', color: '#91c29a' }
  ];
  reports.forEach(report => {
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    roundedRect(ctx, 830, report.y, 354, 80, 13);
    ctx.fill();
    ctx.fillStyle = report.color;
    roundedRect(ctx, 849, report.y + 17, 50, 46, 9);
    ctx.fill();
    ctx.fillStyle = '#111714';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(report.icon, 874, report.y + 45);
    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText(report.title, 917, report.y + 34);
    ctx.fillStyle = MUTED;
    ctx.font = '400 12px system-ui, sans-serif';
    ctx.fillText(report.detail, 917, report.y + 56);
  });
  ctx.fillStyle = GOLD;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('EXEMPLE · DONNÉES FICTIVES', 849, 450);
  ctx.fillStyle = MUTED;
  ctx.font = '400 12px system-ui, sans-serif';
  ctx.fillText('Exports de gestion, pas documents fiscaux.', 849, 476);
}

function drawRoles(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  roundedRect(ctx, 824, 188, 360, 340, 17);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('ESPACE RESTAURANT', 850, 223);
  const rows = [['A', 'Administrateur', 'Gestion'], ['S', 'Serveur', 'Service'], ['R', 'Restaurant', 'Données isolées']];
  rows.forEach(([initial, label, detail], index) => {
    const y = 265 + index * 73;
    ctx.fillStyle = 'rgba(219,183,119,.15)';
    ctx.beginPath();
    ctx.arc(873, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(initial, 873, y + 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(label, 909, y - 2);
    ctx.fillStyle = MUTED;
    ctx.font = '400 12px system-ui, sans-serif';
    ctx.fillText(detail, 909, y + 19);
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.beginPath();
    ctx.moveTo(850, y + 37);
    ctx.lineTo(1156, y + 37);
    ctx.stroke();
  });
  ctx.fillStyle = '#9dd09f';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('Période d’essai : 30 jours selon configuration', 850, 500);
}

function drawPricing(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  roundedRect(ctx, 824, 188, 360, 340, 17);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('EXEMPLE D’INSTALLATION', 850, 224);
  ctx.fillStyle = WHITE;
  ctx.font = '700 40px system-ui, sans-serif';
  ctx.fillText('12 tables', 850, 291);
  ctx.fillStyle = GOLD;
  ctx.font = '700 55px system-ui, sans-serif';
  ctx.fillText('108 €', 850, 367);
  ctx.fillStyle = MUTED;
  ctx.font = '500 14px system-ui, sans-serif';
  ctx.fillText('12 × 9 € · installation QR', 850, 405);
  for (let i = 0; i < 12; i += 1) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    ctx.fillStyle = i < 12 ? (i % 3 === 0 ? '#e5d4b0' : '#62725e') : '#344137';
    ctx.beginPath();
    ctx.arc(858 + col * 49, 461 + row * 28, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = MUTED;
  ctx.font = '400 11px system-ui, sans-serif';
  ctx.fillText('Prix présenté à confirmer dans le devis.', 850, 524);
}

function drawRoadmap(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  roundedRect(ctx, 824, 188, 360, 340, 17);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('À FINALISER AVANT DÉPLOIEMENT COMPLET', 850, 224);
  const items = ['Plan de salle et additions partagées', 'TVA et clôture de caisse Z', 'Sauvegarde quotidienne vérifiée', 'Écriture NFC depuis l’application'];
  items.forEach((item, index) => {
    const y = 272 + index * 57;
    ctx.fillStyle = 'rgba(219,183,119,.16)';
    ctx.beginPath();
    ctx.arc(861, y - 4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1).padStart(2, '0'), 861, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE;
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText(item, 884, y);
  });
}

function drawSlide(ctx: CanvasRenderingContext2D, slide: Slide, index: number, elapsed: number) {
  const slideProgress = Math.min(1, elapsed / SLIDE_DURATION_MS);
  const fade = Math.min(1, slideProgress * 4);
  const offset = (1 - fade) * 24;
  const overallProgress = Math.min(1, (index + slideProgress) / slides.length);
  drawBackground(ctx, overallProgress);

  ctx.globalAlpha = fade;
  ctx.fillStyle = GOLD;
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText(slide.eyebrow, 92, 174 + offset);

  ctx.fillStyle = WHITE;
  ctx.font = '700 49px system-ui, sans-serif';
  const titleBottom = writeWrapped(ctx, slide.title, 92, 244 + offset, 625, 60);

  ctx.fillStyle = MUTED;
  ctx.font = '400 21px system-ui, sans-serif';
  const bodyBottom = writeWrapped(ctx, slide.body, 94, titleBottom + 12, 600, 34);

  ctx.fillStyle = WHITE;
  ctx.font = '500 17px system-ui, sans-serif';
  slide.bullets.forEach((item, bulletIndex) => {
    const y = bodyBottom + 23 + bulletIndex * 37;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(100, y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.fillText(item, 118, y);
  });

  ctx.fillStyle = 'rgba(24,33,29,.9)';
  roundedRect(ctx, 790, 142, 412, 432, 19);
  ctx.fill();
  ctx.strokeStyle = 'rgba(231,225,208,.13)';
  ctx.lineWidth = 1;
  roundedRect(ctx, 790, 142, 412, 432, 19);
  ctx.stroke();

  if (slide.visual === 'dashboard') drawDashboard(ctx);
  if (slide.visual === 'customer') drawCustomer(ctx);
  if (slide.visual === 'cashier') drawCashier(ctx);
  if (slide.visual === 'reports') drawReports(ctx);
  if (slide.visual === 'roles') drawRoles(ctx);
  if (slide.visual === 'pricing') drawPricing(ctx);
  if (slide.visual === 'roadmap') drawRoadmap(ctx);

  ctx.globalAlpha = 1;
  if (slide.note) {
    ctx.fillStyle = 'rgba(10,14,14,.82)';
    roundedRect(ctx, 92, HEIGHT - 88, 1100, 38, 8);
    ctx.fill();
    ctx.fillStyle = '#c5cbbf';
    ctx.font = '400 13px system-ui, sans-serif';
    ctx.fillText(slide.note, 108, HEIGHT - 64);
  }
  ctx.fillStyle = MUTED;
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`, WIDTH - 76, HEIGHT - 58);
  ctx.textAlign = 'left';
}

function recorderMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
}

export function DownloadPortfolioVideoButton({ compact = false }: { compact?: boolean }) {
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [extension, setExtension] = useState<'mp4' | 'webm'>('webm');

  useEffect(() => () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  const prepareVideo = async () => {
    if (recording) return;
    if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) {
      setMessage('L’export vidéo n’est pas pris en charge par ce navigateur. Essayez Chrome ou Microsoft Edge.');
      return;
    }

    setRecording(true);
    setProgress(0);
    setMessage('');
    setDownloadUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });

    let stream: MediaStream | null = null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Le navigateur n’a pas pu préparer l’image de la présentation.');

      stream = canvas.captureStream(FRAMES_PER_SECOND);
      const mimeType = recorderMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_500_000
      });
      const fileExtension = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const chunks: BlobPart[] = [];
      const videoReady = new Promise<Blob>((resolve, reject) => {
        recorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0) chunks.push(event.data);
        });
        recorder.addEventListener('stop', () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
          if (blob.size === 0) reject(new Error('Le fichier vidéo est vide.'));
          else resolve(blob);
        }, { once: true });
        recorder.addEventListener('error', () => reject(new Error('Le navigateur a interrompu l’enregistrement vidéo.')), { once: true });
      });

      recorder.start(250);
      const startedAt = performance.now();
      const totalDuration = slides.length * SLIDE_DURATION_MS;
      await new Promise<void>(resolve => {
        let lastReportedProgress = -1;
        const renderFrame = (now: number) => {
          const elapsed = Math.max(0, Math.min(now - startedAt, totalDuration));
          const slideIndex = Math.max(0, Math.min(Math.floor(elapsed / SLIDE_DURATION_MS), slides.length - 1));
          const slideElapsed = slideIndex === slides.length - 1 && elapsed === totalDuration
            ? SLIDE_DURATION_MS
            : elapsed % SLIDE_DURATION_MS;
          drawSlide(context, slides[slideIndex], slideIndex, slideElapsed);
          const nextProgress = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
          if (nextProgress !== lastReportedProgress) {
            lastReportedProgress = nextProgress;
            setProgress(nextProgress);
          }
          if (elapsed >= totalDuration) resolve();
          else requestAnimationFrame(renderFrame);
        };
        requestAnimationFrame(renderFrame);
      });
      recorder.stop();
      const blob = await videoReady;
      const url = URL.createObjectURL(blob);
      setExtension(fileExtension);
      setDownloadUrl(url);
      setProgress(100);
      setMessage(`Présentation prête en ${fileExtension.toUpperCase()} · ${Math.round(blob.size / 1024 / 1024 * 10) / 10} Mo.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Export vidéo impossible : ${error.message}` : 'Export vidéo impossible. Réessayez avec Chrome ou Microsoft Edge.');
    } finally {
      stream?.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  return (
    <span className={`${styles.downloadControl} ${compact ? styles.downloadControlCompact : ''} ${styles.videoControl}`}>
      {downloadUrl
        ? <a className={styles.downloadButton} href={downloadUrl} download={`Digifeel-presentation-client.${extension}`}>
            <Download size={16} />{compact ? `Vidéo ${extension.toUpperCase()}` : `Télécharger la vidéo ${extension.toUpperCase()}`}
          </a>
        : <button
            className={styles.downloadButton}
            type="button"
            onClick={() => void prepareVideo()}
            disabled={recording}
            aria-label={compact ? 'Préparer la vidéo du portfolio Digifeel' : 'Préparer et télécharger la présentation vidéo Digifeel'}
          >
            {recording ? <LoaderCircle className={styles.downloadSpinner} size={16} /> : <Video size={16} />}
            {recording ? `${progress} %` : compact ? 'Vidéo' : 'Télécharger la présentation vidéo'}
          </button>}
      {recording && <span className={styles.videoProgress} role="progressbar" aria-label="Préparation de la vidéo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></span>}
      {message && <span className={downloadUrl ? styles.videoMessage : styles.downloadError} role={downloadUrl ? 'status' : 'alert'}>{message}</span>}
      {!compact && !recording && !downloadUrl && <small className={styles.videoHint}>MP4 si disponible, sinon WebM · environ 20 secondes</small>}
    </span>
  );
}
