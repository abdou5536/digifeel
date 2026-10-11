'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface Props {
  restaurantName: string;
  slug: string;
  tables: number[];
}

export function TableQrSheet({ restaurantName, slug, tables }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const [{ jsPDF }, { default: QRCode }] = await Promise.all([import('jspdf'), import('qrcode')]);
      const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
      for (let index = 0; index < tables.length; index += 1) {
        const number = tables[index];
        const url = `${window.location.origin}/r/${encodeURIComponent(slug)}/t/${number}`;
        const image = await QRCode.toDataURL(url, { width: 900, margin: 2, errorCorrectionLevel: 'H' });
        if (index > 0) pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.text(restaurantName, 105, 30, { align: 'center', maxWidth: 170 });
        pdf.setFontSize(48);
        pdf.text(`Table ${number}`, 105, 55, { align: 'center' });
        pdf.addImage(image, 'PNG', 40, 70, 130, 130);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(14);
        pdf.text('Scannez pour voir l’addition et laisser votre avis', 105, 215, { align: 'center', maxWidth: 170 });
        pdf.setFontSize(8);
        pdf.text(url, 105, 225, { align: 'center', maxWidth: 170 });
      }
      pdf.save(`qr-tables-${slug}.pdf`);
    } catch (sheetError) {
      console.error('Planche de QR codes impossible.', sheetError);
      setError('Le PDF n’a pas pu être généré.');
    } finally {
      setBusy(false);
    }
  };

  if (!tables.length) return null;
  return <div className="next-qr-actions">
    <button className="product-button product-button--secondary" type="button" disabled={busy} onClick={() => void generate()}><Download aria-hidden="true" /> {busy ? 'Génération…' : 'PDF des QR codes (une page par table)'}</button>
    {error && <span className="next-error" role="alert">{error}</span>}
  </div>;
}
