'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export type RevealVariant = 'fade-up' | 'fade-down' | 'fade-in' | 'scale-up' | 'clip-reveal';

export interface ScrollRevealProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  once?: boolean;
  margin?: string;
  className?: string;
}

export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 0.5,
  once = true,
  margin = '-40px',
  className,
  ...props
}: ScrollRevealProps) {
  const variants = {
    'fade-up': {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    'fade-down': {
      hidden: { opacity: 0, y: -20 },
      visible: { opacity: 1, y: 0 },
    },
    'fade-in': {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    'scale-up': {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
    },
    'clip-reveal': {
      hidden: { opacity: 0, clipPath: 'inset(8% 0 8% 0)' },
      visible: { opacity: 1, clipPath: 'inset(0% 0 0% 0)' },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: margin as any }}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // MD3 Emphasized / Out-Expo
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
