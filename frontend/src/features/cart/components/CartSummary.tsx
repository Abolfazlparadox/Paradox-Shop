'use client';

import React from 'react';
import Link from 'next/link';
import { Price } from '@/components/ui/Price';
import { Button } from '@/components/ui/Button';
import { CouponInput } from '@/features/promotions/components/CouponInput';
import { CartAppliedPromotion, CouponValidateResponse } from '@/types/api';
import { ShieldCheck, ArrowRight, Truck, Lock, Sparkles, Tag } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

export interface CartSummaryProps {
  subtotal: string | number;
  discountAmount?: string | number | null;
  couponDiscount?: string | number | null;
  couponCode?: string | null;
  total?: string | number | null;
  savings?: string | number | null;
  appliedPromotions?: CartAppliedPromotion[];
  totalItems: number;
  isLoading?: boolean;
  onApplyCouponSuccess?: (code: string, data: CouponValidateResponse) => void;
  onRemoveCoupon?: () => void;
  className?: string;
}

export function CartSummary({
  subtotal,
  discountAmount,
  couponDiscount,
  couponCode,
  total,
  savings,
  appliedPromotions = [],
  totalItems,
  isLoading,
  onApplyCouponSuccess,
  onRemoveCoupon,
  className,
}: CartSummaryProps) {
  const subtotalNum = Number(subtotal || 0);
  const promoDiscountNum = Number(discountAmount || 0);
  const couponDiscountNum = Number(couponDiscount || 0);
  const totalDiscountNum = promoDiscountNum + couponDiscountNum;

  // Calculate authoritative estimated total if not directly provided
  const finalTotalNum = total !== undefined && total !== null
    ? Math.max(0, Number(total) - couponDiscountNum)
    : Math.max(0, subtotalNum - totalDiscountNum);

  const totalSavingsNum = savings !== undefined && savings !== null
    ? Number(savings) + couponDiscountNum
    : totalDiscountNum;

  return (
    <div
      className={cn(
        'bg-bg-elevated border border-border-subtle rounded-xl p-6 space-y-6 shadow-card sticky top-24',
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <h2 className="text-sm font-semibold font-display text-fg-primary uppercase tracking-wider">
          Order Summary
        </h2>
        {totalSavingsNum > 0 && (
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Save {formatCurrency(totalSavingsNum, 'Rial')}
          </span>
        )}
      </div>

      {/* Coupon Code Section */}
      <div className="pb-4 border-b border-border-subtle/70">
        <CouponInput
          appliedCode={couponCode}
          appliedDiscount={couponDiscountNum > 0 ? couponDiscountNum : null}
          onApplySuccess={onApplyCouponSuccess}
          onRemove={onRemoveCoupon}
          disabled={isLoading || totalItems === 0}
        />
      </div>

      {/* Numerical breakdown */}
      <div className="space-y-3 text-xs font-mono">
        {/* Base Subtotal */}
        <div className="flex items-center justify-between text-fg-secondary">
          <span>Artifacts Subtotal ({totalItems})</span>
          <Price amount={subtotalNum} size="sm" />
        </div>

        {/* Promotion Disount */}
        {promoDiscountNum > 0 && (
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Promotion Discount
            </span>
            <span>-{formatCurrency(promoDiscountNum, 'Rial')}</span>
          </div>
        )}

        {/* Applied Promotion Labels */}
        {appliedPromotions.length > 0 && (
          <div className="ps-4 space-y-1 text-[11px] text-fg-muted">
            {appliedPromotions.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span className="truncate max-w-[180px]">• {p.name}</span>
                <span>-{formatCurrency(p.total_discount, 'Rial')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Coupon Discount */}
        {couponDiscountNum > 0 && (
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Coupon ({couponCode})
            </span>
            <span>-{formatCurrency(couponDiscountNum, 'Rial')}</span>
          </div>
        )}

        {/* Courier Shipping */}
        <div className="flex items-center justify-between text-fg-secondary">
          <span className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-fg-muted" />
            Courier Shipping
          </span>
          <span className="text-fg-muted">Calculated at Checkout</span>
        </div>

        {/* Final Estimated Total */}
        <div className="pt-3 border-t border-border-subtle flex items-baseline justify-between text-fg-primary">
          <span className="font-semibold text-sm">Estimated Total</span>
          <Price amount={finalTotalNum} size="lg" />
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
