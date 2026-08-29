'use client';

import React, { useState, useEffect } from 'react';
import { AdminCoupon } from '@/types/admin';
import { X, Tag, Sparkles, AlertCircle, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';
import { normalizeApiError } from '@/lib/api/client';

interface CouponBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon?: AdminCoupon | null;
  onSave: (data: Partial<AdminCoupon>) => Promise<void>;
}

export function CouponBuilderModal({
  isOpen,
  onClose,
  coupon,
  onSave,
}: CouponBuilderModalProps) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('15');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [minOrderSubtotal, setMinOrderSubtotal] = useState<string>('0');
  const [totalUsageLimit, setTotalUsageLimit] = useState<string>('');
  const [perUserUsageLimit, setPerUserUsageLimit] = useState<string>('1');
  const [audienceType, setAudienceType] = useState<'ALL_USERS' | 'SPECIFIC_USERS'>('ALL_USERS');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code || '');
      setDescription(coupon.description || '');
      setDiscountType(
        coupon.discount_type?.toUpperCase().includes('FIXED') ? 'FIXED_AMOUNT' : 'PERCENTAGE'
      );
      setDiscountValue(coupon.discount_value?.toString() || '0');
      setMaxDiscountAmount(coupon.max_discount_amount ? coupon.max_discount_amount.toString() : '');
      setMinOrderSubtotal(coupon.min_order_subtotal ? coupon.min_order_subtotal.toString() : '0');
      setTotalUsageLimit(coupon.total_usage_limit ? coupon.total_usage_limit.toString() : '');
      setPerUserUsageLimit(coupon.per_user_usage_limit ? coupon.per_user_usage_limit.toString() : '1');
      setAudienceType(coupon.audience_type || 'ALL_USERS');
      setStartAt(coupon.start_at ? coupon.start_at.slice(0, 16) : '');
      setEndAt(coupon.end_at ? coupon.end_at.slice(0, 16) : '');
      setIsActive(coupon.is_active !== undefined ? coupon.is_active : true);
    } else {
      setCode('');
      setDescription('');
      setDiscountType('PERCENTAGE');
      setDiscountValue('15');
      setMaxDiscountAmount('');
      setMinOrderSubtotal('0');
      setTotalUsageLimit('');
      setPerUserUsageLimit('1');
      setAudienceType('ALL_USERS');
      setStartAt('');
      setEndAt('');
      setIsActive(true);
    }
    setErrorMsg(null);
  }, [coupon, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Voucher code is required.');
      return;
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Discount value must be greater than zero.');
      return;
    }

    if (discountType === 'PERCENTAGE' && val > 100) {
      setErrorMsg('Percentage discount cannot exceed 100%.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const normalizedType = discountType.toLowerCase() === 'fixed_amount' ? 'fixed_amount' : 'percentage';
      const normalizedAudience = audienceType === 'SPECIFIC_USERS' ? 'specific_users' : 'all';

      const payload: any = {
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discount_type: normalizedType,
        discount_value: val,
        max_discount_amount:
          discountType === 'PERCENTAGE' && maxDiscountAmount.trim()
            ? parseFloat(maxDiscountAmount)
            : null,
        min_order_subtotal: minOrderSubtotal.trim() ? parseFloat(minOrderSubtotal) : 0,
        total_usage_limit: totalUsageLimit.trim() ? parseInt(totalUsageLimit, 10) : null,
        per_user_usage_limit: perUserUsageLimit.trim() ? parseInt(perUserUsageLimit, 10) : 1,
        audience_type: normalizedAudience,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        is_active: isActive,
      };

      await onSave(payload);
      notify.success(
        coupon ? 'Voucher Updated' : 'Voucher Created',
        `Coupon code '${code.toUpperCase()}' is configured.`
      );
      onClose();
    } catch (err: any) {
      const parsed = normalizeApiError(err);
      const msg = parsed.detail || err?.message || 'Failed to configure promotional coupon.';
      setErrorMsg(msg);
      notify.error('Action Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold font-display text-fg-primary">
                {coupon ? 'Edit Voucher Rules' : 'Issue New Promotional Voucher'}
              </div>
              <div className="text-[10px] font-mono text-fg-muted">
                Cryptographic discount token with usage limits & audience policies
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Code & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Coupon Code * (Uppercase)
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. VIP-SUMMER-20"
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono font-bold uppercase text-fg-primary focus:outline-none focus:border-amber-500/80 tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Description / Internal Label
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. VIP Private Club Welcome"
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Discount Model
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')
                }
                className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (Rial)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Discount Value * {discountType === 'PERCENTAGE' ? '(%)' : '(Rial)'}
              </label>
              <input
                type="number"
                min="1"
                max={discountType === 'PERCENTAGE' ? 100 : undefined}
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Max Discount Cap (Rial)
              </label>
              <input
                type="number"
                min="0"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                placeholder="No limit"
                disabled={discountType !== 'PERCENTAGE'}
                className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Limits & Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Minimum Order Subtotal (Rial)
              </label>
              <input
                type="number"
                min="0"
                value={minOrderSubtotal}
                onChange={(e) => setMinOrderSubtotal(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Global Usage Limit
              </label>
              <input
                type="number"
                min="1"
                value={totalUsageLimit}
                onChange={(e) => setTotalUsageLimit(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Per-User Limit
              </label>
              <input
                type="number"
                min="1"
                value={perUserUsageLimit}
                onChange={(e) => setPerUserUsageLimit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {/* Audience & Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Audience Scope
              </label>
              <select
                value={audienceType}
                onChange={(e) =>
                  setAudienceType(e.target.value as 'ALL_USERS' | 'SPECIFIC_USERS')
                }
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              >
                <option value="ALL_USERS">All Patrons (Public)</option>
                <option value="SPECIFIC_USERS">Specific User List</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Start Timestamp
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                End Timestamp
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary/40 border border-border-subtle">
            <div>
              <div className="text-xs font-semibold text-fg-primary font-display">
                Campaign Activation Status
              </div>
              <div className="text-[11px] font-mono text-fg-muted">
                Inactive vouchers are immediately rejected by validation engine
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 border border-border-subtle"></div>
            </label>
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-mono"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="text-xs font-mono font-semibold"
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              {coupon ? 'Save Modifications' : 'Issue Voucher'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
