'use client';

import React, { useState } from 'react';
import { AdminCoupon } from '@/types/admin';
import { X, Tag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';

interface CouponBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AdminCoupon>) => Promise<void>;
}

export function CouponBuilderModal({ isOpen, onClose, onSave }: CouponBuilderModalProps) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrderValue, setMinOrderValue] = useState<number>(5000000);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_value: Number(minOrderValue),
        usage_limit: Number(usageLimit),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      notify.success('Coupon Manifested', `Code ${code.toUpperCase()} is active.`);
      onClose();
    } catch {
      notify.error('Creation Failed', 'Failed to generate promotional code.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-mono font-bold text-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold font-display text-fg-primary">Issue Discount Code</div>
              <div className="text-[10px] font-mono text-fg-muted">Generate cryptographic promotion</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-fg-muted mb-1">
              Promotional Coupon Code *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. VIP-SUMMER-20"
              className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono font-bold uppercase text-fg-primary focus:outline-none focus:border-cyan-500 tracking-wider"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Discount Model
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (Toman)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                {discountType === 'PERCENTAGE' ? 'Discount Value (%)' : 'Amount (Toman)'} *
              </label>
              <input
                type="number"
                min="1"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Minimum Cart Value
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Max Usage Limit
              </label>
              <input
                type="number"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-fg-muted mb-1">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-border-subtle hover:bg-bg-secondary text-fg-primary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-950 font-semibold"
            >
              Activate Coupon
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
