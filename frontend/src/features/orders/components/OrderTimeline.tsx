'use client';

import React from 'react';
import { OrderStatus } from '@/types/api';
import { Check, Clock, Package, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface OrderTimelineProps {
  status: OrderStatus;
  className?: string;
}

const STEPS: Array<{ key: OrderStatus; label: string; icon: React.ElementType }> = [
  { key: 'PENDING', label: 'Order Placed', icon: Clock },
  { key: 'PROCESSING', label: 'Payment Confirmed', icon: Package },
  { key: 'SHIPPED', label: 'Dispatched', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

export function OrderTimeline({ status, className }: OrderTimelineProps) {
  if (status === 'CANCELLED') {
    return (
      <div className={cn('p-4 rounded-lg bg-status-error/10 border border-status-error/20 flex items-center gap-3 text-status-error', className)}>
        <XCircle className="w-5 h-5 shrink-0" />
        <div>
          <span className="text-xs font-bold font-display uppercase tracking-wider block">
            Order Cancelled
          </span>
          <span className="text-[11px] text-fg-secondary">
            This order has been cancelled and any reserved stock has been restored.
          </span>
        </div>
      </div>
    );
  }

  const getStepIndex = (s: OrderStatus) => {
    switch (s) {
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

  const currentIndex = getStepIndex(status);

  return (
    <div className={cn('py-4', className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 start-4 end-4 -translate-y-1/2 h-0.5 bg-border-subtle z-0" />
        
        {/* Active Progress Bar */}
        <div
          className="absolute top-1/2 start-4 -translate-y-1/2 h-0.5 bg-accent transition-all duration-500 z-0"
          style={{
            width: `calc(${(currentIndex / (STEPS.length - 1)) * 100}% - 2rem)`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10 space-y-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full border flex items-center justify-center transition-colors text-xs font-mono',
                  isCompleted
                    ? 'bg-accent text-accent-fg border-accent shadow-subtle'
                    : 'bg-bg-elevated text-fg-muted border-border-subtle'
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              <span
                className={cn(
                  'text-[10px] font-mono uppercase tracking-wider',
                  isCurrent
                    ? 'text-fg-primary font-bold'
                    : isCompleted
                    ? 'text-fg-secondary'
                    : 'text-fg-muted'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
