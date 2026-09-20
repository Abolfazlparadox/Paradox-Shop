'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  className,
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const slideDirection = side === 'right' ? { x: '100%' } : { x: '-100%' };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-hidden"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className={cn('fixed inset-y-0 flex max-w-full', side === 'right' ? 'end-0' : 'start-0')}>
            <motion.div
              initial={slideDirection}
              animate={{ x: 0 }}
              exit={slideDirection}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'w-screen max-w-md bg-bg-elevated border-border-subtle shadow-elevated flex flex-col',
                side === 'right' ? 'border-s' : 'border-e',
                className
              )}
            >
              <div className="flex items-center justify-between p-5 border-b border-border-subtle/60">
                {title && <h2 className="text-base font-semibold text-fg-primary font-display">{title}</h2>}
                <button
                  onClick={onClose}
                  className="text-fg-muted hover:text-fg-primary p-1.5 rounded-md transition-colors focus-ring ms-auto"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
