'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin';
import { AdminAnalytics } from '@/types/admin';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { TrafficDonutChart } from '@/components/admin/TrafficDonutChart';
import { SkeletonChart, SkeletonCard } from '@/components/admin/SkeletonLoader';
import { formatCurrency } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  BarChart3,
  TrendingUp,
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
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi.getAnalytics().then((data) => {
      setAnalytics(data);
      setIsLoading(false);
    });
  }, []);

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
          <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>Deep Commercial Analytics & Cohorts</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cohort retention heatmaps, customer acquisition economics, and transactional telemetry
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJSON}
          className="text-xs font-mono border-slate-800 hover:bg-slate-800 text-slate-300"
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export Raw Dataset (JSON)
        </Button>
      </div>

      {/* Advanced Unit Economics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 shadow-2xl backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase">
            <span>Average Order Value (AOV)</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {formatCurrency(kpis.average_order_value)}
          </div>
          <div className="text-[11px] text-emerald-400">+8.2% vs previous quarter</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-500/20 shadow-2xl backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase">
            <span>Customer Acquisition Cost (CAC)</span>
            <UserCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {formatCurrency(kpis.customer_acquisition_cost)}
          </div>
          <div className="text-[11px] text-indigo-300">LTV:CAC Ratio 8.9x (Atelier Prime)</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-500/20 shadow-2xl backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase">
            <span>Return & Refund Velocity</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {kpis.refund_rate}%
          </div>
          <div className="text-[11px] text-emerald-400">Industry benchmark: &lt; 2.5%</div>
        </div>
      </div>

      {/* Trajectory & Acquisition Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <RevenueChart data={analytics.revenue_chart} />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <TrafficDonutChart data={analytics.acquisition_channels} />
        </div>
      </div>

      {/* Cohort Retention Heatmap / Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4 font-mono">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Patron Retention Cohort Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Month-over-month repurchase retention rate by onboarding cohort
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Cohort</th>
                <th className="py-3 px-3 text-center">Patrons</th>
                <th className="py-3 px-3 text-center">M1</th>
                <th className="py-3 px-3 text-center">M2</th>
                <th className="py-3 px-3 text-center">M3</th>
                <th className="py-3 px-3 text-center">M4</th>
                <th className="py-3 px-3 text-center">M5</th>
                <th className="py-3 px-3 text-center">M6</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {analytics.cohorts.map((c) => (
                <tr key={c.cohort} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-white">{c.cohort}</td>
                  <td className="py-3 px-3 text-center text-slate-400">{c.users}</td>

                  {[c.m1, c.m2, c.m3, c.m4, c.m5, c.m6].map((val, idx) => {
                    if (val === 0) {
                      return (
                        <td key={idx} className="py-3 px-3 text-center text-slate-600">
                          —
                        </td>
                      );
                    }

                    // Intensity background
                    let bg = 'bg-cyan-500/10 text-cyan-400';
                    if (val >= 50) bg = 'bg-cyan-400/30 text-cyan-200 font-bold';
                    else if (val >= 40) bg = 'bg-cyan-500/20 text-cyan-300';

                    return (
                      <td key={idx} className="py-2 px-3 text-center">
                        <span className={cn('inline-block px-2 py-1 rounded text-[11px]', bg)}>
                          {val}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
