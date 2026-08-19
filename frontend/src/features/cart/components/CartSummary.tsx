'use client';

import React from 'react';
import Link from 'next/link';
import { Price } from '@/components/ui/Price';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight, Truck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CartSummaryProps {
  subtotal: string;
  totalItems: number;
  isLoading?: boolean;
  className?: string;
}

export function CartSummary({
  subtotal,
  totalItems,
  isLoading,
  className,
}: CartSummaryProps) {
  return (
    <div
      className={cn(
        'bg-bg-elevated border border-border-subtle rounded-xl p-6 space-y-6 shadow-card sticky top-24',
        className
      )}
    >
      <h2 className="text-sm font-semibold font-display text-fg-primary uppercase tracking-wider pb-3 border-b border-border-subtle">
        Order Summary
      </h2>

      {/* Numerical breakdown */}
      <div className="space-y-3 text-xs font-mono">
        <div className="flex items-center justify-between text-fg-secondary">
          <span>Artifacts Subtotal ({totalItems})</span>
          <Price amount={subtotal} size="sm" />
        </div>

        <div className="flex items-center justify-between text-fg-secondary">
          <span className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-fg-muted" />
            Courier Shipping
          </span>
          <span className="text-fg-muted">Calculated at Checkout</span>
        </div>

        <div className="pt-3 border-t border-border-subtle flex items-baseline justify-between text-fg-primary">
          <span className="font-semibold text-sm">Estimated Total</span>
          <Price amount={subtotal} size="lg" />
        </div>
      </div>

      {/* Checkout CTA */}
      <Link href="/checkout" className="block w-full">
        <Button
          size="lg"
          disabled={totalItems === 0 || isLoading}
          className="w-full text-xs font-semibold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Proceed to Checkout
        </Button>
      </Link>

      {/* Guarantees */}
      <div className="pt-4 border-t border-border-subtle/60 space-y-2 text-[11px] font-mono text-fg-muted">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Atomic Stock Lock on Order Creation</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>100% Genuine Verified Materials</span>
        </div>
      </div>
    </div>
  );
}
