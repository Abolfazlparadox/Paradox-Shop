'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export type CursorState = 'default' | 'link' | 'button' | 'view' | 'text' | 'drag' | 'disabled';

export function CustomCursor() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for outer trailing follower ring
  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const ringX = useSpring(mouseX, springConfig);
  const ringY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Only enable on precise pointer devices (desktop mouse) and when not reduced motion
    const hasFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!hasFinePointer || prefersReducedMotion) {
      setIsEnabled(false);
      document.documentElement.classList.remove('has-custom-cursor');
      return;
    }

    setIsEnabled(true);
    document.documentElement.classList.add('has-custom-cursor');

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    const handleElementHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check for disabled elements
      const disabledEl = target.closest('button:disabled, [aria-disabled="true"], input:disabled, select:disabled');
      if (disabledEl) {
        setCursorState('disabled');
        return;
      }

      // Check for custom data-cursor attributes
      const customEl = target.closest('[data-cursor]');
      if (customEl) {
        const attr = customEl.getAttribute('data-cursor') as CursorState;
        if (attr && ['link', 'button', 'view', 'text', 'drag', 'disabled'].includes(attr)) {
          setCursorState(attr);
          return;
        }
      }

      // Check for text inputs
      const textInput = target.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      if (textInput) {
        setCursorState('text');
        return;
      }

      // Check for buttons
      const buttonEl = target.closest('button, [role="button"], input[type="submit"], input[type="button"]');
      if (buttonEl) {
        setCursorState('button');
        return;
      }

      // Check for links
      const linkEl = target.closest('a, [role="link"]');
      if (linkEl) {
        setCursorState('link');
        return;
      }

      // Check for draggable elements
      const dragEl = target.closest('[draggable="true"], .cursor-grab, .cursor-move');
      if (dragEl) {
        setCursorState('drag');
        return;
      }

      setCursorState('default');
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleElementHover, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleElementHover);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isEnabled || !isVisible) return null;

  // Visual scaling and styling based on active state
  const getFollowerScale = () => {
    switch (cursorState) {
      case 'link':
        return 1.8;
      case 'button':
        return 2.2;
      case 'view':
        return 2.6;
      case 'drag':
        return 2.0;
      case 'text':
        return 0.5;
      case 'disabled':
        return 0.8;
      case 'default':
      default:
        return 1;
    }
  };

  const getFollowerOpacity = () => {
    switch (cursorState) {
      case 'text':
        return 0.2;
      case 'disabled':
        return 0.35;
      case 'view':
      case 'button':
      case 'link':
        return 0.85;
      case 'default':
      default:
        return 0.55;
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* Inner Precision Dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-accent pointer-events-none mix-blend-difference"
      />

      {/* Outer Contextual Follower Ring */}
      <motion.div
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: getFollowerScale(),
          opacity: getFollowerOpacity(),
          borderColor: cursorState === 'disabled' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-white/80 pointer-events-none mix-blend-difference flex items-center justify-center text-[8px] font-mono font-bold tracking-tighter"
      >
        {cursorState === 'view' && (
          <span className="text-[7px] text-white tracking-tighter uppercase font-mono">
            VIEW
          </span>
        )}
        {cursorState === 'drag' && (
          <span className="text-[9px] text-white tracking-tighter">
            ↕
          </span>
        )}
      </motion.div>
    </div>
  );
}
