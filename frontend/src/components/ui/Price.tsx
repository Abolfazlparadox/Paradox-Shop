import React from 'react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

export interface PriceProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: string | number;
  originalAmount?: string | number | null;
  currency?: 'Rial' | 'Toman';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiscountBadge?: boolean;
}

export function Price({
  amount,
  originalAmount,
  currency = 'Rial',
  size = 'md',
  showDiscountBadge = true,
  className,
  ...props
}: PriceProps) {
  const currentNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  const origNum = originalAmount
    ? typeof originalAmount === 'string'
      ? parseFloat(originalAmount)
      : originalAmount
    : null;

  const hasDiscount = origNum !== null && origNum > currentNum;
  const discountPercent = hasDiscount
    ? Math.round(((origNum - currentNum) / origNum) * 100)
    : 0;

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-semibold',
    xl: 'text-xl font-bold font-display',
  };

  return (
    <div className={cn('inline-flex items-baseline gap-2 flex-wrap', className)} {...props}>
      {/* Current Price */}
      <span className={cn('font-mono font-medium tracking-tight text-fg-primary', sizes[size])}>
        {formatCurrency(amount, currency)}
      </span>

      {/* Strikethrough Original Price */}
      {hasDiscount && (
        <span className="text-xs font-mono text-fg-muted line-through">
          {formatCurrency(originalAmount, currency)}
        </span>
      )}

      {/* Discount Badge */}
      {hasDiscount && showDiscountBadge && (
        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/20">
          -{discountPercent}%
        </span>
      )}
    </div>
  );
}
