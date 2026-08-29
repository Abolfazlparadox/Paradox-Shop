'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { AdminCoupon } from '@/types/admin';
import { CouponBuilderModal } from '@/components/admin/CouponBuilderModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Tag,
  Plus,
  Sparkles,
  Percent,
  CheckCircle2,
  XCircle,
  Megaphone,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminMarketingContent() {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');

  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(initialAction === 'new');
  const [isLoading, setIsLoading] = useState(true);

  const loadCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getCoupons();
      setCoupons(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleSaveCoupon = async (data: Partial<AdminCoupon>) => {
    if (data.id) {
      await adminApi.updateCoupon(data.id, data);
    } else {
      await adminApi.createCoupon(data);
    }
    await loadCoupons();
  };

  const handleToggleActive = async (id: string) => {
    await adminApi.toggleCoupon(id);
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
    notify.success('Campaign Mutated', 'Promotional status updated.');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            <span>Promotional Coupons & Marketing Vault</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Configure discount codes, campaign banners, and VIP redemption limits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCoupons}
            className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBuilderOpen(true)}
            className="text-xs font-mono bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-950 font-semibold"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Broadcast Campaign Active Banner Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-bg-elevated to-bg-secondary border border-amber-500/30 backdrop-blur-xl shadow-sm dark:shadow-xl space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Megaphone className="w-4 h-4" />
            <span>Active Global Broadcast Banner</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Broadcasting Live
          </span>
        </div>

        <p className="text-sm font-display text-fg-primary font-bold">
          &ldquo;Complimentary express courier dispatch on horology artifacts exceeding 10,000,000 Toman.&rdquo;
        </p>

        <div className="flex items-center gap-4 text-xs font-mono text-fg-muted pt-2 border-t border-border-subtle/60">
          <span>CTR: <strong className="text-fg-primary">4.8%</strong></span>
          <span>Redemptions: <strong className="text-fg-primary">82 Orders</strong></span>
          <span>Revenue Influenced: <strong className="text-cyan-600 dark:text-cyan-300">42,000,000 Toman</strong></span>
        </div>
      </div>

      {/* Coupons Master Table */}
      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : coupons.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-elevated border border-border-subtle font-mono text-xs text-fg-muted space-y-2">
          <Tag className="w-8 h-8 text-fg-muted mx-auto opacity-50" />
          <p>No active promotional discount vouchers.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-bg-elevated border border-border-subtle overflow-hidden shadow-sm dark:shadow-xl transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-fg-muted uppercase text-[10px] tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Discount Model</th>
                  <th className="py-3.5 px-4">Minimum Order</th>
                  <th className="py-3.5 px-4">Usage / Cap</th>
                  <th className="py-3.5 px-4">Expiration</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-secondary/40 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4 font-bold text-fg-primary">
                      <span className="px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-subtle text-amber-600 dark:text-amber-400 font-mono tracking-wider">
                        {c.code}
                      </span>
                    </td>

                    {/* Model & Value */}
                    <td className="py-3.5 px-4 font-bold text-fg-primary">
                      {c.discount_type === 'PERCENTAGE'
                        ? `${c.discount_value}% OFF`
                        : `${formatCurrency(c.discount_value)} OFF`}
                    </td>

                    {/* Min Order */}
                    <td className="py-3.5 px-4 text-fg-secondary">
                      {c.min_order_subtotal ? formatCurrency(Number(c.min_order_subtotal)) : 'None'}
                    </td>

                    {/* Usage Progress */}
                    <td className="py-3.5 px-4">
                      <div>
                        {c.usage_count} / {c.total_usage_limit || '∞'} used
                      </div>
                      {c.total_usage_limit && (
                        <div className="w-24 h-1.5 rounded-full bg-bg-secondary overflow-hidden mt-1">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{
                              width: `${Math.min(100, (c.usage_count / c.total_usage_limit) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>

                    {/* Expiration */}
                    <td className="py-3.5 px-4 text-fg-muted">
                      {c.end_at ? formatDate(c.end_at) : 'Perpetual'}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'text-[10px] font-mono px-2 py-0.5 rounded-full font-bold',
                          c.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        )}
                      >
                        {c.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>

                    {/* Action Toggle */}
                    <td className="py-3.5 px-4 text-end">
                      <button
                        onClick={() => handleToggleActive(c.id)}
                        className="px-2.5 py-1 rounded-lg bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-[11px] text-fg-primary transition-colors cursor-pointer"
                      >
                        {c.is_active ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coupon Builder Modal */}
      <CouponBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={handleSaveCoupon}
      />
    </div>
  );
}

export default function AdminMarketingPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} />}>
      <AdminMarketingContent />
    </Suspense>
  );
}
