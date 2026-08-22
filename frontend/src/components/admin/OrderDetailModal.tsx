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
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-slate-200 my-8 max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
              PX
            </div>
            <div>
              <div className="text-sm font-bold font-display text-white flex items-center gap-2">
                <span>Order {order.order_number}</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {order.payment_status}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Placed on {formatDate(order.created_at)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
              className="text-xs font-mono border-slate-800 hover:bg-slate-800 text-slate-300"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {isPrinting ? 'Generating...' : 'Print Invoice'}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Order Lifecycle Control */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                  Lifecycle Status Transition
                </span>
                <p className="text-[11px] text-slate-400">
                  Select new status and synchronize fulfillment state
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as AdminOrderStatus)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveStatus}
                  isLoading={isUpdating}
                  className="text-xs font-mono bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold"
                >
                  Apply Change
                </Button>
              </div>
            </div>

            {order.tracking_code && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Courier Tracking Code:</span>
                <span className="text-white font-bold">{order.tracking_code}</span>
              </div>
            )}
          </div>

          {/* Grid: Customer & Delivery Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Customer Details */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <User className="w-4 h-4" />
                <span className="uppercase tracking-wider">Patron Profile</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="text-white font-bold font-display text-sm">{order.customer.name}</div>
                <div>Email: {order.customer.email}</div>
                <div>Phone: {order.customer.phone}</div>
                <div className="text-[10px] text-slate-400">Client ID: {order.customer.id}</div>
              </div>
            </div>

            {/* Shipping Destination */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <MapPin className="w-4 h-4" />
                <span className="uppercase tracking-wider">Destination Address</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="text-white font-bold">{order.shipping_address.recipient_name}</div>
                <div>
                  {order.shipping_address.province}, {order.shipping_address.city}
                </div>
                <div className="text-slate-400 text-[11px] leading-relaxed">
                  {order.shipping_address.address_line}
                </div>
                <div className="text-[10px] text-slate-400">
                  Postal Code: {order.shipping_address.postal_code}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                Artifact Breakdown ({order.items.length} Lines)
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Item & SKU</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-end">Unit Price</th>
                    <th className="py-2.5 px-3 text-end">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/30 text-slate-300">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-3">
                        <div className="font-semibold font-display text-white">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400">{item.sku}</div>
                      </td>
                      <td className="py-3 px-3 text-center">{item.quantity}</td>
                      <td className="py-3 px-3 text-end">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-3 text-end font-bold text-white">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs font-mono max-w-sm ms-auto">
            <div className="flex items-center justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="text-slate-200">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Shipping & Insurance:</span>
              <span className="text-slate-200">{order.shipping_cost === 0 ? 'Complimentary' : formatCurrency(order.shipping_cost)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span>Atelier VIP Discount:</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-bold text-cyan-300 pt-2 border-t border-slate-800">
              <span>Total Settlement:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Audit Trail Verified</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-800 hover:bg-slate-800 text-slate-200"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
