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
    await adminApi.saveCoupon(data);
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
          <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-amber-400" />
            <span>Promotional Engine & Marketing Vault</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Architect discount codes, VIP allowances, seasonal campaigns, and storefront alert banners
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsBuilderOpen(true)}
          className="text-xs font-mono bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Issue Promo Code
        </Button>
      </div>

      {/* Campaign Banner Highlight */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-mono">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] uppercase font-bold border border-amber-500/30">
            <Megaphone className="w-3 h-3" />
            Storefront Broadcast Campaign
          </div>
          <h3 className="text-lg font-bold font-display text-white">
            &ldquo;Atelier Autumn Solstice Horology Preview&rdquo;
          </h3>
          <p className="text-xs text-slate-400">
            Global announcement bar active across all product catalog pages. Click-through rate: <span className="text-amber-400 font-bold">14.8%</span>.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">Primary Discount</span>
          <div className="text-sm font-bold text-amber-300 font-mono">CODE: PARADOX-VIP</div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-white tracking-tight">
            Active Discount Codes ({coupons.length})
          </h3>
        </div>

        {isLoading ? (
          <SkeletonTable rows={3} />
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-slate-400">
            <Tag className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-white font-bold">No promotional codes</div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Coupon Code</th>
                    <th className="py-3.5 px-3">Benefit</th>
                    <th className="py-3.5 px-3">Min Order</th>
                    <th className="py-3.5 px-3">Redemptions</th>
                    <th className="py-3.5 px-3">Expiry</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {coupons.map((c) => {
                    const usagePercent = Math.min(100, (c.usage_count / (c.usage_limit || 1)) * 100);

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-amber-300 tracking-wider">
                          {c.code}
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-white">
                          {c.discount_type === 'PERCENTAGE'
                            ? `${c.discount_value}% OFF`
                            : `${formatCurrency(c.discount_value)} OFF`}
                        </td>

                        <td className="py-3.5 px-3 text-slate-400">
                          {c.min_order_value ? formatCurrency(c.min_order_value) : 'None'}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>{c.usage_count}</span>
                              <span className="text-slate-400">/ {c.usage_limit}</span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-slate-400">
                          {c.expires_at ? formatDate(c.expires_at) : 'Perpetual'}
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                              c.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            )}
                          >
                            {c.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-end">
                          <button
                            onClick={() => handleToggleActive(c.id)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors',
                              c.is_active
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            )}
                          >
                            {c.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Builder Modal */}
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
    <Suspense fallback={<SkeletonTable rows={3} />}>
      <AdminMarketingContent />
    </Suspense>
  );
}
