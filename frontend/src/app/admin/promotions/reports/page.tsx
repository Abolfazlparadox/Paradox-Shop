'use client';

import React, { useState } from 'react';
import { useAdminPromotionReports } from '@/hooks/useAdminData';
import { formatCurrency } from '@/lib/utils/format';
import {
  BarChart3,
  TrendingUp,
  Tag,
  Sparkles,
  ShoppingBag,
  Clock,
  RefreshCw,
  Award,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminPromotionReportsPage() {
  const [days, setDays] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [useCustomRange, setUseCustomRange] = useState(false);

  const queryParams = useCustomRange && startDate && endDate
    ? { start_date: new Date(startDate).toISOString(), end_date: new Date(endDate).toISOString() }
    : { days };

  const { data: reports, isLoading, refetch, isFetching } = useAdminPromotionReports(queryParams);

  const totalDiscounts = Number(reports?.total_discounts_given || 0);
  const totalCouponDiscounts = Number(reports?.total_coupon_discounts || 0);
  const revenueAffected = Number(reports?.revenue_affected || 0);
  const redemptions = reports?.coupon_redemptions || 0;
  const ordersWithCoupons = reports?.orders_with_coupons || 0;
  const ordersWithPromos = reports?.orders_with_promotions || 0;
  const activeCampaigns = reports?.active_campaigns || 0;
  const expiredCampaigns = reports?.expired_campaigns || 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            <span>Promotion Telemetry & Financial Impact</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Server-aggregated analytics for campaign ROI, voucher redemptions, and revenue impact
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs font-mono"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 rounded-xl bg-bg-elevated border border-border-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-card">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-fg-muted" />
          <span className="text-xs font-mono text-fg-primary font-semibold">
            Aggregation Window:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center rounded-lg bg-bg-secondary p-1 border border-border-subtle">
            {[
              { label: 'Today', val: 1 },
              { label: '7 Days', val: 7 },
              { label: '30 Days', val: 30 },
              { label: '90 Days', val: 90 },
            ].map((period) => (
              <button
                key={period.val}
                onClick={() => {
                  setUseCustomRange(false);
                  setDays(period.val);
                }}
                className={cn(
                  'px-3 py-1 rounded-md text-[11px] font-semibold transition-colors',
                  !useCustomRange && days === period.val
                    ? 'bg-bg-elevated text-fg-primary shadow-xs'
                    : 'text-fg-muted hover:text-fg-primary'
                )}
              >
                {period.label}
              </button>
            ))}
            <button
              onClick={() => setUseCustomRange(true)}
              className={cn(
                'px-3 py-1 rounded-md text-[11px] font-semibold transition-colors',
                useCustomRange
                  ? 'bg-bg-elevated text-fg-primary shadow-xs'
                  : 'text-fg-muted hover:text-fg-primary'
              )}
            >
              Custom Range
            </button>
          </div>

          {useCustomRange && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-bg-secondary border border-border-subtle text-fg-primary"
              />
              <span className="text-fg-muted">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-bg-secondary border border-border-subtle text-fg-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Discounts Given */}
        <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle space-y-3 shadow-card">
          <div className="flex items-center justify-between text-fg-muted text-xs font-mono">
            <span>Total Discounts Given</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {isLoading ? '...' : formatCurrency(totalDiscounts)}
          </div>
          <div className="text-[11px] text-fg-muted font-mono">
            Automatic promos + voucher savings
          </div>
        </div>

        {/* Revenue Impact */}
        <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle space-y-3 shadow-card">
          <div className="flex items-center justify-between text-fg-muted text-xs font-mono">
            <span>Promotional Revenue</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-fg-primary">
            {isLoading ? '...' : formatCurrency(revenueAffected)}
          </div>
          <div className="text-[11px] text-fg-muted font-mono">
            Gross turnover in discounted orders
          </div>
        </div>

        {/* Redemptions & Vouchers */}
        <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle space-y-3 shadow-card">
          <div className="flex items-center justify-between text-fg-muted text-xs font-mono">
            <span>Coupon Redemptions</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {isLoading ? '...' : redemptions}
          </div>
          <div className="text-[11px] text-fg-muted font-mono">
            Voucher discounts: {formatCurrency(totalCouponDiscounts)}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle space-y-3 shadow-card">
          <div className="flex items-center justify-between text-fg-muted text-xs font-mono">
            <span>Active Campaigns</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-fg-primary">
            {isLoading ? '...' : activeCampaigns}
          </div>
          <div className="text-[11px] text-fg-muted font-mono">
            {expiredCampaigns} archived/expired campaigns
          </div>
        </div>
      </div>

      {/* Orders Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle space-y-4 shadow-card">
          <h3 className="text-sm font-bold font-display text-fg-primary flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <span>Order Penetration Breakdown</span>
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-bg-secondary flex items-center justify-between">
              <span className="text-fg-secondary">Orders with Coupon Vouchers:</span>
              <span className="font-bold text-amber-400">{ordersWithCoupons} orders</span>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-secondary flex items-center justify-between">
              <span className="text-fg-secondary">Orders with Automatic Promotions:</span>
              <span className="font-bold text-emerald-400">{ordersWithPromos} orders</span>
            </div>
          </div>
        </div>

        {/* Top Performing Coupons Leaderboard */}
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle space-y-4 shadow-card">
          <h3 className="text-sm font-bold font-display text-fg-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Top Performing Vouchers</span>
          </h3>

          {!reports?.most_used_coupons || reports.most_used_coupons.length === 0 ? (
            <div className="py-8 text-center text-xs text-fg-muted font-mono border border-dashed border-border-subtle rounded-xl">
              No voucher redemptions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle overflow-hidden bg-bg-secondary/30">
              {reports.most_used_coupons.map((item: any) => (
                <div key={item.id} className="p-3 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {item.code}
                    </span>
                    <span className="text-[11px] text-fg-muted">
                      {item.discount_type === 'PERCENTAGE' ? `${item.discount_value}%` : `-${formatCurrency(Number(item.discount_value))}`}
                    </span>
                  </div>
                  <div className="text-fg-primary font-semibold">
                    {item.usage_count} redemptions
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
