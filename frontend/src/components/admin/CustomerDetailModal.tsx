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
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center">
              {customer.name[0].toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold font-display text-white flex items-center gap-2">
                <span>{customer.name}</span>
                {customer.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-400">{customer.email}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 font-mono text-xs overflow-y-auto max-h-[70vh]">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Lifetime Value</span>
              <div className="text-sm font-bold text-cyan-300">
                {formatCurrency(customer.total_spent)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Acquisitions</span>
              <div className="text-sm font-bold text-white">{customer.orders_count} Orders</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Destinations</span>
              <div className="text-sm font-bold text-white">{customer.addresses_count} Addresses</div>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2 text-slate-300">
            <div className="text-cyan-400 font-bold uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800/80">
              Patron Profile Telemetry
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone Number:</span>
              <span className="text-white">{customer.phone_number || 'Not provided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Enrolled Since:</span>
              <span className="text-white">{formatDate(customer.created_at)}</span>
            </div>
            {customer.last_order_date && (
              <div className="flex justify-between">
                <span className="text-slate-400">Most Recent Order:</span>
                <span className="text-white">{formatDate(customer.last_order_date)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Clearance Status:</span>
              <span
                className={
                  customer.status === 'ACTIVE'
                    ? 'text-emerald-400 font-bold'
                    : 'text-rose-400 font-bold'
                }
              >
                {customer.status}
              </span>
            </div>
          </div>

          {/* Staff Notes */}
          {customer.notes && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-semibold">
                Internal Concierge Notes:
              </span>
              <p className="text-slate-300 italic">{customer.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleStatus(customer.id)}
              className={
                customer.status === 'ACTIVE'
                  ? 'text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
                  : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
              }
            >
              {customer.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-300"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
