'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useAdminCouponUsages } from '@/hooks/useAdminData';
import { AdminCoupon } from '@/types/admin';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Tag, Users, ShoppingBag, Clock, Loader2, AlertCircle } from 'lucide-react';

interface CouponUsagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: AdminCoupon | null;
}

export function CouponUsagesDrawer({ isOpen, onClose, coupon }: CouponUsagesDrawerProps) {
  const { data: usages = [], isLoading } = useAdminCouponUsages(coupon?.id || '');

  if (!coupon) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Redemptions: ${coupon.code}`}
      side="right"
    >
      <div className="space-y-6">
        {/* KPI Banner */}
        <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-fg-muted">Total Redemptions:</span>
            <span className="text-fg-primary font-bold">{coupon.usage_count}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-fg-muted">Global Limit:</span>
            <span className="text-fg-primary">
              {coupon.total_usage_limit ? coupon.total_usage_limit : 'Unlimited'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-fg-muted">Per-User Limit:</span>
            <span className="text-fg-primary">{coupon.per_user_usage_limit}</span>
          </div>
        </div>

        {/* Usages List */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-fg-muted font-semibold">
            Redemption History ({usages.length})
          </h4>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-fg-muted gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-mono">Querying redemption ledger...</span>
            </div>
          ) : usages.length === 0 ? (
            <div className="py-12 text-center text-xs text-fg-muted font-mono border border-dashed border-border-subtle rounded-xl">
              No redemptions recorded yet for this voucher.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle overflow-hidden bg-bg-secondary/30">
              {usages.map((usage) => (
                <div key={usage.id} className="p-3.5 space-y-1.5 hover:bg-bg-secondary/60 transition-colors">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-fg-primary truncate max-w-[180px]">
                      {usage.user_email}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      -{formatCurrency(Number(usage.discount_amount))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
                    <span>Order: {usage.order_number || 'N/A'}</span>
                    <span>{formatDate(usage.redeemed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
