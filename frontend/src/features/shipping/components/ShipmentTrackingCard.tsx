'use client';

import React, { useState } from 'react';
import { Shipment, OrderStatus } from '@/types/api';
import { notify } from '@/stores/notifications';
import { OrderTimeline } from '@/features/orders/components/OrderTimeline';
import {
  Truck,
  Copy,
  Check,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ShipmentTrackingCardProps {
  shipment?: Shipment | null;
  orderStatus: OrderStatus;
  className?: string;
}

export function ShipmentTrackingCard({
  shipment,
  orderStatus,
  className = '',
}: ShipmentTrackingCardProps) {
  const [copied, setCopied] = useState(false);

  const trackingCode = shipment?.tracking_code;
  const carrierName = shipment?.carrier_name || 'Paradox Express Fleet';
  const isFailed = orderStatus?.toUpperCase() === 'CANCELLED' || shipment?.status === 'failed';

  const handleCopyCode = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      notify.success('Copied', 'Shipment tracking code copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusLabel = orderStatus?.toUpperCase() || 'PENDING';

  return (
    <div
      className={cn(
        'rounded-2xl bg-bg-elevated border border-border-subtle shadow-card p-5 sm:p-7 text-left space-y-6 transition-colors',
        className
      )}
    >
      {/* Header with Tracking Number & Carrier Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-amber-600 dark:text-amber-400">
              Fulfillment & Delivery Radar
            </span>
            {isFailed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-error/10 text-status-error border border-status-error/20">
                <AlertCircle className="w-3 h-3" />
                CANCELLED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                {statusLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-xl font-bold text-fg-primary font-mono tracking-wider">
              {trackingCode || 'PENDING DISPATCH'}
            </h3>
            {trackingCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-muted hover:text-fg-primary transition-colors cursor-pointer"
                title="Copy tracking code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Carrier Info */}
        <div className="flex flex-wrap items-center gap-3.5 text-xs text-fg-muted">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle">
            <Truck className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-fg-secondary">Carrier: <strong className="text-fg-primary font-medium">{carrierName}</strong></span>
          </div>
          {shipment?.recipient_city && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle">
              <MapPin className="w-3.5 h-3.5 text-fg-muted" />
              <span className="text-fg-secondary">Destination: <strong className="text-fg-primary font-medium">{shipment.recipient_province}, {shipment.recipient_city}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Authoritative Order Lifecycle Stepper */}
      <OrderTimeline status={orderStatus} shipment={shipment} />

      {/* Footer Timestamps / Dispatch Notes */}
      {(shipment?.shipped_at || shipment?.delivered_at || shipment?.notes) && (
        <div className="pt-4 border-t border-border-subtle/80 flex flex-wrap items-center justify-between gap-3 text-xs text-fg-muted font-mono">
          <div className="flex flex-wrap items-center gap-4">
            {shipment.shipped_at && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Dispatched: {new Date(shipment.shipped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {shipment.delivered_at && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Delivered: {new Date(shipment.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
          {shipment.notes && (
            <span className="text-fg-secondary italic">
              Note: {shipment.notes}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
