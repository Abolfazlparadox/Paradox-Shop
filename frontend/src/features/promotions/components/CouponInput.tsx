'use client';

import React, { useState } from 'react';
import { useValidateCoupon } from '../queries/usePromotions';
import { CouponValidateResponse } from '@/types/api';
import { notify } from '@/stores/notifications';
import { normalizeApiError } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui/Button';
import { Tag, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export interface CouponInputProps {
  appliedCode?: string | null;
  appliedDiscount?: string | number | null;
  onApplySuccess?: (code: string, data: CouponValidateResponse) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function CouponInput({
  appliedCode,
  appliedDiscount,
  onApplySuccess,
  onRemove,
  disabled = false,
  className,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const validateMutation = useValidateCoupon();

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setLocalError(null);

    try {
      const response = await validateMutation.mutateAsync({ code: cleanCode });
      if (response.valid) {
        setCode('');
        const savedText = response.discount_amount
          ? ` — you saved ${formatCurrency(response.discount_amount, 'Rial')}`
          : '';
        notify.success('Coupon Applied', `Promo code "${cleanCode}" applied${savedText}.`);
        onApplySuccess?.(cleanCode, response);
      } else {
        const errorReason = response.reason || 'This coupon code is not valid.';
        setLocalError(errorReason);
        notify.error('Coupon Rejected', errorReason);
      }
    } catch (err: any) {
      const parsed = normalizeApiError(err);
      const msg = parsed.detail || err?.message || 'Failed to validate coupon code.';
      setLocalError(msg);
      notify.error('Invalid Coupon', msg);
    }
  };

  const handleRemove = () => {
    setLocalError(null);
    setCode('');
    onRemove?.();
    notify.info('Coupon Removed', 'The promotional coupon has been detached.');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor="coupon-input"
          className="text-xs font-mono font-medium text-fg-secondary flex items-center gap-1.5"
        >
          <Tag className="w-3.5 h-3.5 text-fg-muted" />
          <span>Promotional Voucher</span>
        </label>
      </div>

      {/* When Coupon is Applied */}
      <AnimatePresence mode="wait">
        {appliedCode ? (
          <motion.div
            key="applied-badge"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono shadow-subtle"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="min-w-0 truncate">
                <span className="font-bold tracking-wider uppercase text-fg-primary">
                  {appliedCode}
                </span>
                {appliedDiscount && Number(appliedDiscount) > 0 && (
                  <span className="ms-2 text-emerald-400 font-medium">
                    (-{formatCurrency(appliedDiscount, 'Rial')})
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="p-1 text-fg-muted hover:text-rose-400 rounded transition-colors focus-ring cursor-pointer"
              aria-label="Remove coupon"
              title="Remove coupon"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="input-form"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleApply}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                id="coupon-input"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (localError) setLocalError(null);
                }}
                placeholder="PROMO CODE (e.g. VIP20)"
                disabled={disabled || validateMutation.isPending}
                className={cn(
                  'w-full h-9 px-3 text-xs font-mono uppercase rounded-md bg-bg-secondary border border-border-subtle text-fg-primary placeholder:text-fg-muted placeholder:normal-case focus:border-border-accent focus:outline-none transition-colors',
                  localError && 'border-rose-500/50 focus:border-rose-500'
                )}
              />
            </div>

            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!code.trim() || disabled || validateMutation.isPending}
              isLoading={validateMutation.isPending}
              className="h-9 px-4 text-xs font-mono uppercase tracking-wider shrink-0"
            >
              Apply
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Local Error feedback if rejected */}
      {localError && !appliedCode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 pt-0.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{localError}</span>
        </motion.div>
      )}
    </div>
  );
}
