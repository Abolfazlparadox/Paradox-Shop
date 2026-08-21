'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface MouseSpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  size?: number;
  className?: string;
}

export function MouseSpotlight({
  children,
  size = 550,
  className,
  ...props
}: MouseSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check reduced motion & coarse pointers
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(pointer: coarse) or (hover: none)').matches;
    if (prefersReducedMotion || isTouchDevice) return;

    const el = containerRef.current;
    const spot = spotlightRef.current;
    if (!el || !spot) return;

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spot.style.setProperty('--spot-x', `${x}px`);
        spot.style.setProperty('--spot-y', `${y}px`);
        rafId = null;
      });
    };

    const handleMouseEnter = () => {
      spot.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      spot.style.opacity = '0';
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      {/* High-Performance Theme-Aware Radial Spotlight Layer */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0 opacity-0"
        style={{
          background: `radial-gradient(${size}px circle at var(--spot-x, -1000px) var(--spot-y, -1000px), var(--spotlight-glow), transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
