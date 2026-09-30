import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { RestaurantConfig, TableItem } from '../types';

export interface QrPdfOptions {
  theme: 'gold_luxury' | 'cyber_dark' | 'clean_minimal' | 'emerald_prestige';
  customTitle?: string;
  customSubtitle?: string;
  ctaText?: string;
  showNfcMention?: boolean;
  showGoogleLogo?: boolean;
  format: 'a4_tent' | 'a6_standee' | 'a4_sheet' | 'table_stickers';
}

/**
 * Generate a high-resolution QR Data URL with branding
 */
export async function generateHighResQr(
  url: string,
  options: {
    colorDark?: string;
    colorLight?: string;
    size?: number;
  } = {}
): Promise<string> {
  const { colorDark = '#050711', colorLight = '#ffffff', size = 1000 } = options;
  return await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: colorDark,
      light: colorLight
    }
  });
}

/**
 * Creates and downloads a professional branded PDF for restaurant printing
 */
export async function generateRestaurantPdf(
  restaurant: RestaurantConfig,
  tables: TableItem[],
  selectedTableNumbers: number[],
  options: QrPdfOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: options.format === 'a4_tent' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: options.format === 'a6_standee' ? 'a6' : 'a4'
  });

  const baseUrl = window.location.origin;
  const filteredTables = tables.filter(t => selectedTableNumbers.includes(t.number));
  const tablesToPrint = filteredTables.length > 0 ? filteredTables : tables;

  // Colors based on theme
  const isDark = options.theme === 'cyber_dark' || options.theme === 'gold_luxury';
  const primaryGold = [217, 119, 6]; // #d97706
  const bgDark = [10, 15, 29]; // #0a0f1d
  const textWhite = [255, 255, 255];
  const textDark = [15, 23, 42];
  const accentEmerald = [16, 185, 129];

  if (options.format === 'a4_tent') {
    // A4 LANDSCAPE FOLDABLE TENT (297 x 210 mm)
    // Left half (148.5mm) and Right half (148.5mm)
    // Front and back facing for 3D standing table tent
    for (let i = 0; i < tablesToPrint.length; i++) {
      if (i > 0) doc.addPage('a4', 'landscape');
      const t = tablesToPrint[i];
      const tableUrl = `${baseUrl}/?resto=${restaurant.slug}&table=${t.number}`;
      const qrData = await generateHighResQr(tableUrl, {
        colorDark: options.theme === 'clean_minimal' ? '#0f172a' : '#050711',
        colorLight: '#ffffff',
        size: 800
      });

      // Page background
      if (isDark) {
        doc.setFillColor(bgDark[0], bgDark[1], bgDark[2]);
        doc.rect(0, 0, 297, 210, 'F');
      } else {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, 297, 210, 'F');
      }

      // Center fold dashed line
      doc.setDrawColor(isDark ? 100 : 180, isDark ? 116 : 190, isDark ? 139 : 205);
      doc.setLineDashPattern([3, 3], 0);
      doc.line(148.5, 0, 148.5, 210);
      doc.setLineDashPattern([], 0); // reset

      // Fold text label
      doc.setFontSize(8);
      doc.setTextColor(isDark ? 148 : 100, isDark ? 163 : 116, isDark ? 184 : 139);
      doc.text('--- PLIER ICI AU MILIEU (CHEVALET DE TABLE DOUBLE FACE) ---', 148.5, 6, {
        align: 'center'
      });

      // Render Left Side (Face 1) and Right Side (Face 2)
      const sides = [
        { xOffset: 0, isMirrored: false },
        { xOffset: 148.5, isMirrored: false }
      ];

      for (const side of sides) {
        const cx = side.xOffset + 74.25;

        // Card Container Frame
        doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
        doc.setLineWidth(0.8);
        doc.roundedRect(side.xOffset + 12, 14, 124.5, 182, 6, 6, 'S');

        // Inner header accent bar
        doc.setFillColor(primaryGold[0], primaryGold[1], primaryGold[2]);
        doc.roundedRect(side.xOffset + 24, 20, 100.5, 1.2, 0.6, 0.6, 'F');

        // Restaurant Brand Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(isDark ? textWhite[0] : textDark[0], isDark ? textWhite[1] : textDark[1], isDark ? textWhite[2] : textDark[2]);
        doc.text(restaurant.name.toUpperCase(), cx, 30, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(isDark ? 203 : 100, isDark ? 213 : 116, isDark ? 225 : 139);
        doc.text(options.customSubtitle || 'EXPÉRIENCE DIGITALE & SATISFACTION CLIENT', cx, 35, { align: 'center' });

        // Table Number Badge
        doc.setFillColor(primaryGold[0], primaryGold[1], primaryGold[2]);
        doc.roundedRect(cx - 24, 40, 48, 8, 4, 4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`TABLE N° ${t.number}${t.zone ? ` · ${t.zone.toUpperCase()}` : ''}`, cx, 45.5, { align: 'center' });

        // QR Code Box (White background for 100% scan reliability)
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx - 33, 53, 66, 66, 4, 4, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(cx - 33, 53, 66, 66, 4, 4, 'S');

        // High-res QR image
        doc.addImage(qrData, 'PNG', cx - 30, 56, 60, 60);

        // Action instructions
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(isDark ? textWhite[0] : textDark[0], isDark ? textWhite[1] : textDark[1], isDark ? textWhite[2] : textDark[2]);
        doc.text(options.ctaText || 'Scannez avec votre appareil photo', cx, 128, { align: 'center' });

        // Subtext
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(isDark ? 203 : 100, isDark ? 213 : 116, isDark ? 225 : 139);
        doc.text('1. Ouvrez l\'appareil photo de votre smartphone', cx, 136, { align: 'center' });
        doc.text('2. Pointez vers le QR code ou touchez la puce NFC', cx, 141, { align: 'center' });
        doc.text('3. Évaluez le service et laissez un pourboire direct', cx, 146, { align: 'center' });

        // 5-Star Visual Graphic
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(245, 158, 11);
        doc.text('★ ★ ★ ★ ★', cx, 156, { align: 'center' });

        // NFC Feature Badge at bottom
        if (options.showNfcMention !== false) {
          doc.setFillColor(isDark ? 30 : 241, isDark ? 41 : 245, isDark ? 59 : 249);
          doc.roundedRect(cx - 40, 163, 80, 14, 3, 3, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(accentEmerald[0], accentEmerald[1], accentEmerald[2]);
          doc.text('⚡ COMPATIBLE SANS CONTACT NFC & QR', cx, 169, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(isDark ? 148 : 100, isDark ? 163 : 116, isDark ? 184 : 139);
          doc.text('Aucune application à télécharger · 100% Sécurisé', cx, 174, { align: 'center' });
        }

        // Footer copyright / resto ID
        doc.setFontSize(6.5);
        doc.setTextColor(isDark ? 100 : 160, isDark ? 116 : 175, isDark ? 139 : 185);
        doc.text(`${restaurant.name} · Système Certifié Smart-Serveur NFC`, cx, 190, { align: 'center' });
      }
    }
  } else if (options.format === 'a6_standee') {
    // A6 INDIVIDUAL STANDEE CARDS (105 x 148 mm)
    for (let i = 0; i < tablesToPrint.length; i++) {
      if (i > 0) doc.addPage('a6', 'portrait');
      const t = tablesToPrint[i];
      const tableUrl = `${baseUrl}/?resto=${restaurant.slug}&table=${t.number}`;
      const qrData = await generateHighResQr(tableUrl, { size: 900 });

      // Page background
      if (isDark) {
        doc.setFillColor(bgDark[0], bgDark[1], bgDark[2]);
        doc.rect(0, 0, 105, 148, 'F');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 105, 148, 'F');
      }

      // Outer gold border
      doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
      doc.setLineWidth(0.7);
      doc.roundedRect(6, 6, 93, 136, 4, 4, 'S');

      // Resto Name
      const cx = 52.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(isDark ? textWhite[0] : textDark[0], isDark ? textWhite[1] : textDark[1], isDark ? textWhite[2] : textDark[2]);
      doc.text(restaurant.name.toUpperCase(), cx, 18, { align: 'center' });

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(isDark ? 203 : 100, isDark ? 213 : 116, isDark ? 225 : 139);
      doc.text('AVIS & POURBOIRES EN DIRECT', cx, 23, { align: 'center' });

      // Table Badge
      doc.setFillColor(primaryGold[0], primaryGold[1], primaryGold[2]);
      doc.roundedRect(cx - 20, 27, 40, 7, 3.5, 3.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`TABLE ${t.number}`, cx, 31.8, { align: 'center' });

      // QR Code Box
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx - 27, 39, 54, 54, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(cx - 27, 39, 54, 54, 3, 3, 'S');

      doc.addImage(qrData, 'PNG', cx - 25, 41, 50, 50);

      // Call to action
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(isDark ? textWhite[0] : textDark[0], isDark ? textWhite[1] : textDark[1], isDark ? textWhite[2] : textDark[2]);
      doc.text(options.ctaText || 'Scannez pour donner votre avis', cx, 101, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(isDark ? 203 : 100, isDark ? 213 : 116, isDark ? 225 : 139);
      doc.text('Récompensez votre serveur en 1 clic', cx, 107, { align: 'center' });

      // Rating Stars
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(245, 158, 11);
      doc.text('★ ★ ★ ★ ★', cx, 116, { align: 'center' });

      // Bottom Badge
      doc.setFillColor(isDark ? 25 : 241, isDark ? 35 : 245, isDark ? 50 : 249);
      doc.roundedRect(cx - 32, 122, 64, 11, 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(accentEmerald[0], accentEmerald[1], accentEmerald[2]);
      doc.text('⚡ TOUCHER NFC OU SCAN CAMERA', cx, 127, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(isDark ? 148 : 100, isDark ? 163 : 116, isDark ? 184 : 139);
      doc.text('Sans application · 100% instantané', cx, 130.5, { align: 'center' });
    }
  } else if (options.format === 'a4_sheet') {
    // A4 MULTI-TABLE SHEET (4 tables per page, ready to cut with scissors)
    const tablesPerPage = 4;
    const totalPages = Math.ceil(tablesToPrint.length / tablesPerPage);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage('a4', 'portrait');

      // Page Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${restaurant.name.toUpperCase()} · PLANCHE DE CHEVALETS À DÉCOUPER (A4)`, 105, 12, {
        align: 'center'
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Découpez le long des pointillés puis insérez dans vos supports en plexiglas / chevalets.', 105, 16, {
        align: 'center'
      });

      // Cutting lines (horizontal and vertical cross)
      doc.setDrawColor(203, 213, 225);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(105, 20, 105, 285);
      doc.line(10, 152.5, 200, 152.5);
      doc.setLineDashPattern([], 0);

      const pageTables = tablesToPrint.slice(page * tablesPerPage, (page + 1) * tablesPerPage);

      // Positions for 4 quadrants: (col 0, row 0), (col 1, row 0), (col 0, row 1), (col 1, row 1)
      const quadrants = [
        { x: 12, y: 22, w: 90, h: 126 },
        { x: 108, y: 22, w: 90, h: 126 },
        { x: 12, y: 156, w: 90, h: 126 },
        { x: 108, y: 156, w: 90, h: 126 }
      ];

      for (let idx = 0; idx < pageTables.length; idx++) {
        const t = pageTables[idx];
        const quad = quadrants[idx];
        const cx = quad.x + quad.w / 2;

        const tableUrl = `${baseUrl}/?resto=${restaurant.slug}&table=${t.number}`;
        const qrData = await generateHighResQr(tableUrl, { size: 600 });

        // Outer Card Border
        doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(quad.x, quad.y, quad.w, quad.h, 3, 3, 'S');

        // Scissor guide mark
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('✂ Découper', quad.x + 3, quad.y + 4);

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(restaurant.name.toUpperCase(), cx, quad.y + 11, { align: 'center' });

        // Table Pill
        doc.setFillColor(primaryGold[0], primaryGold[1], primaryGold[2]);
        doc.roundedRect(cx - 18, quad.y + 15, 36, 6, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`TABLE ${t.number}`, cx, quad.y + 19.3, { align: 'center' });

        // QR Code Box
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx - 24, quad.y + 25, 48, 48, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cx - 24, quad.y + 25, 48, 48, 2, 2, 'S');
        doc.addImage(qrData, 'PNG', cx - 22, quad.y + 27, 44, 44);

        // CTA
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Scannez pour noter & pourboire', cx, quad.y + 80, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(245, 158, 11);
        doc.text('★ ★ ★ ★ ★', cx, quad.y + 87, { align: 'center' });

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(cx - 28, quad.y + 92, 56, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(accentEmerald[0], accentEmerald[1], accentEmerald[2]);
        doc.text('⚡ SANS CONTACT NFC & QR', cx, quad.y + 96, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text('Redirection Google Reviews 5★', cx, quad.y + 99.5, { align: 'center' });
      }
    }
  } else if (options.format === 'table_stickers') {
    // TABLE STICKERS (6 square stickers 75x75mm per A4 page)
    const stickersPerPage = 6;
    const totalPages = Math.ceil(tablesToPrint.length / stickersPerPage);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage('a4', 'portrait');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${restaurant.name.toUpperCase()} · STICKERS ET ADHÉSIFS DE TABLE`, 105, 12, {
        align: 'center'
      });

      const pageTables = tablesToPrint.slice(page * stickersPerPage, (page + 1) * stickersPerPage);
      const stickerGrid = [
        { x: 18, y: 22, size: 80 },
        { x: 112, y: 22, size: 80 },
        { x: 18, y: 108, size: 80 },
        { x: 112, y: 108, size: 80 },
        { x: 18, y: 194, size: 80 },
        { x: 112, y: 194, size: 80 }
      ];

      for (let idx = 0; idx < pageTables.length; idx++) {
        const t = pageTables[idx];
        const s = stickerGrid[idx];
        const cx = s.x + s.size / 2;

        const tableUrl = `${baseUrl}/?resto=${restaurant.slug}&table=${t.number}`;
        const qrData = await generateHighResQr(tableUrl, { size: 500 });

        // Circular or rounded sticker border
        doc.setFillColor(bgDark[0], bgDark[1], bgDark[2]);
        doc.roundedRect(s.x, s.y, s.size, s.size, 8, 8, 'F');
        doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
        doc.setLineWidth(0.8);
        doc.roundedRect(s.x, s.y, s.size, s.size, 8, 8, 'S');

        // Brand & Table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(restaurant.name.toUpperCase(), cx, s.y + 8, { align: 'center' });

        doc.setFillColor(primaryGold[0], primaryGold[1], primaryGold[2]);
        doc.roundedRect(cx - 16, s.y + 11, 32, 5, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`TABLE ${t.number}`, cx, s.y + 14.5, { align: 'center' });

        // QR Code Box
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx - 19, s.y + 19, 38, 38, 2, 2, 'F');
        doc.addImage(qrData, 'PNG', cx - 18, s.y + 20, 36, 36);

        // CTA
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text('⚡ SCAN OU TOUCHER NFC', cx, s.y + 63, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(245, 158, 11);
        doc.text('⭐ Notez votre expérience ⭐', cx, s.y + 68, { align: 'center' });
      }
    }
  }

  // Save the generated PDF
  const filename = `chevalets-qr-${restaurant.slug}-${options.format}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
