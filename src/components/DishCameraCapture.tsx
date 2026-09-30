import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, X, Check, Image as ImageIcon, Sparkles, SwitchCamera, AlertCircle, Trash2 } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface DishCameraCaptureProps {
  photoUrl?: string;
  onPhotoCaptured: (dataUrl: string | undefined) => void;
}

const DISH_TAGS = [
  '🍽️ Plat Principal',
  '🍰 Dessert',
  '🍹 Cocktail / Boisson',
  '🥗 Entrée',
  '✨ Ambiance & Cadre'
];

export const DishCameraCapture: React.FC<DishCameraCaptureProps> = ({
  photoUrl,
  onPhotoCaptured
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string>('🍽️ Plat Principal');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop media stream tracks
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Start Camera Stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Caméra non disponible sur ce navigateur');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1080 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      soundFX.playHoverTick();
    } catch (err) {
      console.warn('Camera stream error, falling back to file input:', err);
      setCameraError('Accès caméra non accordé. Vous pouvez choisir une photo depuis votre galerie.');
      // Automatically fallback to file input if direct camera fails
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Close live camera
  const closeCamera = () => {
    stopStream();
    setIsCameraActive(false);
    setCameraError(null);
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  // Switch between front/back camera
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  // Take Snapshot from Video Stream
  const takeSnapshot = () => {
    if (!videoRef.current) return;

    // Flash effect & shutter sound
    setIsFlashing(true);
    soundFX.playCameraShutter();
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Center crop to 1:1 square for delicious food presentation
      const sx = ((video.videoWidth || size) - size) / 2;
      const sy = ((video.videoHeight || size) - size) / 2;

      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
      
      // Add subtle watermark timestamp
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onPhotoCaptured(dataUrl);
      closeCamera();
    }
  };

  // Handle standard file upload / mobile camera picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          soundFX.playCameraShutter();
          onPhotoCaptured(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    soundFX.playHoverTick();
    onPhotoCaptured(undefined);
  };

  return (
    <div className="space-y-2.5">
      {/* Hidden native input with environment capture for direct mobile camera access */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>Photo de votre plat ou de l'ambiance</span>
          <span className="text-[10px] text-slate-500 font-normal">(optionnel)</span>
        </label>
        {photoUrl && (
          <button
            type="button"
            onClick={removePhoto}
            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Supprimer</span>
          </button>
        )}
      </div>

      {/* Case 1: Photo has already been captured */}
      {photoUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-slate-950 p-2 group shadow-lg">
          <div className="relative aspect-video sm:aspect-square max-h-48 w-full rounded-xl overflow-hidden bg-slate-900">
            <img
              src={photoUrl}
              alt="Plat pris en photo par le client"
              className="w-full h-full object-cover"
            />
            {/* Tag Badge */}
            <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{selectedTag}</span>
            </div>
            {/* Quick Retake overlay button */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  soundFX.playHoverTick();
                  startCamera();
                }}
                className="p-1.5 bg-slate-950/80 hover:bg-slate-900 text-white rounded-lg border border-white/20 text-xs backdrop-blur-md flex items-center gap-1 cursor-pointer transition-colors"
                title="Reprendre la photo"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold">Reprendre</span>
              </button>
            </div>
          </div>

          {/* Tag Selector for Dish */}
          <div className="mt-2 flex flex-wrap gap-1">
            {DISH_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  soundFX.playHoverTick();
                  setSelectedTag(tag);
                }}
                className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : isCameraActive ? (
        /* Case 2: Live Viewfinder Mode */
        <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-slate-950 shadow-2xl space-y-2 p-2">
          <div className="relative aspect-square max-h-64 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Flash Overlay Effect */}
            <AnimatePresence>
              {isFlashing && (
                <motion.div
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white z-20 pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Viewfinder Target Guidelines */}
            <div className="absolute inset-6 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-3 h-3 border-t-2 border-l-2 border-amber-400"></div>
                <div className="w-3 h-3 border-t-2 border-r-2 border-amber-400"></div>
              </div>
              <div className="text-center text-[10px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded-full self-center backdrop-blur-xs">
                Cadrez votre plat ou verre
              </div>
              <div className="flex justify-between">
                <div className="w-3 h-3 border-b-2 border-l-2 border-amber-400"></div>
                <div className="w-3 h-3 border-b-2 border-r-2 border-amber-400"></div>
              </div>
            </div>

            {/* Controls on Top of Viewfinder */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 bg-slate-950/80 hover:bg-slate-900 text-slate-200 rounded-xl border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
                title="Changer de caméra"
              >
                <SwitchCamera className="w-4 h-4 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={closeCamera}
                className="p-2 bg-slate-950/80 hover:bg-slate-900 text-slate-200 rounded-xl border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
                title="Fermer la caméra"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Shutter Button & Tag Selector */}
          <div className="flex items-center justify-between px-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Galerie</span>
            </button>

            {/* Main Shutter Button */}
            <button
              type="button"
              onClick={takeSnapshot}
              className="relative w-14 h-14 rounded-full bg-white p-1 flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
            >
              <div className="w-full h-full rounded-full border-2 border-slate-950 bg-amber-500 flex items-center justify-center text-slate-950">
                <Camera className="w-6 h-6" />
              </div>
            </button>

            <button
              type="button"
              onClick={closeCamera}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        /* Case 3: Initial State with 2 Quick Trigger Buttons */
        <div className="grid grid-cols-2 gap-2">
          {/* Live Camera Button */}
          <button
            type="button"
            onClick={() => startCamera()}
            className="p-3 rounded-2xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/40 text-left transition-all flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Prendre photo
              </div>
              <div className="text-[10px] text-slate-400">
                Caméra en direct
              </div>
            </div>
          </button>

          {/* Gallery / File Picker */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">
                Depuis galerie
              </div>
              <div className="text-[10px] text-slate-400">
                Importer photo
              </div>
            </div>
          </button>
        </div>
      )}

      {cameraError && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
};
