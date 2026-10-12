export const CHART_COLORS = { gold: '#C8963E', dark: '#1B1F27', grid: '#E6E8EB', text: '#3A4048', muted: '#7A828C' };

interface BarChartOptions {
  title: string;
  labels: string[];
  values: number[];
  format: (value: number) => string;
  orientation?: 'vertical' | 'horizontal';
  width?: number;
  height?: number;
  color?: string;
}

const SCALE = 2;

function shorten(label: string, max: number) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

// Rendu canvas en PNG, utilisé pour intégrer de vrais graphiques dans les fichiers Excel.
export function barChartBase64(options: BarChartOptions): string | null {
  if (typeof document === 'undefined' || options.values.length === 0) return null;
  const { title, labels, values, format, orientation = 'vertical', width = 640, height = 320, color = CHART_COLORS.gold } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = CHART_COLORS.dark;
  ctx.font = '600 15px Arial, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, 16, 26);

  const max = Math.max(...values, 1);
  if (orientation === 'horizontal') {
    const left = 150;
    const right = 90;
    const top = 44;
    const rowHeight = Math.min(30, (height - top - 12) / values.length);
    values.forEach((value, index) => {
      const y = top + index * rowHeight;
      const barWidth = Math.max(1, ((width - left - right) * value) / max);
      ctx.fillStyle = CHART_COLORS.text;
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(shorten(labels[index], 22), left - 8, y + rowHeight * 0.62);
      ctx.fillStyle = color;
      ctx.fillRect(left, y + 3, barWidth, rowHeight - 8);
      ctx.fillStyle = CHART_COLORS.dark;
      ctx.textAlign = 'left';
      ctx.fillText(format(value), left + barWidth + 6, y + rowHeight * 0.62);
    });
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png').split(',')[1];
  }

  const left = 14;
  const right = 14;
  const top = 50;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = top + (plotHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();
  }
  ctx.fillStyle = CHART_COLORS.muted;
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`max ${format(max)}`, width - right, top - 8);
  const slot = plotWidth / values.length;
  const barWidth = Math.max(2, Math.min(36, slot * 0.7));
  const step = Math.max(1, Math.ceil(values.length / 10));
  values.forEach((value, index) => {
    const barHeight = (plotHeight * value) / max;
    const x = left + slot * index + (slot - barWidth) / 2;
    ctx.fillStyle = color;
    ctx.fillRect(x, top + plotHeight - barHeight, barWidth, barHeight);
    if (index % step === 0) {
      ctx.fillStyle = CHART_COLORS.muted;
      ctx.textAlign = 'center';
      ctx.fillText(shorten(labels[index], 10), x + barWidth / 2, height - 14);
    }
  });
  ctx.textAlign = 'left';
  return canvas.toDataURL('image/png').split(',')[1];
}
