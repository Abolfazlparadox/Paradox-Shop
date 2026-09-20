'use client';

import React from 'react';
import { AdminCustomer } from '@/types/api';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { X, ShieldCheck, ShieldAlert, ShoppingBag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CustomerDetailModalProps {
  customer: AdminCustomer | null;
  onClose: () => void;
  onToggleStatus: (customerId: string) => Promise<void>;
}

export function CustomerDetailModal({ customer, onClose, onToggleStatus }: CustomerDetailModalProps) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent text-accent-fg border border-border-subtle font-mono font-bold text-xs flex items-center justify-center shadow-subtle">
              {customer.name ? customer.name[0].toUpperCase() : 'P'}
            </div>
            <div>
              <div className="text-sm font-bold font-display text-fg-primary flex items-center gap-2">
                <span>{customer.name || 'Patron'}</span>
                {customer.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </div>
              <div className="text-[10px] font-mono text-fg-muted">{customer.email}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 font-mono text-xs overflow-y-auto max-h-[70vh]">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1">
              <span className="text-[10px] text-fg-muted uppercase">Lifetime Value</span>
              <div className="text-sm font-bold text-fg-primary">
                {formatCurrency(Number(customer.total_spent || 0))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1">
              <span className="text-[10px] text-fg-muted uppercase">Acquisitions</span>
              <div className="text-sm font-bold text-fg-primary">{customer.orders_count} Orders</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1">
              <span className="text-[10px] text-fg-muted uppercase">Clearance</span>
              <div className="text-sm font-bold">
                <span
                  className={
                    customer.status === 'ACTIVE'
                      ? 'text-emerald-500 font-bold'
                      : 'text-rose-500 font-bold'
                  }
                >
                  {customer.status}
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Information */}
          <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <span className="text-fg-muted">Mobile Contact</span>
              <span className="text-fg-primary font-bold">{customer.phone_number || 'Not Registered'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <span className="text-fg-muted">Registration Date</span>
              <span className="text-fg-primary">{formatDate(customer.created_at)}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <span className="text-fg-muted">Staff Clearance</span>
              <span className="text-fg-primary font-bold">
                {customer.is_staff ? (customer.is_superuser ? 'Superuser' : 'Staff Admin') : 'Patron'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">Saved Addresses</span>
              <span className="text-fg-primary">{customer.addresses_count} Registered</span>
            </div>
          </div>

          {/* Orders History Summary if present */}
          {customer.orders && customer.orders.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold font-display text-fg-primary">Recent Orders</span>
              <div className="space-y-1.5">
                {customer.orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    className="p-2.5 rounded-lg bg-bg-secondary/50 border border-border-subtle flex items-center justify-between"
                  >
                    <span className="font-bold text-fg-primary">{ord.order_number}</span>
                    <span className="text-fg-muted">{ord.status}</span>
                    <span className="font-bold text-fg-primary">
                      {formatCurrency(Number(ord.total))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-secondary/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(customer.id)}
            className={
              customer.status === 'ACTIVE'
                ? 'text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer'
                : 'text-xs text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer'
            }
          >
            {customer.status === 'ACTIVE' ? 'Suspend Account' : 'Restore Account Clearance'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-border-subtle hover:bg-bg-secondary text-fg-primary cursor-pointer"
          >
            Close Dossier
          </Button>
        </div>
      </div>
    </div>
  );
}
