'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ScanLine } from 'lucide-react';

const CHIP_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Extrait l'identifiant de puce d'un QR Digifeel (/r/<puce>, /activate/<puce> ou l'identifiant seul). */
export function chipIdFromQr(text: string): string | null {
  const match = text.trim().match(CHIP_ID);
  return match ? match[0].toLowerCase() : null;
}

type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };

/** Scanne un QR avec la caméra : une table inconnue est enregistrée, une table existante est renommée. */
export function TableScanner({ onSaved }: { onSaved?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [chipId, setChipId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let timer = 0;
    const detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    const native = detector ? new detector({ formats: ['qr_code'] }) : null;

    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (cancelled || !video || !canvas) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        let text = '';
        try {
          if (native) {
            text = (await native.detect(video))[0]?.rawValue ?? '';
          } else {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) {
              context.drawImage(video, 0, 0);
              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(image.data, image.width, image.height)?.data ?? '';
            }
          }
        } catch {
          text = '';
        }
        if (text) {
          const id = chipIdFromQr(text);
          if (id) {
            setChipId(id);
            setError('');
            setMessage('QR reconnu. Donnez un nom à cette table.');
            stop();
            return;
          }
          setError('Ce QR code n’est pas une puce Digifeel.');
        }
      }
      timer = window.setTimeout(() => void tick(), 250);
    };

    void tick();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [scanning, stop]);

  const start = async () => {
    setError('');
    setMessage('');
    setChipId('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setScanning(true);
      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError('Caméra inaccessible. Autorisez la caméra dans votre navigateur.');
    }
  };

  const save = async () => {
    if (busy || !chipId) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/dashboard/tables/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chipId, name })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Enregistrement impossible.');
      setMessage(result.created ? `Table « ${result.label} » enregistrée.` : `Table renommée en « ${result.label} ».`);
      setChipId('');
      setName('');
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="next-glass-card next-surface-card" aria-labelledby="table-scanner-title">
    <h2 id="table-scanner-title"><ScanLine aria-hidden="true" /> Scanner un QR code</h2>
    <p className="next-muted">Scannez le QR collé sur une table : elle est enregistrée automatiquement. Scannez un QR déjà enregistré pour changer son nom.</p>
    {scanning && <div className="table-scanner-view"><video ref={videoRef} muted playsInline style={{ width: '100%', maxWidth: 360, borderRadius: 12 }} /><canvas ref={canvasRef} hidden /></div>}
    {chipId && <form className="next-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Nom de la table<input required maxLength={40} autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Terrasse 3" /></label>
      <button className="product-button" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>}
    <div className="next-qr-actions">
      {!scanning && <button className="product-button" type="button" onClick={() => void start()}>{chipId ? 'Scanner un autre QR' : 'Scanner avec la caméra'}</button>}
      {scanning && <button className="product-button product-button--secondary" type="button" onClick={stop}>Arrêter</button>}
    </div>
    {error && <p className="next-error" role="alert">{error}</p>}
    {message && <p className="next-success" role="status">{message}</p>}
  </section>;
}
