'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useOrders } from '@/features/orders/queries/useOrders';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { OrderStatus } from '@/types/api';
import { Package, ShoppingBag } from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersHistoryPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const { data, isLoading, refetch } = useOrders({ page_size: 50 });

  const allOrders = data?.results || [];

  const filteredOrders = activeTab === 'ALL'
    ? allOrders
    : allOrders.filter((o) => o.status === (activeTab as OrderStatus));

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h2 className="text-xl font-bold font-display text-fg-primary">
            Orders & Dispatches
          </h2>
          <p className="text-xs text-fg-secondary font-mono">
            {allOrders.length} total order(s) registered
          </p>
        </div>

        <Tabs
          tabs={STATUS_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
          className="overflow-x-auto"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-bg-elevated rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredOrders.length === 0 && (
        <div className="p-12 bg-bg-elevated border border-border-subtle rounded-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-fg-muted mx-auto">
            <Package className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold font-display text-fg-primary">
              No Orders in &quot;{activeTab}&quot; Status
            </h3>
            <p className="text-xs text-fg-secondary max-w-xs mx-auto">
              There are no fulfillment records matching this status filter.
            </p>
          </div>
          {activeTab !== 'ALL' && (
            <Button size="sm" variant="outline" onClick={() => setActiveTab('ALL')}>
              Show All Orders
            </Button>
          )}
        </div>
      )}

      {/* Orders List */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
