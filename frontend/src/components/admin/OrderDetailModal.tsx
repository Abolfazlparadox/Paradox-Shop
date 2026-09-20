'use client';

import React, { useState } from 'react';
import { AdminOrder } from '@/types/api';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  X,
  ShoppingBag,
  User,
  MapPin,
  Printer,
  RotateCcw,
  Truck,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';

interface OrderDetailModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
}

export function OrderDetailModal({ order, onClose, onStatusUpdate, onCancelOrder }: OrderDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(order?.status?.toLowerCase() || 'pending');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  if (!order) return null;

  const handleSaveStatus = async () => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(order.id, selectedStatus);
      notify.success('Order Updated', `Order ${order.order_number} shifted to ${selectedStatus.toUpperCase()}.`);
    } catch (err: any) {
      notify.error('Update Failed', err?.response?.data?.status || 'Failed to update order state.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancelOrder) return;
    setIsCancelling(true);
    try {
      await onCancelOrder(order.id);
      notify.success('Order Cancelled', `Order ${order.order_number} cancelled and stock replenished.`);
      onClose();
    } catch (err: any) {
      notify.error('Cancellation Failed', err?.response?.data?.detail || 'Unable to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrintInvoice = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    notify.success('Copied', 'Tracking code copied to clipboard.');
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const totalNum = Number(order.total || order.total_amount || 0);
  const shippingNum = Number(order.shipping_cost || 0);
  const discountNum = Number(order.discount_amount || 0);
  const subtotalNum = Number(order.subtotal || totalNum - shippingNum + discountNum);
  const trackingCode = order.shipment?.tracking_code || order.tracking_code;
  const shippingMethodName = order.shipment?.shipping_method?.name || order.shipping_method_name || 'Standard Shipping';
  const carrierName = order.shipment?.carrier_name || 'Paradox Express Fleet';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary my-4 sm:my-8 max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border-subtle bg-bg-secondary/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent text-accent-fg border border-border-subtle">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold font-display text-fg-primary">
                  Order {order.order_number}
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {order.status}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-fg-muted font-mono">
                Acquired on {formatDate(order.created_at)}
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
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Quick Status Control Bar */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-fg-primary font-display">Fulfillment State Machine</div>
              <div className="text-[11px] text-fg-muted">Transitions validated against server lifecycle rules</div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-amber-500/80"
              >
                <option value="pending">PENDING</option>
                <option value="processing">PROCESSING</option>
                <option value="shipped">SHIPPED</option>
                <option value="delivered">DELIVERED</option>
                <option value="cancelled">CANCELLED</option>
                <option value="refunded">REFUNDED</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveStatus}
                isLoading={isUpdating}
                className="text-xs font-semibold rounded-xl cursor-pointer"
              >
                Apply State
              </Button>

              {order.status?.toUpperCase() !== 'CANCELLED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  isLoading={isCancelling}
                  className="text-xs text-status-error hover:bg-status-error/10 border-status-error/30 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Cancel & Restock
                </Button>
              )}
            </div>
          </div>

          {/* Grid Information Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Dossier */}
            <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-display text-fg-primary pb-2 border-b border-border-subtle">
                <User className="w-3.5 h-3.5 text-fg-muted" />
                <span>Patron Identity</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-fg-muted">Full Name:</span>
                  <span className="text-fg-primary font-semibold truncate max-w-[120px]">{order.customer?.name || 'Anonymous Patron'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Email:</span>
                  <span className="text-fg-primary truncate max-w-[120px] font-semibold">{order.customer?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Contact:</span>
                  <span className="text-fg-primary">{order.customer?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-display text-fg-primary pb-2 border-b border-border-subtle">
                <MapPin className="w-3.5 h-3.5 text-fg-muted" />
                <span>Delivery Address</span>
              </div>
              {order.shipping_address ? (
                <div className="space-y-1 text-xs">
                  <div className="font-medium text-fg-primary">
                    {order.shipping_address.recipient_name} ({order.shipping_address.recipient_phone})
                  </div>
                  <div className="text-fg-secondary">
                    {order.shipping_address.province}, {order.shipping_address.city}
                  </div>
                  <div className="text-fg-muted text-[11px] truncate">
                    {order.shipping_address.address_line}
                  </div>
                  <div className="text-fg-muted text-[10px] font-mono">
                    Postal Code: {order.shipping_address.postal_code}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-fg-muted font-mono">No shipping address recorded.</div>
              )}
            </div>

            {/* Shipping Method & Logistics */}
            <div className="p-4 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-3">
              <div className="flex items-center justify-between text-xs font-bold font-display text-fg-primary pb-2 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Logistics & Courier</span>
                </div>
                {order.shipment?.status && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                    {order.shipment.status_display || order.shipment.status}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Method:</span>
                  <span className="text-fg-primary font-semibold truncate max-w-[130px]" title={shippingMethodName}>
                    {shippingMethodName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Shipping Fee:</span>
                  <span className="text-emerald-500 font-bold">
                    {shippingNum === 0 ? 'Free' : formatCurrency(shippingNum)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Carrier:</span>
                  <span className="text-fg-primary truncate max-w-[130px]" title={carrierName}>
                    {carrierName}
                  </span>
                </div>
                {trackingCode && (
                  <div className="flex justify-between items-center pt-1 border-t border-border-subtle/60">
                    <span className="text-fg-muted">Tracking:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-600 dark:text-amber-400">{trackingCode}</span>
                      <button
                        onClick={() => handleCopyTracking(trackingCode)}
                        className="p-1 rounded hover:bg-bg-elevated text-fg-muted hover:text-fg-primary transition-colors cursor-pointer"
                        title="Copy Tracking Number"
                      >
                        {copiedTracking ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ordered Line Items Table */}
          <div className="space-y-3">
            <div className="text-xs font-bold font-display text-fg-primary uppercase tracking-wider">
              Consignment Items ({order.items?.length || 0})
            </div>
            <div className="rounded-xl border border-border-subtle overflow-x-auto bg-bg-secondary/30">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-secondary border-b border-border-subtle font-mono text-[10px] text-fg-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Artifact Name</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Original Price</th>
                    <th className="px-4 py-2.5 text-right">Promo Discount</th>
                    <th className="px-4 py-2.5 text-right">Final Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono">
                  {order.items?.map((item: any) => {
                    const originalPrice = item.original_unit_price
                      ? Number(item.original_unit_price)
                      : Number(item.unit_price);
                    const itemDiscount = item.discount_amount ? Number(item.discount_amount) : 0;
                    const finalUnitPrice = Number(item.unit_price);

                    return (
                      <tr key={item.id} className="hover:bg-bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-fg-primary">
                          {item.product_name}
                          {item.variant_name && (
                            <span className="block text-[11px] text-fg-muted font-normal">
                              Variant: {item.variant_name}
                            </span>
                          )}
                          {item.promotion_snapshot?.name && (
                            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                              {item.promotion_snapshot.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-fg-muted">{item.sku || 'N/A'}</td>
                        <td className="px-4 py-3 text-center text-fg-primary">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-fg-muted line-through">
                          {itemDiscount > 0 ? formatCurrency(originalPrice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                          {itemDiscount > 0 ? `-${formatCurrency(itemDiscount)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-fg-secondary">
                          {formatCurrency(finalUnitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-fg-primary">
                          {formatCurrency(Number(item.total_price))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Summary */}
          <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle space-y-2 font-mono text-xs max-w-sm ms-auto">
            <div className="flex justify-between text-fg-secondary">
              <span>Items Subtotal:</span>
              <span className="text-fg-primary">{formatCurrency(subtotalNum)}</span>
            </div>

            {/* Coupon Code Badge & Discount */}
            {order.coupon_code && (
              <div className="flex justify-between items-center text-emerald-400">
                <span className="flex items-center gap-1">
                  <span>Voucher Code:</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold text-[10px] text-emerald-400">
                    {order.coupon_code}
                  </span>
                </span>
                {order.coupon_snapshot?.calculated_discount && (
                  <span>-{formatCurrency(Number(order.coupon_snapshot.calculated_discount))}</span>
                )}
              </div>
            )}

            {discountNum > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Total Discount:</span>
                <span>-{formatCurrency(discountNum)}</span>
              </div>
            )}

            <div className="flex justify-between text-fg-secondary">
              <span>Shipping & Logistics:</span>
              <span className="text-fg-primary">{shippingNum === 0 ? 'Free' : formatCurrency(shippingNum)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-fg-primary pt-2 border-t border-border-subtle">
              <span>Total Settlement:</span>
              <span className="text-amber-600 dark:text-amber-400 font-display">{formatCurrency(totalNum)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-border-subtle bg-bg-secondary/60 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Dismiss Dossier
          </Button>
        </div>
      </div>
    </div>
  );
}
