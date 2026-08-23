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
      o.total_amount,
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
    PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
    PROCESSING: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
    SHIPPED: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
    DELIVERED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    CANCELLED: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
    REFUNDED: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            <span>Orders Dispatch & Fulfillment</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Manage fulfillment workflows, courier manifests, and financial settlements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Manifest
          </Button>
        </div>
      </div>

      {/* Filter Bar & Status Tabs */}
      <div className="space-y-4 p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl backdrop-blur-xl transition-colors">
        {/* Status Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-none font-mono text-xs">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer',
                statusFilter === tab.id
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary border border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Bulk Operations Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border-subtle/60">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-fg-muted absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Order #, Patron or Email..."
              className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary placeholder-fg-muted focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Bulk Action Controls */}
          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-2 p-1 bg-bg-secondary rounded-xl border border-cyan-500/30 text-xs font-mono w-full sm:w-auto">
              <span className="px-2 text-cyan-600 dark:text-cyan-300 font-bold">
                {selectedOrderIds.length} Selected:
              </span>
              <button
                onClick={() => handleBulkStatus('PROCESSING')}
                disabled={isBulkUpdating}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 transition-colors"
              >
                Mark Processing
              </button>
              <button
                onClick={() => handleBulkStatus('SHIPPED')}
                disabled={isBulkUpdating}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-600 dark:text-sky-300 border border-sky-500/30 transition-colors"
              >
                Dispatch
              </button>
              <button
                onClick={() => handleBulkStatus('DELIVERED')}
                disabled={isBulkUpdating}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 transition-colors"
              >
                Deliver
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Orders Master Data Table */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : orders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-elevated border border-border-subtle font-mono text-xs text-fg-muted space-y-2">
          <ShoppingBag className="w-8 h-8 text-fg-muted mx-auto opacity-50" />
          <p>No acquisitions match current filtration parameters.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-bg-elevated border border-border-subtle overflow-hidden shadow-sm dark:shadow-xl transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-fg-muted uppercase text-[10px] tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <button
                      onClick={handleSelectAll}
                      className="text-fg-muted hover:text-fg-primary flex items-center cursor-pointer"
                    >
                      {selectedOrderIds.length === orders.length ? (
                        <CheckSquare className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Order Record</th>
                  <th className="py-3.5 px-4">Patron & Destination</th>
                  <th className="py-3.5 px-4">Artifacts</th>
                  <th className="py-3.5 px-4">Gross Total</th>
                  <th className="py-3.5 px-4">Fulfillment Status</th>
                  <th className="py-3.5 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {orders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const badge = statusBadges[order.status] || statusBadges.PENDING;

                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        'hover:bg-bg-secondary/40 transition-colors',
                        isSelected && 'bg-cyan-500/5'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleSelect(order.id)}
                          className="text-fg-muted hover:text-fg-primary flex items-center cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Order Number & Timestamp */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-fg-primary flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
                          <span>{order.order_number}</span>
                        </div>
                        <div className="text-[10px] text-fg-muted">{formatDate(order.created_at)}</div>
                      </td>

                      {/* Customer Name & City */}
                      <td className="py-3.5 px-4">
                        <div className="text-fg-primary font-semibold font-display">
                          {order.customer.name}
                        </div>
                        <div className="text-[10px] text-fg-muted truncate max-w-[150px]">
                          {order.shipping_address.city}, {order.shipping_address.province}
                        </div>
                      </td>

                      {/* Items Preview */}
                      <td className="py-3.5 px-4">
                        <div className="text-fg-primary truncate max-w-[170px]">
                          {order.items[0]?.product_name}
                        </div>
                        {order.items.length > 1 && (
                          <div className="text-[10px] text-fg-muted">
                            +{order.items.length - 1} additional artifacts
                          </div>
                        )}
                      </td>

                      {/* Financial Total */}
                      <td className="py-3.5 px-4 font-bold text-cyan-600 dark:text-cyan-300">
                        {formatCurrency(order.total_amount)}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value as AdminOrderStatus)}
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border bg-bg-secondary focus:outline-none cursor-pointer',
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
                          <option value="REFUNDED">Refunded</option>
                        </select>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3.5 px-4 text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectingOrder(order)}
                          className="text-[11px] font-mono border-border-subtle hover:bg-bg-secondary text-fg-primary px-2.5 py-1 h-auto"
                        >
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
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
    <Suspense fallback={<SkeletonTable rows={8} />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
