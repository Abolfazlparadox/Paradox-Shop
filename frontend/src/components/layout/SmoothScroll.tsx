'use client';

import { useEffect, useRef } from 'react';
import type Lenis from 'lenis';
import { useUIStore } from '@/stores/ui';

export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const { isCartDrawerOpen, isMobileMenuOpen, activeModal } = useUIStore();

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Check if device is primarily touch/coarse pointer
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isTouchDevice) return;

    let isDestroyed = false;
    let rafId: number;
    let lenisInstance: Lenis | null = null;

    import('lenis').then(({ default: LenisClass }) => {
      if (isDestroyed) return;

      lenisInstance = new LenisClass({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5,
      });

      lenisRef.current = lenisInstance;

      function raf(time: number) {
        if (isDestroyed) return;
        lenisInstance?.raf(time);
        rafId = requestAnimationFrame(raf);
      }

      rafId = requestAnimationFrame(raf);
    }).catch((err) => {
      console.warn('Failed to initialize Lenis smooth scroll:', err);
    });

    return () => {
      isDestroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (lenisInstance) {
        lenisInstance.destroy();
      }
      lenisRef.current = null;
    };
  }, []);

  // Pause Lenis during modal / drawer open state so standard overflow locks work correctly
  useEffect(() => {
    if (!lenisRef.current) return;
    const isOverlayOpen = isCartDrawerOpen || isMobileMenuOpen || Boolean(activeModal);
    if (isOverlayOpen) {
      lenisRef.current.stop();
    } else {
      lenisRef.current.start();
    }
  }, [isCartDrawerOpen, isMobileMenuOpen, activeModal]);

  return null;
}
