'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalAppLoader() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dismiss as an initial overlay on client mount without blocking LCP or waiting for external assets
    const frameId = requestAnimationFrame(() => {
      setIsLoaded(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          key="global-app-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-primary select-none pointer-events-none"
        >
          <div className="relative flex flex-col items-center gap-6">
            {/* Penrose-Inspired Impossible Monolith Geometry */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl animate-pulse" />

              <svg
                viewBox="0 0 100 100"
                className="w-16 h-16 text-fg-primary stroke-current fill-none stroke-[1.5]"
              >
                <polygon
                  points="50,10 90,80 10,80"
                  className="stroke-accent opacity-80"
                />
                <polygon
                  points="50,28 76,74 24,74"
                  strokeDasharray="3 3"
                  className="stroke-fg-muted opacity-50"
                />
                <circle cx="50" cy="56" r="2.5" className="fill-accent" />
              </svg>
            </div>

            {/* Typography & Status Lockup */}
            <div className="text-center space-y-1.5">
              <div className="font-display font-bold text-sm tracking-[0.25em] text-fg-primary">
                PARADOX
              </div>
              <div className="text-[10px] font-mono tracking-widest text-fg-muted uppercase flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                INITIALIZING ARTIFACTS
              </div>
            </div>

            {/* Precision Technical Progress Bar */}
            <div className="w-36 h-[1.5px] bg-border-subtle rounded-full overflow-hidden relative">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: 'easeInOut',
                }}
                className="h-full w-1/2 bg-gradient-to-r from-transparent via-accent to-transparent"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
