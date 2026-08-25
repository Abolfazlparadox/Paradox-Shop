'use client';

import React, { useState, Suspense } from 'react';
import { useAdminPayments } from '@/hooks/useAdminData';
import { AdminPaymentTransaction } from '@/types/api';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  CreditCard,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  X,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminPaymentsContent() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentTransaction | null>(null);

  const {
    data: payments = [],
    isLoading,
  } = useAdminPayments({
    status: statusFilter,
    search: searchQuery,
  });

  const statusBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
    processing: { label: 'Processing', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
    succeeded: { label: 'Settled', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    failed: { label: 'Declined', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
    refunded: { label: 'Refunded', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-500" />
            <span>Payment Transactions & Gateway Logs</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Real-time financial gateway telemetry, settlement receipts, idempotency verification, and gateway payloads
          </p>
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transaction ID, order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          {['ALL', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                statusFilter === tab
                  ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={6} />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
            <CreditCard className="w-8 h-8 mx-auto opacity-50 text-emerald-500" />
            <p>No payment records matched the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Transaction Reference</th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Patron</th>
                  <th className="py-3.5 px-4">Gateway</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Settlement Status</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-end">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {payments.map((payment) => {
                  const statusKey = payment.status.toLowerCase();
                  const badge = statusBadges[statusKey] || statusBadges.pending;

                  return (
                    <tr key={payment.id} className="hover:bg-bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-fg-primary">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{payment.transaction_id || payment.id.slice(0, 13)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">
                        {payment.order_number}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-fg-primary truncate max-w-[140px]">
                          {payment.customer_name || 'Patron'}
                        </div>
                        <div className="text-[10px] text-fg-muted truncate max-w-[140px]">
                          {payment.customer_email}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="capitalize">{payment.gateway || 'Default'}</span>
                          {payment.is_mock && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] font-bold border border-amber-500/30 uppercase">
                              Sandbox
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-fg-primary">
                        {formatCurrency(Number(payment.amount))}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                            badge.bg,
                            badge.text,
                            badge.border
                          )}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[11px] text-fg-muted">
                        {formatDate(payment.created_at)}
                      </td>

                      <td className="py-3 px-4 text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                          className="text-[11px] font-mono px-2.5 py-1 border-border-subtle hover:bg-bg-secondary text-fg-primary cursor-pointer"
                          rightIcon={<Code2 className="w-3 h-3" />}
                        >
                          Logs
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

      {/* Gateway Payload Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/60">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-bold font-display">Gateway Transaction Payload</h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-bg-secondary/50 rounded-xl border border-border-subtle">
                <div>
                  <span className="text-fg-muted block text-[10px]">TRANSACTION ID</span>
                  <span className="font-bold text-fg-primary">{selectedPayment.transaction_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-fg-muted block text-[10px]">IDEMPOTENCY KEY</span>
                  <span className="font-bold text-fg-primary">{selectedPayment.idempotency_key || 'Standard Checkout'}</span>
                </div>
              </div>

              <div>
                <span className="text-fg-muted block text-[10px] mb-1 uppercase">Raw Gateway Response Payload</span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 text-xs overflow-x-auto">
                  {JSON.stringify(selectedPayment.gateway_response || selectedPayment, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-border-subtle bg-bg-secondary/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPayment(null)}
                className="text-xs cursor-pointer"
              >
                Close Logs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} />}>
      <AdminPaymentsContent />
    </Suspense>
  );
}
