'use client';

import React, { useState, useEffect } from 'react';
import { AdminPromotion } from '@/types/admin';
import { X, Sparkles, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';
import { normalizeApiError } from '@/lib/api/client';

interface PromotionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion?: AdminPromotion | null;
  onSave: (data: Partial<AdminPromotion>) => Promise<void>;
}

export function PromotionBuilderModal({
  isOpen,
  onClose,
  promotion,
  onSave,
}: PromotionBuilderModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('20');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [priority, setPriority] = useState<string>('1');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (promotion) {
      setName(promotion.name || '');
      setSlug(promotion.slug || '');
      setDescription(promotion.description || '');
      setDiscountType(
        promotion.discount_type?.toUpperCase().includes('FIXED') ? 'FIXED_AMOUNT' : 'PERCENTAGE'
      );
      setDiscountValue(promotion.discount_value?.toString() || '0');
      setMaxDiscountAmount(
        promotion.max_discount_amount ? promotion.max_discount_amount.toString() : ''
      );
      setPriority(promotion.priority !== undefined ? promotion.priority.toString() : '1');
      setStartAt(promotion.start_at ? promotion.start_at.slice(0, 16) : '');
      setEndAt(promotion.end_at ? promotion.end_at.slice(0, 16) : '');
      setIsActive(promotion.is_active !== undefined ? promotion.is_active : true);
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setDiscountType('PERCENTAGE');
      setDiscountValue('20');
      setMaxDiscountAmount('');
      setPriority('1');
      setStartAt('');
      setEndAt('');
      setIsActive(true);
    }
    setErrorMsg(null);
  }, [promotion, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!promotion) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Promotion name is required.');
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
      const payload: any = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        discount_type: normalizedType,
        discount_value: val,
        max_discount_amount:
          discountType === 'PERCENTAGE' && maxDiscountAmount.trim()
            ? parseFloat(maxDiscountAmount)
            : null,
        priority: priority.trim() ? parseInt(priority, 10) : 1,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        is_active: isActive,
      };

      await onSave(payload);
      notify.success(
        promotion ? 'Promotion Updated' : 'Promotion Created',
        `Campaign '${name}' is now configured.`
      );
      onClose();
    } catch (err: any) {
      const parsed = normalizeApiError(err);
      const msg = parsed.detail || err?.message || 'Failed to configure promotion rule.';
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold font-display text-fg-primary">
                {promotion ? 'Edit Promotion Campaign' : 'Create Automatic Promotion Rule'}
              </div>
              <div className="text-[10px] font-mono text-fg-muted">
                Applied automatically to eligible artifacts during pricing evaluation
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

          {/* Name & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Autumn Flash Sale 20%"
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-semibold text-fg-primary focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                URL Identifier / Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="autumn-flash-sale-20"
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-emerald-500/80"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-fg-muted mb-1">
              Public Description / Subtitle
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Exclusive 20% discount on all Atelier Timepieces"
              className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-emerald-500/80 resize-none"
            />
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
                className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-emerald-500/80"
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
                className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-emerald-500/80"
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
                className="w-full px-3 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-emerald-500/80 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Priority & Validity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Evaluation Priority (1 = High)
              </label>
              <input
                type="number"
                min="1"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Start Timestamp
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-emerald-500/80"
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
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-emerald-500/80"
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
                Active promotions are immediately factored into catalog and cart queries
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
              className="text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              {promotion ? 'Save Modifications' : 'Create Promotion'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
