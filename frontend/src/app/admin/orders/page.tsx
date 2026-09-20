'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useAdminOrders,
  useBulkUpdateOrders,
  useCancelOrder,
  useUpdateOrderStatus,
} from '@/hooks/useAdminData';
import { AdminOrder } from '@/types/api';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialViewId = searchParams.get('view');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [inspectingOrder, setInspectingOrder] = useState<AdminOrder | null>(null);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useAdminOrders({
    status: statusFilter,
    search: searchQuery,
  });

  const updateStatusMutation = useUpdateOrderStatus();
  const cancelOrderMutation = useCancelOrder();
  const bulkStatusMutation = useBulkUpdateOrders();

  // Find initial order if specified in query param
  React.useEffect(() => {
    if (initialViewId && orders.length > 0) {
      const match = orders.find((o) => o.id === initialViewId);
      if (match) setInspectingOrder(match);
    }
  }, [initialViewId, orders]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const updated = await updateStatusMutation.mutateAsync({ id: orderId, status });
      notify.success('Status Updated', `Order ${updated.order_number} shifted to ${status.toUpperCase()}.`);
      if (inspectingOrder?.id === orderId) {
        setInspectingOrder(updated);
      }
    } catch (err: any) {
      notify.error('Update Failed', err?.response?.data?.status || 'Failed to update order state.');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrderMutation.mutateAsync({ id: orderId });
    } catch (err: any) {
      throw err;
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

  const handleBulkStatus = async (status: string) => {
    if (selectedOrderIds.length === 0) return;
    try {
      await bulkStatusMutation.mutateAsync({ orderIds: selectedOrderIds, status });
      notify.success('Batch Complete', `${selectedOrderIds.length} orders transitioned to ${status}.`);
      setSelectedOrderIds([]);
    } catch {
      notify.error('Batch Error', 'Unable to apply bulk transition.');
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order Number', 'Date', 'Customer Name', 'Customer Email', 'Items Count', 'Total (Toman)', 'Status'];
    const rows = orders.map((o) => [
      o.order_number,
      o.created_at,
      `"${o.customer?.name || 'Patron'}"`,
      o.customer?.email,
      o.items?.length || 0,
      o.total,
      o.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paradox_orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success('Manifest Exported', 'Order dispatch manifest saved to CSV.');
  };

  const statusBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
    processing: { label: 'Processing', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
    shipped: { label: 'Dispatched', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
    delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    cancelled: { label: 'Cancelled', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
    refunded: { label: 'Refunded', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-amber-500" />
            <span>Order Fulfillment & Dispatch Manifest</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Real-time lifecycle management, address verification, and shipment routing
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary cursor-pointer"
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export CSV Manifest
        </Button>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-card flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, patron email, name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-amber-500/80 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                statusFilter === tab
                  ? 'bg-accent text-accent-fg font-semibold shadow-subtle'
                  : 'text-fg-secondary hover:text-fg-primary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar (When Rows Selected) */}
      {selectedOrderIds.length > 0 && (
        <div className="p-3 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-4 text-xs font-mono text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-amber-500" />
            <span className="font-bold">{selectedOrderIds.length} orders selected</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-fg-muted hidden sm:inline">Set Status:</span>
            {['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => handleBulkStatus(st.toLowerCase())}
                disabled={bulkStatusMutation.isPending}
                className="px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-secondary border border-border-subtle text-fg-primary text-[10px] font-bold uppercase transition-colors cursor-pointer"
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-card overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={6} />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
            <ShoppingBag className="w-8 h-8 mx-auto opacity-50 text-fg-muted" />
            <p>No orders matched the active filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button onClick={handleSelectAll} className="cursor-pointer">
                      {selectedOrderIds.length === orders.length && orders.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4 text-fg-muted" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Patron & Destination</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-center">Fulfillment Status</th>
                  <th className="py-3.5 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {orders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const statusKey = order.status.toLowerCase();
                  const badge = statusBadges[statusKey] || statusBadges.pending;

                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        'hover:bg-bg-secondary/40 transition-colors',
                        isSelected && 'bg-accent/5'
                      )}
                    >
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => handleToggleSelect(order.id)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4 text-fg-muted" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 font-bold text-fg-primary">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{order.order_number}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-fg-muted text-[11px]">
                        {formatDate(order.created_at)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-fg-primary truncate max-w-[150px]">
                          {order.customer?.name || 'Patron'}
                        </div>
                        <div className="text-[10px] text-fg-muted truncate max-w-[150px]">
                          {order.shipping_address
                            ? `${order.shipping_address.city}, ${order.shipping_address.province}`
                            : order.customer?.email}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-bg-secondary border border-border-subtle text-[11px]">
                          {order.items?.length || order.items_count || 0} items
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-fg-primary">
                        {formatCurrency(Number(order.total || 0))}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <select
                          value={order.status.toLowerCase()}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          aria-label={`Update status for ${order.order_number}`}
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-bg-secondary focus:outline-none cursor-pointer',
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

                      <td className="py-3 px-4 text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectingOrder(order)}
                          className="text-[11px] font-mono px-2.5 py-1 border-border-subtle hover:bg-bg-secondary text-fg-primary cursor-pointer"
                          rightIcon={<ExternalLink className="w-3 h-3" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Inspector */}
      {inspectingOrder && (
        <OrderDetailModal
          order={inspectingOrder}
          onClose={() => setInspectingOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          onCancelOrder={handleCancelOrder}
        />
      )}
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
