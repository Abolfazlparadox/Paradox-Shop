'use client';

import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="fixed top-0 inset-x-0 h-[2px] z-50 pointer-events-none">
      <motion.div
        style={{ scaleX }}
        className="h-full bg-gradient-to-r from-fg-muted via-accent to-fg-primary origin-left shadow-glow opacity-85"
      />
    </div>
  );
}
