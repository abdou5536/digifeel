import React, { useEffect, useRef } from 'react';

export const ScrollMoon: React.FC = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    const updatePosition = () => {
      animationFrame = 0;
      const track = trackRef.current;
      const moon = moonRef.current;
      if (!track || !moon) return;

      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0
        ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
        : 0;
      moon.style.top = `${(1 - progress) * 100}%`;
      track.dataset.progress = progress.toFixed(3);
    };

    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.documentElement);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      observer.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div ref={trackRef} className="scroll-moon" aria-hidden="true">
      <span className="scroll-moon__orbit" />
      <span ref={moonRef} className="scroll-moon__body">
        <span className="scroll-moon__crater scroll-moon__crater--one" />
        <span className="scroll-moon__crater scroll-moon__crater--two" />
      </span>
    </div>
  );
};
