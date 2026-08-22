'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { AdminOrder, AdminOrderStatus } from '@/types/admin';
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  ShoppingBag,
  Search,
  Download,
  Filter,
  CheckSquare,
  Square,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialViewId = searchParams.get('view');

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [inspectingOrder, setInspectingOrder] = useState<AdminOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getOrders({
        status: statusFilter,
        search: searchQuery,
      });
      setOrders(data);

      if (initialViewId) {
        const target = data.find((o) => o.id === initialViewId);
        if (target) setInspectingOrder(target);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, initialViewId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusUpdate = async (orderId: string, status: AdminOrderStatus) => {
    const updated = await adminApi.updateOrderStatus(orderId, status);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    if (inspectingOrder?.id === orderId) {
      setInspectingOrder(updated);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (status: AdminOrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await adminApi.bulkUpdateOrderStatus(selectedOrderIds, status);
      notify.success('Batch Complete', `${selectedOrderIds.length} orders transitioned to ${status}.`);
      setSelectedOrderIds([]);
      await loadOrders();
    } catch {
      notify.error('Batch Error', 'Unable to apply bulk transition.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order Number', 'Date', 'Customer Name', 'Customer Email', 'Status', 'Payment Status', 'Total Amount'];
    const rows = orders.map((o) => [
      o.order_number,
      o.created_at,
      `"${o.customer.name}"`,
      o.customer.email,
      o.status,
      o.payment_status,
      o.total,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `paradox-orders-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success('Export Ready', 'CSV order manifest generated.');
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'PROCESSING', label: 'Processing' },
    { id: 'SHIPPED', label: 'Dispatched' },
    { id: 'DELIVERED', label: 'Delivered' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  const statusBadges: Record<AdminOrderStatus, { bg: string; text: string; border: string }> = {
    PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    PROCESSING: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    SHIPPED: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
    DELIVERED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    CANCELLED: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    REFUNDED: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
            <span>Orders Dispatch & Fulfillment</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Manage fulfillment workflows, courier manifests, and financial settlements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            className="text-xs font-mono border-slate-800 hover:bg-slate-800 text-slate-300"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-mono border-slate-800 hover:bg-slate-800 text-slate-300"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Manifest
          </Button>
        </div>
      </div>

      {/* Filter Bar & Status Tabs */}
      <div className="space-y-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap',
                  statusFilter === tab.id
                    ? 'bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30 shadow-[0_0_15px_rgba(0,245,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer..."
              className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
        </div>

        {/* Batch Operations Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-cyan-200">
            <div className="flex items-center gap-2">
              <span className="font-bold">{selectedOrderIds.length}</span> orders selected for batch transition:
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                isLoading={isBulkUpdating}
                onClick={() => handleBulkStatus('SHIPPED')}
                className="text-[11px] font-mono border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300"
              >
                Mark Dispatched
              </Button>
              <Button
                size="sm"
                variant="outline"
                isLoading={isBulkUpdating}
                onClick={() => handleBulkStatus('DELIVERED')}
                className="text-[11px] font-mono border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"
              >
                Mark Delivered
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedOrderIds([])}
                className="text-[11px] font-mono border-slate-700 text-slate-400 hover:text-white"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : orders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 font-mono text-xs text-slate-400">
          <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-white font-bold">No orders found</div>
          <p className="text-slate-500">No transactions match the selected filters or query.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <button
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      {selectedOrderIds.length === orders.length ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3">Order Number</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-3">Client</th>
                  <th className="py-3.5 px-3">Items</th>
                  <th className="py-3.5 px-3">Settlement</th>
                  <th className="py-3.5 px-3">Lifecycle Status</th>
                  <th className="py-3.5 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {orders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const badge = statusBadges[order.status];

                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        'hover:bg-slate-800/40 transition-colors',
                        isSelected && 'bg-cyan-500/5'
                      )}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleSelect(order.id)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{order.order_number}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{formatDate(order.created_at)}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white font-display">{order.customer.name}</div>
                        <div className="text-[10px] text-slate-400">{order.customer.email}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{order.items_count} units</td>
                      <td className="py-3 px-3 font-bold text-cyan-300">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                            badge.bg,
                            badge.text,
                            badge.border
                          )}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end">
                        <button
                          onClick={() => setInspectingOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
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

      {/* Inspect Modal */}
      <OrderDetailModal
        order={inspectingOrder}
        onClose={() => setInspectingOrder(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
