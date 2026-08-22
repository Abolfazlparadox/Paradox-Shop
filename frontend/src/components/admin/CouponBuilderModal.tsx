'use client';

import React, { useState } from 'react';
import { AdminCoupon } from '@/types/admin';
import { X, Tag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold font-display text-white">Create Promotional Code</div>
              <div className="text-[10px] font-mono text-slate-400">Configure discount rules and redemption limits</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-slate-300">
              Coupon Identifier / Code
            </label>
            <Input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PARADOX-SUMMER26"
              className="bg-slate-950/60 border-slate-800 text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-slate-300">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (Toman)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-slate-300">
                Discount Value {discountType === 'PERCENTAGE' ? '(%)' : '(Toman)'}
              </label>
              <Input
                type="number"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="bg-slate-950/60 border-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-slate-300">
                Min Order Value (Toman)
              </label>
              <Input
                type="number"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(Number(e.target.value))}
                className="bg-slate-950/60 border-slate-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-slate-300">
                Total Usage Limit
              </label>
              <Input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(Number(e.target.value))}
                className="bg-slate-950/60 border-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-slate-300">
              Expiration Date (Optional)
            </label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="bg-slate-950/60 border-slate-800 text-xs font-mono"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-800/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isSaving}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold"
            >
              Activate Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
