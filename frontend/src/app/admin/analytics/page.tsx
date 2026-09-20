'use client';

import React, { useState } from 'react';
import { useAdminAnalytics } from '@/hooks/useAdminData';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { TrafficDonutChart } from '@/components/admin/TrafficDonutChart';
import { SkeletonChart, SkeletonCard } from '@/components/admin/SkeletonLoader';
import { formatCurrency } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  BarChart3,
  CreditCard,
  UserCheck,
  RotateCcw,
  Download,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const { data: analytics, isLoading } = useAdminAnalytics(days);

  const handleExportJSON = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paradox-analytics-dataset-${Date.now()}.json`;
    a.click();
    notify.success('Dataset Exported', 'Full analytical telemetry exported to JSON.');
  };

  if (isLoading || !analytics) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  const kpis = analytics.kpis;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            <span>Deep Commerce & Financial Analytics</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Algorithmic projections, unit economics, customer acquisition costs, and cohort retention
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Lookback Range Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
              { label: '12M', value: 365 },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setDays(tab.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer',
                  days === tab.value
                    ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                    : 'text-fg-secondary hover:text-fg-primary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Raw Telemetry
          </Button>
        </div>
      </div>

      {/* Financial Unit Economics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl space-y-2 transition-colors">
          <div className="flex items-center justify-between text-fg-muted text-xs">
            <span>Average Order Value (AOV)</span>
            <CreditCard className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-fg-primary tabular-nums">
            {formatCurrency(kpis.average_order_value)}
          </div>
          <p className="text-[10px] text-fg-muted">
            Computed across all successful fulfilled checkouts
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl space-y-2 transition-colors">
          <div className="flex items-center justify-between text-fg-muted text-xs">
            <span>Customer Acquisition Cost (CAC)</span>
            <UserCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-fg-primary tabular-nums">
            {formatCurrency(kpis.customer_acquisition_cost)}
          </div>
          <p className="text-[10px] text-fg-muted">
            Blended marketing expense per newly converted patron
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl space-y-2 transition-colors">
          <div className="flex items-center justify-between text-fg-muted text-xs">
            <span>Return & Refund Velocity</span>
            <RotateCcw className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-fg-primary tabular-nums">
            {kpis.refund_rate}%
          </div>
          <p className="text-[10px] text-fg-muted">
            {kpis.refund_rate}% return rate benchmarks in top 1% luxury tier
          </p>
        </div>
      </div>

      {/* Main Charts Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <RevenueChart data={analytics.revenue_chart} />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <TrafficDonutChart data={analytics.acquisition_channels} />
        </div>
      </div>

      {/* Top Products Table */}
      {analytics.top_products && analytics.top_products.length > 0 && (
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4 transition-colors">
          <h3 className="text-base font-bold font-display text-fg-primary tracking-tight">
            Top Performing Atelier Artifacts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle text-fg-muted uppercase text-[10px]">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Units Sold</th>
                  <th className="py-2.5 px-3">Total Revenue</th>
                  <th className="py-2.5 px-3">Reserve Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {analytics.top_products.map((item) => (
                  <tr key={item.id} className="hover:bg-bg-secondary/40">
                    <td className="py-3 px-3 font-bold text-fg-primary">{item.name}</td>
                    <td className="py-3 px-3">{item.category}</td>
                    <td className="py-3 px-3 text-cyan-600 dark:text-cyan-400 font-bold">
                      {item.units_sold} units
                    </td>
                    <td className="py-3 px-3 font-bold text-fg-primary">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="py-3 px-3">{item.stock} in reserve</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cohort Retention Matrix Heatmap */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4 transition-colors">
        <div>
          <h3 className="text-base font-bold font-display text-fg-primary tracking-tight">
            Client Cohort Retention Analysis
          </h3>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Repeat patron purchase frequency tracked across consecutive monthly intervals
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border-subtle text-fg-muted uppercase text-[10px]">
                <th className="py-2.5 px-3">Cohort</th>
                <th className="py-2.5 px-3">New Patrons</th>
                <th className="py-2.5 px-3">Month 1</th>
                <th className="py-2.5 px-3">Month 2</th>
                <th className="py-2.5 px-3">Month 3</th>
                <th className="py-2.5 px-3">Month 4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
              {(analytics.cohorts || []).map((c) => (
                <tr key={c.cohort} className="hover:bg-bg-secondary/40">
                  <td className="py-3 px-3 font-bold text-fg-primary">{c.cohort}</td>
                  <td className="py-3 px-3">{c.users} Patrons</td>
                  <td className="py-3 px-3 text-cyan-600 dark:text-cyan-400 font-bold">{c.m1}</td>
                  <td className="py-3 px-3 text-indigo-600 dark:text-indigo-300 font-bold">{c.m2}</td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-300 font-bold">{c.m3}</td>
                  <td className="py-3 px-3 text-amber-600 dark:text-amber-300 font-bold">{c.m4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
