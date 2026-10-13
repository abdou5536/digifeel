'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useMotionValue, useTransform, motion } from 'motion/react';

/** Compteur animé (style React Bits « Count Up »). */
export function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const text = useTransform(value, latest => `${latest.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (inView) animate(value, to, { duration: 1.6, ease: 'easeOut' });
  }, [inView, to, value]);

  return <motion.span ref={ref}>{text}</motion.span>;
}

/** Carte à halo qui suit le curseur (style React Bits « Spotlight Card »). */
export function SpotlightCard({ children, className = '', ...rest }: React.HTMLAttributes<HTMLElement> & { 'data-next-reveal'?: boolean }) {
  return <article
    className={`spotlight-card ${className}`}
    onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    }}
    {...rest}
  >{children}</article>;
}

/** Texte à reflet animé (style React Bits « Shiny Text »). */
export function ShinyText({ children }: { children: React.ReactNode }) {
  return <span className="shiny-text">{children}</span>;
}
