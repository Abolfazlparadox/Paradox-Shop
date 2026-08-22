'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOrderDetail, useCancelOrder } from '@/features/orders/queries/useOrders';
import { OrderTimeline } from '@/features/orders/components/OrderTimeline';
import { CreateReviewModal } from '@/features/reviews/components/CreateReviewModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { formatDate } from '@/lib/utils/format';
import {
  Package,
  CreditCard,
  XCircle,
  MapPin,
  FileText,
  Star,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const { data: order, isLoading, isError, error } = useOrderDetail(orderId);
  const cancelMutation = useCancelOrder();

  const [reviewProduct, setReviewProduct] = useState<{ id: string; name: string } | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-elevated rounded-md animate-pulse" />
        <div className="h-40 bg-bg-elevated rounded-xl animate-pulse" />
        <div className="h-64 bg-bg-elevated rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-8 bg-bg-elevated border border-border-subtle rounded-xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-status-error mx-auto" />
        <h2 className="text-base font-bold font-display text-fg-primary">
          Order Not Found
        </h2>
        <p className="text-xs text-fg-secondary">
          {error?.message || 'Could not load the requested order.'}
        </p>
        <Link href="/dashboard/orders">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const normalizedStatus = (order.status || '').toUpperCase();
  const isPending = normalizedStatus === 'PENDING';
  const isCancellable = ['PENDING', 'PROCESSING'].includes(normalizedStatus);
  const isDelivered = normalizedStatus === 'DELIVERED';

  const handleCancelOrder = async () => {
    setCancelError(null);
    try {
      await cancelMutation.mutateAsync(order.id);
      setIsCancelConfirmOpen(false);
    } catch (err: any) {
      setCancelError(err.response?.data?.detail || err.message || 'Failed to cancel order.');
    }
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders" className="p-1.5 rounded-md text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono text-fg-primary">
                #{order.order_number}
              </h2>
              <Badge variant={isDelivered ? 'success' : isPending ? 'warning' : 'mono'} size="sm">
                {normalizedStatus}
              </Badge>
            </div>
            <span className="text-xs font-mono text-fg-muted">
              Placed on {formatDate(order.created_at)}
            </span>
          </div>
        </div>

        {/* Header CTAs */}
        <div className="flex items-center gap-2">
          {isPending && (
            <Link href={`/payments/${order.id}`}>
              <Button size="sm" variant="primary" leftIcon={<CreditCard className="w-3.5 h-3.5" />} className="text-xs">
                Pay Now
              </Button>
            </Link>
          )}

          {isCancellable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="text-xs text-status-error hover:bg-status-error/10 hover:border-status-error/30"
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Cancellation Error banner */}
      {cancelError && (
        <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-center gap-2 text-status-error text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Order Status Stepper Timeline */}
      <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 shadow-card space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-fg-muted font-semibold">
          Fulfillment Timeline
        </h3>
        <OrderTimeline status={order.status} />
      </div>

      {/* Items Table & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Items List (8 cols) */}
        <div className="lg:col-span-8 bg-bg-elevated border border-border-subtle rounded-xl p-6 shadow-card space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-fg-muted font-semibold pb-2 border-b border-border-subtle">
            Ordered Artifacts ({order.items?.length || 0})
          </h3>

          <div className="divide-y divide-border-subtle/60">
            {order.items?.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-semibold font-display text-fg-primary block truncate">
                    {item.product_name}
                  </span>
                  {item.variant_sku && (
                    <span className="text-[11px] font-mono text-fg-muted block">
                      SKU: {item.variant_sku} {item.variant_name ? `• ${item.variant_name}` : ''}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-fg-secondary">
                    Quantity: {item.quantity} × <Price amount={item.unit_price} size="sm" />
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <Price amount={item.total_price} size="sm" className="font-semibold" />

                  {/* Review Button for Delivered Orders */}
                  {isDelivered && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewProduct({ id: item.id, name: item.product_name })}
                      leftIcon={<Star className="w-3 h-3 text-amber-400" />}
                      className="text-xs h-8"
                    >
                      Write Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Address & Totals (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Shipping Destination */}
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-5 shadow-card space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-fg-muted font-semibold flex items-center gap-1.5 pb-2 border-b border-border-subtle">
              <MapPin className="w-3.5 h-3.5" />
              Delivery Destination
            </h3>
            {order.shipping_address ? (
              <div className="text-xs space-y-1 text-fg-secondary">
                <div className="font-semibold text-fg-primary">
                  {order.shipping_address.recipient_name}
                </div>
                <div className="font-mono text-[11px]">{order.shipping_address.recipient_phone}</div>
                <p className="text-fg-secondary mt-1">{order.shipping_address.address_line}</p>
                <span className="font-mono text-[10px] text-fg-muted block">
                  {order.shipping_address.province}, {order.shipping_address.city} • {order.shipping_address.postal_code}
                </span>
              </div>
            ) : (
              <span className="text-xs text-fg-muted">No address snapshot.</span>
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-5 shadow-card space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-fg-muted font-semibold pb-2 border-b border-border-subtle">
              Financial Summary
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-fg-secondary">
                <span>Subtotal</span>
                <Price amount={order.subtotal} size="sm" />
              </div>
              <div className="flex justify-between text-fg-secondary">
                <span>Shipping</span>
                <Price amount={order.shipping_cost || '0'} size="sm" />
              </div>
              {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-{order.discount_amount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border-subtle flex justify-between items-baseline text-fg-primary font-bold text-sm">
                <span>Grand Total</span>
                <Price amount={order.total} size="md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 max-w-md w-full space-y-4 shadow-elevated">
            <h3 className="text-base font-bold font-display text-fg-primary">
              Cancel Order #{order.order_number}?
            </h3>
            <p className="text-xs text-fg-secondary leading-relaxed">
              Are you sure you want to cancel this order? Any atomically reserved inventory will be immediately restored to catalog stock.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelConfirmOpen(false)}
                disabled={cancelMutation.isPending}
              >
                Keep Order
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={cancelMutation.isPending}
                onClick={handleCancelOrder}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewProduct && (
        <CreateReviewModal
          isOpen={Boolean(reviewProduct)}
          onClose={() => setReviewProduct(null)}
          productId={reviewProduct.id}
          productName={reviewProduct.name}
        />
      )}
    </div>
  );
}
