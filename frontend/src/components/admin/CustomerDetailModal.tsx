'use client';

import React from 'react';
import { AdminCustomer } from '@/types/admin';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { X, User, Mail, Phone, Calendar, ShoppingBag, ShieldCheck, ShieldAlert, Tag, FileText } from 'lucide-react';
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
            <div className="w-9 h-9 rounded-xl bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-mono font-bold text-xs flex items-center justify-center">
              {customer.name[0].toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold font-display text-fg-primary flex items-center gap-2">
                <span>{customer.name}</span>
                {customer.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                )}
              </div>
              <div className="text-[10px] font-mono text-fg-muted">{customer.email}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors"
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
              <div className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
                {formatCurrency(customer.total_spent)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1">
              <span className="text-[10px] text-fg-muted uppercase">Acquisitions</span>
              <div className="text-sm font-bold text-fg-primary">{customer.orders_count} Orders</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1">
              <span className="text-[10px] text-fg-muted uppercase">Status</span>
              <div className="text-sm font-bold">
                <span
                  className={
                    customer.status === 'ACTIVE'
                      ? 'text-status-success'
                      : 'text-status-error'
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
              <span className="text-fg-primary font-bold">{customer.phone_number || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <span className="text-fg-muted">Member Since</span>
              <span className="text-fg-primary">{formatDate(customer.created_at)}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <span className="text-fg-muted">Last Active Order</span>
              <span className="text-fg-primary">{formatDate(customer.last_order_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">Registered Vault Addresses</span>
              <span className="text-fg-primary">{customer.addresses_count} Saved</span>
            </div>
          </div>

          {/* Private Notes */}
          {customer.notes && (
            <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border-subtle space-y-1.5">
              <div className="flex items-center gap-1.5 text-fg-muted text-[10px] uppercase">
                <FileText className="w-3 h-3" />
                <span>Internal Atelier Director Notes</span>
              </div>
              <p className="text-fg-secondary italic">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-secondary/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(customer.id)}
            className={`text-xs ${
              customer.status === 'ACTIVE'
                ? 'border-status-error/30 text-status-error hover:bg-status-error/10'
                : 'border-status-success/30 text-status-success hover:bg-status-success/10'
            }`}
          >
            {customer.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="text-xs bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
