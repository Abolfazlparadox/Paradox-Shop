'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useOrders } from '@/features/orders/queries/useOrders';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { Button } from '@/components/ui/Button';
import { Package, Clock, ShieldCheck, ArrowRight, ShoppingBag } from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user } = useAuthStore();
  const { data: ordersData, isLoading } = useOrders({ page_size: 5 });

  const orders = ordersData?.results || [];
  const totalOrders = ordersData?.count || 0;
  const activeOrders = orders.filter((o) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Orders */}
        <div className="p-5 rounded-xl bg-bg-elevated border border-border-subtle shadow-card space-y-2">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Total Orders</span>
            <Package className="w-4 h-4" />
          </div>
          <span className="text-2xl font-bold font-mono text-fg-primary block">
            {isLoading ? '...' : totalOrders}
          </span>
          <span className="text-[11px] text-fg-secondary">All-time order history</span>
        </div>

        {/* Active Orders */}
        <div className="p-5 rounded-xl bg-bg-elevated border border-border-subtle shadow-card space-y-2">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Active Dispatches</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-fg-primary block">
            {isLoading ? '...' : activeOrders}
          </span>
          <span className="text-[11px] text-fg-secondary">In transit or awaiting clearance</span>
        </div>

        {/* Verification Status */}
        <div className="p-5 rounded-xl bg-bg-elevated border border-border-subtle shadow-card space-y-2">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Account Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-base font-bold font-display text-emerald-400 block pt-1">
            VERIFIED CLIENT
          </span>
          <span className="text-[11px] font-mono text-fg-secondary truncate block">
            {user?.email}
          </span>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display text-fg-primary">
              Recent Orders & Acquisitions
            </h2>
            <p className="text-xs text-fg-secondary font-mono">
              Latest fulfillment activity
            </p>
          </div>

          <Link href="/dashboard/orders">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="text-xs">
              View All ({totalOrders})
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <div className="h-24 bg-bg-elevated rounded-xl animate-pulse" />
            <div className="h-24 bg-bg-elevated rounded-xl animate-pulse" />
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="p-8 bg-bg-elevated border border-border-subtle rounded-xl text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-fg-muted mx-auto">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold font-display text-fg-primary">
                No Orders Yet
              </h3>
              <p className="text-xs text-fg-secondary max-w-xs mx-auto">
                Explore our catalog of engineered minimalism artifacts.
              </p>
            </div>
            <Link href="/products" className="inline-block pt-1">
              <Button size="sm">Discover Catalog</Button>
            </Link>
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
