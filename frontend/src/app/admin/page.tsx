'use client';

import React from 'react';
import Link from 'next/link';
import {
  useAdminComments,
  useAdminDashboard,
  useAdminOrders,
  useModerateComment,
  useUpdateOrderStatus,
} from '@/hooks/useAdminData';
import { StatCard } from '@/components/admin/StatCard';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { TrafficDonutChart } from '@/components/admin/TrafficDonutChart';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Activity,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function AdminDashboardPage() {
  const { data: dashboardData, isLoading: isDashboardLoading } = useAdminDashboard();
  const { data: recentOrders = [], isLoading: isOrdersLoading } = useAdminOrders();
  const { data: comments = [], isLoading: isCommentsLoading } = useAdminComments();

  const updateStatusMutation = useUpdateOrderStatus();
  const moderateCommentMutation = useModerateComment();

  const pendingComments = comments.filter((c) => !c.is_approved);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, status: newStatus.toLowerCase() });
      notify.success('Status Synchronized', `Order shifted to ${newStatus}.`);
    } catch (err: any) {
      notify.error('Update Failed', err?.response?.data?.status || 'Unable to mutate order lifecycle state.');
    }
  };

  const handleModerateComment = async (commentId: string, isApproved: boolean) => {
    try {
      await moderateCommentMutation.mutateAsync({ id: commentId, is_approved: isApproved });
      notify.success(
        isApproved ? 'Inquiry Approved' : 'Inquiry Dismissed',
        `Discussion item marked as ${isApproved ? 'published' : 'rejected'}.`
      );
    } catch {
      notify.error('Moderation Error', 'Failed to update comment status.');
    }
  };

  if (isDashboardLoading || !dashboardData) {
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

  const kpis = dashboardData.kpis;

  const statusBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
    processing: { label: 'Processing', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
    shipped: { label: 'Dispatched', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
    delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    cancelled: { label: 'Cancelled', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
    refunded: { label: 'Refunded', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Operational Hero Banner */}
      <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-bg-elevated via-bg-elevated/90 to-bg-secondary border border-border-subtle backdrop-blur-xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[11px] font-mono uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
            Atelier Executive Deck
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-fg-primary tracking-tight">
            Commercial Intelligence Console
          </h1>
          <p className="text-xs text-fg-secondary leading-relaxed">
            Live PostgreSQL telemetry monitoring transactional throughput, order fulfillment velocity, inventory reserves, and client sentiments across Paradox Atelier.
          </p>
        </div>

        {/* Circular Target Progress Gauge & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full md:w-auto">
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-border-subtle"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-500 dark:text-cyan-400"
                  strokeDasharray={`${kpis.target_revenue_progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-mono font-bold text-fg-primary">
                {kpis.target_revenue_progress.toFixed(0)}%
              </span>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase text-fg-muted block tracking-wider">
                Monthly Target
              </span>
              <span className="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-300">
                {formatCurrency(kpis.monthly_revenue)}
              </span>
            </div>
          </div>

          <Link
            href="/admin/products?action=new"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 text-xs font-semibold font-mono transition-all shadow-md shrink-0 w-full sm:w-auto cursor-pointer"
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
          <RevenueChart data={dashboardData.revenue_chart} />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <TrafficDonutChart data={dashboardData.acquisition_channels} />
        </div>
      </div>

      {/* 4. Operational Tables & Moderation Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Orders Dispatch Table (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-bg-elevated border border-border-subtle p-6 space-y-4 shadow-sm dark:shadow-2xl backdrop-blur-xl transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-fg-primary tracking-tight">
                Fulfillment & Dispatch Queue
              </h3>
              <p className="text-xs text-fg-secondary font-mono mt-0.5">
                Real-time lifecycle management of recent acquisitions
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-fg-muted font-mono">
                No orders recorded yet in database.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border-subtle text-fg-muted uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-2">Order ID</th>
                    <th className="py-3 px-2">Patron</th>
                    <th className="py-3 px-2">Total Amount</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                  {recentOrders.slice(0, 5).map((order) => {
                    const statusKey = order.status.toLowerCase();
                    const badge = statusBadges[statusKey] || statusBadges.pending;
                    return (
                      <tr key={order.id} className="hover:bg-bg-secondary/40 transition-colors">
                        <td className="py-3 px-2 font-bold text-fg-primary flex items-center gap-1.5">
                          <ShoppingBag className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                          {order.order_number}
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-fg-primary font-semibold font-display truncate max-w-[130px]">
                            {order.customer?.name || 'Patron'}
                          </div>
                          <div className="text-[10px] text-fg-muted truncate">{order.customer?.email}</div>
                        </td>
                        <td className="py-3 px-2 font-bold text-cyan-600 dark:text-cyan-300">
                          {formatCurrency(Number(order.total || 0))}
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={order.status.toLowerCase()}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            aria-label={`Change status for order ${order.order_number}`}
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border bg-bg-secondary focus:outline-none cursor-pointer',
                              badge.bg,
                              badge.text,
                              badge.border
                            )}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </td>
                        <td className="py-3 px-2 text-end">
                          <Link
                            href={`/admin/orders?view=${order.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-[10px] text-fg-primary transition-colors"
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
            )}
          </div>
        </div>

        {/* Right: Technical Inquiry Moderation Queue (4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-bg-elevated border border-border-subtle p-6 space-y-4 shadow-sm dark:shadow-2xl backdrop-blur-xl transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-fg-primary tracking-tight flex items-center gap-2">
                <span>Inquiry Deck</span>
                {pendingComments.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {pendingComments.length} New
                  </span>
                )}
              </h3>
              <p className="text-xs text-fg-secondary font-mono mt-0.5">
                Technical patron Q&A queue
              </p>
            </div>
            <Link
              href="/admin/comments"
              className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {pendingComments.length === 0 ? (
              <div className="py-8 text-center text-xs text-fg-muted font-mono space-y-1">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p>No pending inquiries requiring moderation.</p>
              </div>
            ) : (
              pendingComments.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg-primary font-display truncate">
                      {c.author_name}
                    </span>
                    <span className="text-[10px] text-fg-muted">{c.product_name}</span>
                  </div>
                  <p className="text-[11px] text-fg-secondary line-clamp-2 italic">
                    &ldquo;{c.content}&rdquo;
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleModerateComment(c.id, false)}
                      className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20 transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleModerateComment(c.id, true)}
                      className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
