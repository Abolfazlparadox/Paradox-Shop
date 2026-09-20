'use client';

import React, { useEffect } from 'react';
import { useNotificationStore, ToastItem } from '@/stores/notifications';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ToastCard = React.forwardRef<HTMLDivElement, { toast: ToastItem; onDismiss: () => void }>(
  ({ toast, onDismiss }, ref) => {
    useEffect(() => {
      if (!toast.duration || toast.duration <= 0) return;

      const timer = setTimeout(() => {
        onDismiss();
      }, toast.duration);

      return () => clearTimeout(timer);
    }, [toast.duration, onDismiss]);

    const icons = {
      success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
      loading: <Loader2 className="w-4 h-4 text-fg-primary animate-spin shrink-0" />,
    };

    const borders = {
      success: 'border-emerald-500/20',
      error: 'border-rose-500/20',
      warning: 'border-amber-500/20',
      info: 'border-sky-500/20',
      loading: 'border-border-accent',
    };

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.94 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        role={toast.type === 'error' ? 'alert' : 'status'}
        aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        className={cn(
          'relative w-full max-w-sm overflow-hidden rounded-lg bg-bg-elevated/95 backdrop-blur-md border p-3.5 shadow-elevated flex items-start gap-3 pointer-events-auto',
          borders[toast.type]
        )}
      >
        <div className="mt-0.5">{icons[toast.type]}</div>

        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-xs font-semibold font-display text-fg-primary tracking-tight leading-snug">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="mt-0.5 text-xs text-fg-secondary leading-relaxed break-words">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded hover:bg-bg-secondary text-fg-muted hover:text-fg-primary transition-colors -mr-1 -mt-1"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Linear duration indicator */}
        {toast.duration && toast.duration > 0 && (
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: toast.duration / 1000, ease: 'linear' }}
            className={cn(
              'absolute bottom-0 left-0 h-[2px]',
              toast.type === 'success' && 'bg-emerald-500/60',
              toast.type === 'error' && 'bg-rose-500/60',
              toast.type === 'warning' && 'bg-amber-500/60',
              toast.type === 'info' && 'bg-sky-500/60',
              toast.type === 'loading' && 'bg-fg-muted/60'
            )}
          />
        )}
      </motion.div>
    );
  }
);
ToastCard.displayName = 'ToastCard';

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <aside
      aria-label="Notifications"
      className="fixed bottom-5 end-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
}
