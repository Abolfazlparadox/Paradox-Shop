'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import { AdminAnalytics, AdminOrder, AdminOrderStatus, AdminComment } from '@/types/admin';
import { StatCard } from '@/components/admin/StatCard';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { TrafficDonutChart } from '@/components/admin/TrafficDonutChart';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Activity,
  ArrowRight,
  Sparkles,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [pendingComments, setPendingComments] = useState<AdminComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [analyticsData, ordersData, commentsData] = await Promise.all([
          adminApi.getAnalytics(),
          adminApi.getOrders(),
          adminApi.getComments(),
        ]);
        setAnalytics(analyticsData);
        setRecentOrders(ordersData.slice(0, 5));
        setPendingComments(commentsData.filter((c) => !c.is_approved));
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: AdminOrderStatus) => {
    try {
      const updated = await adminApi.updateOrderStatus(orderId, newStatus);
      setRecentOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      notify.success('Status Synchronized', `Order ${updated.order_number} shifted to ${newStatus}.`);
    } catch {
      notify.error('Update Failed', 'Unable to mutate order lifecycle state.');
    }
  };

  const handleModerateComment = async (commentId: string, isApproved: boolean) => {
    await adminApi.moderateComment(commentId, isApproved);
    setPendingComments((prev) => prev.filter((c) => c.id !== commentId));
    notify.success(
      isApproved ? 'Inquiry Approved' : 'Inquiry Dismissed',
      `Discussion item marked as ${isApproved ? 'published' : 'rejected'}.`
    );
  };

  if (isLoading || !analytics) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <SkeletonChart />
          </div>
          <div className="lg:col-span-4">
            <SkeletonChart />
          </div>
        </div>
        <SkeletonTable rows={4} />
      </div>
    );
  }

  const kpis = analytics.kpis;

  const statusBadges: Record<AdminOrderStatus, { label: string; bg: string; text: string; border: string }> = {
    PENDING: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    PROCESSING: { label: 'Processing', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    SHIPPED: { label: 'Dispatched', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
    DELIVERED: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    REFUNDED: { label: 'Refunded', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Operational Hero Banner */}
      <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0B1528] border border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-mono uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Atelier Executive Deck
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Commercial Intelligence Console
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Live telemetry monitoring transactional throughput, order fulfillment velocity, inventory reserves, and client sentiments across Paradox Atelier.
          </p>
        </div>

        {/* Circular Target Progress Gauge & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full md:w-auto">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400"
                  strokeDasharray={`${kpis.target_revenue_progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-mono font-bold text-white">
                {kpis.target_revenue_progress.toFixed(0)}%
              </span>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">
                Monthly Target
              </span>
              <span className="text-xs font-bold font-mono text-cyan-300">
                184.5M / 220M
              </span>
            </div>
          </div>

          <Link
            href="/admin/products?action=new"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold font-mono transition-all shadow-[0_0_20px_rgba(0,245,212,0.25)] shrink-0 w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Artifact</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Monthly Revenue"
          value={formatCurrency(kpis.monthly_revenue)}
          change={kpis.monthly_revenue_change}
          icon={<DollarSign className="w-4 h-4" />}
          color="cyan"
          sparklineData={[12, 19, 28, 35, 42, 60, 85, 110]}
        />
        <StatCard
          title="Orders Processed"
          value={`${kpis.total_orders} Orders`}
          change={kpis.total_orders_change}
          icon={<ShoppingBag className="w-4 h-4" />}
          color="indigo"
          sparklineData={[5, 12, 10, 18, 22, 29, 31, 38]}
        />
        <StatCard
          title="Active VIP Patrons"
          value={`${kpis.active_customers}`}
          change={kpis.active_customers_change}
          icon={<Users className="w-4 h-4" />}
          color="emerald"
          sparklineData={[40, 52, 61, 74, 88, 105, 130, 160]}
        />
        <StatCard
          title="Conversion Efficiency"
          value={`${kpis.conversion_rate}%`}
          change={kpis.conversion_rate_change}
          icon={<Activity className="w-4 h-4" />}
          color="amber"
          sparklineData={[2.8, 3.1, 2.9, 3.4, 3.6, 3.5, 3.7, 3.82]}
        />
      </div>

      {/* 3. Analytics Visualizer Grid (Area + Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <RevenueChart data={analytics.revenue_chart} />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <TrafficDonutChart data={analytics.acquisition_channels} />
        </div>
      </div>

      {/* 4. Operational Tables & Moderation Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Orders Dispatch Table (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-white tracking-tight">
                Fulfillment & Dispatch Queue
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Real-time lifecycle management of recent acquisitions
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-2">Order ID</th>
                  <th className="py-3 px-2">Patron</th>
                  <th className="py-3 px-2">Total Amount</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentOrders.map((order) => {
                  const badge = statusBadges[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-2 font-bold text-white flex items-center gap-1.5">
                        <ShoppingBag className="w-3 h-3 text-cyan-400" />
                        {order.order_number}
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-white font-semibold font-display truncate max-w-[130px]">
                          {order.customer.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{order.customer.email}</div>
                      </td>
                      <td className="py-3 px-2 font-bold text-cyan-300">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-2">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as AdminOrderStatus)}
                          aria-label={`Change status for order ${order.order_number}`}
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border bg-slate-950 focus:outline-none cursor-pointer',
                            badge.bg,
                            badge.text,
                            badge.border
                          )}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3 px-2 text-end">
                        <Link
                          href={`/admin/orders?view=${order.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition-colors"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Moderation Queue & Top Performers (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Moderation Widget */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-white tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                Pending Q&A Queue
              </h3>
              <Link
                href="/admin/comments"
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
              >
                All ({pendingComments.length})
              </Link>
            </div>

            {pendingComments.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs font-mono text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-80" />
                <div>Moderation Zero</div>
                <p className="text-[10px] text-slate-400">All customer inquiries resolved.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingComments.slice(0, 2).map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold text-cyan-300 truncate max-w-[140px]">
                        {c.author_name}
                      </span>
                      <span className="text-slate-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                      &ldquo;{c.content}&rdquo;
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleModerateComment(c.id, false)}
                        className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-mono transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleModerateComment(c.id, true)}
                        className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Performing Products */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-white tracking-tight flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Velocity Artifacts
              </h3>
              <Link href="/admin/products" className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300">
                Catalog
              </Link>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {analytics.top_products.map((prod) => (
                <div key={prod.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-white truncate max-w-[150px]">
                      {prod.name}
                    </span>
                    <span className="text-cyan-300 font-bold">{formatCurrency(prod.revenue)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{prod.units_sold} Units Dispatched</span>
                    <span className={prod.stock <= 10 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {prod.stock} in Reserve
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, (prod.units_sold / 70) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
