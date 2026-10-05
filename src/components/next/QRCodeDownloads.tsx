'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';

export function QRCodeDownloads({ chipId }: { chipId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async (format: 'svg' | 'png') => {
    setBusy(true);
    setError('');
    try {
      const url = `${window.location.origin}/r/${encodeURIComponent(chipId)}`;
      if (format === 'svg') {
        const svg = await QRCode.toString(url, { type: 'svg', width: 640, margin: 2 });
        saveFile(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${chipId}.svg`);
      } else {
        const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'H' });
        const response = await fetch(dataUrl);
        saveFile(await response.blob(), `${chipId}.png`);
      }
    } catch (downloadError) {
      console.error('QR code could not be generated.', downloadError);
      setError('Le QR code n’a pas pu être généré.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="next-qr-actions">
    <button className="product-button product-button--secondary" type="button" disabled={busy} onClick={() => void download('svg')}><Download aria-hidden="true" /> SVG</button>
    <button className="product-button product-button--secondary" type="button" disabled={busy} onClick={() => void download('png')}><Download aria-hidden="true" /> PNG</button>
    {error && <span className="next-error" role="alert">{error}</span>}
  </div>;
}

function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
