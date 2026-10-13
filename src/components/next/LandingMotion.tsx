'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Défilement fluide (Lenis) synchronisé avec GSAP ScrollTrigger + apparitions au scroll. */
export function LandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-next-reveal]').forEach(element => {
        gsap.fromTo(element,
          { opacity: 0, y: 40, filter: 'blur(8px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true }
          });
      });
      gsap.fromTo('.next-mockup-bars i',
        { scaleY: 0, transformOrigin: 'bottom' },
        { scaleY: 1, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.08, delay: 0.5 });
      gsap.to('.next-home-hero__brandmark', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.next-home-hero', start: 'top top', end: 'bottom top', scrub: true } });
    });

    return () => {
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
