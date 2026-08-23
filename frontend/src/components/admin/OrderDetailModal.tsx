'use client';

import React, { useState } from 'react';
import { AdminOrder, AdminOrderStatus } from '@/types/admin';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  X,
  ShoppingBag,
  User,
  MapPin,
  CreditCard,
  Truck,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';

interface OrderDetailModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onStatusUpdate: (orderId: string, status: AdminOrderStatus) => Promise<void>;
}

export function OrderDetailModal({ order, onClose, onStatusUpdate }: OrderDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<AdminOrderStatus>(order?.status || 'PENDING');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!order) return null;

  const handleSaveStatus = async () => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(order.id, selectedStatus);
      notify.success('Order Updated', `Order ${order.order_number} is now ${selectedStatus}.`);
    } catch {
      notify.error('Update Failed', 'Failed to update order state.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintInvoice = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary my-8 max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display text-fg-primary">
                  Order {order.order_number}
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-fg-muted font-mono">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintInvoice}
              disabled={isPrinting}
              className="p-2 rounded-xl bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-secondary hover:text-fg-primary transition-colors cursor-pointer"
              title="Print Order Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Status Control Bar */}
          <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-fg-primary">Fulfillment State</div>
              <div className="text-[11px] text-fg-muted">Update workflow progression for dispatch</div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as AdminOrderStatus)}
                className="px-3 py-1.5 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveStatus}
                isLoading={isUpdating}
                className="text-xs bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold"
              >
                Apply State
              </Button>
            </div>
          </div>

          {/* Grid Information Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Dossier */}
            <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-display text-fg-primary pb-2 border-b border-border-subtle">
                <User className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>Patron Identity</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-fg-muted">Full Name:</span>
                  <span className="text-fg-primary font-semibold">{order.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Email:</span>
                  <span className="text-cyan-600 dark:text-cyan-300">{order.customer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Contact:</span>
                  <span className="text-fg-primary">{order.customer.phone}</span>
                </div>
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-display text-fg-primary pb-2 border-b border-border-subtle">
                <MapPin className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>Delivery Address</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-medium text-fg-primary">
                  {order.shipping_address.recipient_name} ({order.shipping_address.recipient_phone})
                </div>
                <div className="text-fg-secondary">
                  {order.shipping_address.province}, {order.shipping_address.city}
                </div>
                <div className="text-fg-muted text-[11px]">
                  {order.shipping_address.address_line}
                </div>
                <div className="text-fg-muted text-[10px] font-mono">
                  Postal Code: {order.shipping_address.postal_code}
                </div>
              </div>
            </div>
          </div>

          {/* Purchased Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-display text-fg-primary">
                Order Items ({order.items.length})
              </span>
              <span className="text-[11px] font-mono text-fg-muted">
                Method: {order.payment_method}
              </span>
            </div>

            <div className="rounded-xl border border-border-subtle overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-secondary text-fg-muted font-mono text-[10px] uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Artifact</th>
                    <th className="px-4 py-2.5">SKU / Variant</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-secondary/40">
                      <td className="px-4 py-3 font-semibold text-fg-primary">
                        {item.product_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">
                        {item.sku} {item.variant_name ? `• ${item.variant_name}` : ''}
                      </td>
                      <td className="px-4 py-3 font-mono text-center text-fg-primary">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 font-mono text-right text-fg-secondary">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 font-mono text-right font-bold text-fg-primary">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 p-4 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-2 text-xs font-mono">
              <div className="flex justify-between text-fg-secondary">
                <span>Items Subtotal:</span>
                <span>{formatCurrency((order.total || order.total_amount || 0) - (order.shipping_fee || order.shipping_cost || 0) + (order.discount_amount || 0))}</span>
              </div>
              {order.discount_amount ? (
                <div className="flex justify-between text-status-success">
                  <span>Voucher Discount:</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-fg-secondary">
                <span>Shipping Fee:</span>
                <span>{formatCurrency(order.shipping_fee || order.shipping_cost || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-fg-primary pt-2 border-t border-border-subtle">
                <span>Net Total:</span>
                <span className="text-cyan-600 dark:text-cyan-400">{formatCurrency(order.total || order.total_amount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-secondary/60">
          <span className="text-[11px] font-mono text-fg-muted">
            Tracking ID: <span className="text-fg-primary font-bold">{order.id}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-border-subtle hover:bg-bg-secondary text-fg-primary"
          >
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
}
