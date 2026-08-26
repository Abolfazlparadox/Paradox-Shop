'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useTrackShipment } from '@/features/shipping/hooks/use-shipping';
import { ShipmentTrackingCard } from '@/features/shipping/components/ShipmentTrackingCard';
import { OrderStatus } from '@/types/api';
import { Truck, Search, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export default function TrackOrderPage() {
  const [searchInput, setSearchInput] = useState('');
  const [queryCode, setQueryCode] = useState('');

  const { data: shipment, isLoading, isError } = useTrackShipment(queryCode);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setQueryCode(searchInput.trim().toUpperCase());
    }
  };

  const mapShipmentToOrderStatus = (sStatus?: string): OrderStatus => {
    switch (sStatus) {
      case 'delivered':
        return 'DELIVERED';
      case 'in_transit':
      case 'out_for_delivery':
        return 'SHIPPED';
      case 'label_created':
        return 'PROCESSING';
      case 'failed':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  };

  return (
    <main className="py-12 md:py-20 bg-bg-primary min-h-screen text-left transition-colors">
      <Container size="md" className="space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 font-semibold">
            <Truck className="w-3.5 h-3.5" />
            <span>REAL-TIME COURIER DISPATCH RADAR</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-display text-fg-primary tracking-tight">
            Paradox Shipment Tracking Radar
          </h1>
          <p className="text-xs sm:text-sm text-fg-muted max-w-lg mx-auto leading-relaxed">
            Enter your unique parcel tracking code (e.g. <code className="font-mono text-amber-600 dark:text-amber-400 font-bold">PDX-XXXXXXXX</code>) to inspect live packaging, courier transit, and delivery milestones.
          </p>
        </div>

        {/* Search Bar Form */}
        <form
          onSubmit={handleSearch}
          className="relative max-w-xl mx-auto flex items-center bg-bg-elevated border border-border-subtle focus-within:border-amber-500/60 rounded-2xl p-1.5 shadow-card transition-all"
        >
          <div className="pl-3.5 pr-2 text-fg-muted">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter tracking code (e.g. PDX-9A8B7C6D)"
            className="w-full bg-transparent text-sm text-fg-primary placeholder-fg-muted focus:outline-none font-mono py-2.5 px-2 text-left"
          />
          <Button
            type="submit"
            size="md"
            variant="primary"
            isLoading={isLoading}
            disabled={!searchInput.trim() || isLoading}
            className="shrink-0 text-xs font-semibold rounded-xl px-5"
          >
            Track Parcel
          </Button>
        </form>

        {/* Live Result Area */}
        {queryCode && (
          <div className="space-y-6 pt-4">
            {isLoading && (
              <div className="h-64 rounded-3xl bg-bg-elevated border border-border-subtle animate-pulse" />
            )}

            {isError && (
              <div className="p-8 rounded-3xl bg-status-error/10 border border-status-error/20 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-status-error mx-auto" />
                <h3 className="text-sm font-bold text-fg-primary">No Shipment Found</h3>
                <p className="text-xs text-fg-muted max-w-md mx-auto">
                  Please verify tracking code <span className="font-mono text-status-error font-bold">{queryCode}</span> and confirm it matches the code provided on your invoice or order dashboard.
                </p>
              </div>
            )}

            {shipment && (
              <ShipmentTrackingCard
                shipment={shipment}
                orderStatus={mapShipmentToOrderStatus(shipment.status)}
              />
            )}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-10 border-t border-border-subtle">
          <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle shadow-card space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-fg-primary font-display">Shock-Resistant Luxury Hardbox</h4>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              Every precision piece is sealed in tamper-evident security packaging with custom velvet-lined casing.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle shadow-card space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-fg-primary font-display">100% Full Transit Insurance</h4>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              All consignments are fully insured from central vault departure until signed handover at your door.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-bg-elevated border border-border-subtle shadow-card space-y-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-border-subtle flex items-center justify-center text-fg-primary">
              <Truck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-fg-primary font-display">Dedicated VIP Courier Fleet</h4>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              Expedited metropolitan courier transit managed by dedicated Paradox logistics specialists.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
