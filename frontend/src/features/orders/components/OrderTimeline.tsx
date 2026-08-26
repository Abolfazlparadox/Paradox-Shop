'use client';

import React from 'react';
import { OrderStatus, Shipment } from '@/types/api';
import {
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface OrderTimelineProps {
  status: OrderStatus;
  shipment?: Shipment | null;
  className?: string;
}

interface TimelineStep {
  key: OrderStatus;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

const LIFECYCLE_STEPS: TimelineStep[] = [
  {
    key: 'PENDING',
    label: 'Order Placed',
    sublabel: 'Order registered in vault',
    icon: Clock,
  },
  {
    key: 'PROCESSING',
    label: 'Processing',
    sublabel: 'Payment verified & staged',
    icon: Package,
  },
  {
    key: 'SHIPPED',
    label: 'Shipped',
    sublabel: 'In transit with courier',
    icon: Truck,
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    sublabel: 'Handed over to patron',
    icon: CheckCircle2,
  },
];

export function OrderTimeline({ status, shipment, className }: OrderTimelineProps) {
  const normalizedStatus = (status || '').toUpperCase() as OrderStatus;

  if (normalizedStatus === 'CANCELLED') {
    return (
      <div
        className={cn(
          'p-5 rounded-2xl bg-status-error/10 border border-status-error/20 flex items-start sm:items-center gap-3.5 text-status-error',
          className
        )}
      >
        <XCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
        <div className="space-y-0.5">
          <span className="text-xs font-bold font-display uppercase tracking-wider block">
            Order Cancelled & Restocked
          </span>
          <span className="text-[11px] text-fg-secondary block leading-relaxed">
            This consignment was cancelled. Any reserved vault inventory has been returned to stock.
          </span>
        </div>
      </div>
    );
  }

  if (normalizedStatus === 'REFUNDED') {
    return (
      <div
        className={cn(
          'p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start sm:items-center gap-3.5 text-amber-500',
          className
        )}
      >
        <RotateCcw className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
        <div className="space-y-0.5">
          <span className="text-xs font-bold font-display uppercase tracking-wider block">
            Order Fully Refunded
          </span>
          <span className="text-[11px] text-fg-secondary block leading-relaxed">
            Settlement reverse transaction processed. Funds returned to source payment account.
          </span>
        </div>
      </div>
    );
  }

  const getStepIndex = (s: string) => {
    switch (s.toUpperCase()) {
      case 'PENDING':
        return 0;
      case 'PROCESSING':
        return 1;
      case 'SHIPPED':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(normalizedStatus);
  const isAllCompleted = currentIndex === 3;

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop Stepper (>= 640px) */}
      <div className="hidden sm:block py-3">
        <div className="relative">
          {/* Progress Track Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-border-subtle z-0" />
          <div
            className="absolute top-4 left-6 h-0.5 bg-amber-500 transition-all duration-500 z-0"
            style={{
              width: `calc(${(currentIndex / (LIFECYCLE_STEPS.length - 1)) * 100}% - 48px)`,
            }}
          />

          <div className="grid grid-cols-4 gap-2 relative z-10">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isCompleted = idx < currentIndex || (idx === currentIndex && isAllCompleted);
              const isCurrent = idx === currentIndex && !isAllCompleted;
              const isPendingFuture = idx > currentIndex;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 text-xs font-mono shrink-0',
                      isCurrent
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-4 ring-amber-500/20'
                        : isCompleted
                        ? 'bg-accent text-accent-fg border-accent'
                        : 'bg-bg-elevated text-fg-muted border-border-subtle'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-0.5 max-w-[140px]">
                    <span
                      className={cn(
                        'text-xs font-semibold font-display tracking-tight block transition-colors',
                        isCurrent
                          ? 'text-amber-600 dark:text-amber-400 font-bold'
                          : isCompleted
                          ? 'text-fg-primary'
                          : 'text-fg-muted'
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-fg-muted font-mono leading-tight block">
                      {step.sublabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Stepper (< 640px) — Clean Connected Vertical List */}
      <div className="sm:hidden space-y-4 py-1">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex || (idx === currentIndex && isAllCompleted);
          const isCurrent = idx === currentIndex && !isAllCompleted;
          const isLast = idx === LIFECYCLE_STEPS.length - 1;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-start gap-3.5 relative">
              {/* Vertical connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute top-7 left-3.5 w-0.5 h-[calc(100%+8px)] -translate-x-1/2 transition-colors',
                    idx < currentIndex ? 'bg-amber-500' : 'bg-border-subtle'
                  )}
                />
              )}

              <div
                className={cn(
                  'w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 text-xs font-mono shrink-0 relative z-10',
                  isCurrent
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-2 ring-amber-500/20'
                    : isCompleted
                    ? 'bg-accent text-accent-fg border-accent'
                    : 'bg-bg-elevated text-fg-muted border-border-subtle'
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>

              <div className="space-y-0.5 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-semibold font-display tracking-tight block',
                      isCurrent
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : isCompleted
                        ? 'text-fg-primary'
                        : 'text-fg-muted'
                    )}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-fg-muted leading-tight">
                  {step.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
