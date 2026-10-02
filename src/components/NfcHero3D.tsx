/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel 3D Interactive NFC Chip & Particle Waves Hero
 * Immersive matte black & gold NFC badge with dynamic electromagnetic wave pulses,
 * mouse parallax reactivity, hardware reflection, and mobile performance optimization.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Radio, Wifi, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NfcHero3D: React.FC = () => {
  const { t, setMode, currentRestaurantId } = useApp();
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isScanned, setIsScanned] = useState(false);

  // Dynamic electromagnetic NFC wave particles on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const waves: Array<{ r: number; maxR: number; speed: number; alpha: number; hue: number }> = [];

    const addWave = () => {
      waves.push({
        r: 60,
        maxR: Math.min(width, height) * 0.48,
        speed: 1.2 + Math.random() * 0.8,
        alpha: 0.7,
        hue: 45 // Amber Gold glow (NFC signal color)
      });
    };

    let tick = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick++;

      if (tick % 65 === 0 && !shouldReduceMotion) {
        addWave();
      }

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw subtle orbital rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 110, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 170, 0, Math.PI * 2);
      ctx.stroke();

      // Render expanding NFC electromagnetic pulses
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += w.speed;
        w.alpha = Math.max(0, 1 - w.r / w.maxR);

        if (w.r >= w.maxR || w.alpha <= 0.01) {
          waves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, w.r, 0, Math.PI * 2);
        
        // Gradient wave border
        const grad = ctx.createRadialGradient(centerX, centerY, w.r - 8, centerX, centerY, w.r + 2);
        grad.addColorStop(0, `rgba(245, 158, 11, 0)`);
        grad.addColorStop(0.7, `rgba(245, 158, 11, ${w.alpha * 0.45})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${w.alpha * 0.6})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 8]);
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [shouldReduceMotion]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleSimulateQuickScan = () => {
    setIsScanned(true);
    setTimeout(() => {
      setIsScanned(false);
      setMode('client');
    }, 900);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center select-none"
    >
      {/* Background Pulse Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* 3D NFC Matte Black Chip */}
      <motion.div
        animate={{
          rotateX: shouldReduceMotion ? 0 : mousePos.y * -26,
          rotateY: shouldReduceMotion ? 0 : mousePos.x * 26,
          scale: isScanned ? 1.08 : isHovered ? 1.04 : 1,
          y: isHovered ? -6 : 0
        }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
        onClick={handleSimulateQuickScan}
        className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 rounded-[2.5rem] bg-gradient-to-b from-[#181d28] via-[#0d121c] to-[#080b12] p-1 shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/15 cursor-pointer group"
      >
        {/* Specular Light Reflection Sweep */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-white/10 via-transparent to-amber-400/10 pointer-events-none" />

        {/* Outer Metallic Ring */}
        <div className="w-full h-full rounded-[2.3rem] bg-[#0c1019] border border-white/10 p-6 flex flex-col items-center justify-between relative overflow-hidden">
          
          {/* Top Status & Frequency */}
          <div className="w-full flex items-center justify-between text-xs text-white/50 tracking-wider">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-amber-400/90 font-semibold uppercase">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              NTAG213 • 13.56MHz
            </span>
            <Wifi className={`w-4 h-4 transition-colors ${isHovered || isScanned ? 'text-amber-400' : 'text-white/40'}`} />
          </div>

          {/* Center Brand Badge & Antenna Coils */}
          <div className="relative flex flex-col items-center justify-center my-auto">
            {/* Concentric Gold Antenna Rings */}
            <div className="absolute w-36 h-36 rounded-full border border-amber-500/20 animate-pulse" />
            <div className="absolute w-28 h-28 rounded-full border border-amber-500/30" />
            
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#222836] to-[#0d121c] border border-white/20 shadow-inner flex items-center justify-center group-hover:border-amber-400/50 transition-all duration-300">
              <Radio className="w-10 h-10 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
            </div>

            <div className="mt-3 text-center">
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                Digi<span className="text-amber-400">feel</span>
              </span>
              <p className="text-[10px] tracking-widest text-white/40 uppercase font-mono mt-0.5">
                Puce Connectée Resto
              </p>
            </div>
          </div>

          {/* Bottom Interactive Scan Trigger */}
          <div className="w-full pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>1 Clic Google</span>
            </div>
            <span className="text-[11px] text-amber-300/90 group-hover:text-amber-200 font-medium flex items-center gap-1 transition-colors">
              <Zap className="w-3 h-3" />
              {t.nfcScanTooltip}
            </span>
          </div>

          {/* Scan Flash Overlay */}
          {isScanned && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-[2.3rem] bg-amber-400/20 backdrop-blur-xs flex items-center justify-center z-20"
            >
              <div className="px-4 py-2 rounded-xl bg-black/80 border border-amber-400/60 text-amber-300 text-xs font-semibold shadow-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                {t.demoScanSimulated}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
