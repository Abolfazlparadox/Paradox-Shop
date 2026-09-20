'use client';

import React, { useState, Suspense } from 'react';
import { useAdminCustomers, useToggleCustomerStatus } from '@/hooks/useAdminData';
import { AdminCustomer } from '@/types/api';
import { CustomerDetailModal } from '@/components/admin/CustomerDetailModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import { Users, Search, ShieldCheck, ShieldAlert, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminCustomersContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingCustomer, setInspectingCustomer] = useState<AdminCustomer | null>(null);

  const {
    data: customers = [],
    isLoading,
    refetch,
  } = useAdminCustomers({
    search: searchQuery,
  });

  const toggleStatusMutation = useToggleCustomerStatus();

  const handleToggleStatus = async (customerId: string) => {
    try {
      const updated = await toggleStatusMutation.mutateAsync(customerId);
      if (inspectingCustomer?.id === customerId) {
        setInspectingCustomer(updated);
      }
      notify.success(
        'Account State Mutated',
        `Client ${updated.name || updated.email} status shifted to ${updated.status}.`
      );
    } catch {
      notify.error('Action Failed', 'Failed to toggle client access state.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            <span>Patron & Client Directory</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Client lifetime value telemetry, authentication verification, and account clearance
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary cursor-pointer"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
        >
          Refresh Directory
        </Button>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-fg-muted absolute start-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patron by name, email, or telephone..."
            className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-cyan-500 font-sans"
          />
        </div>

        <div className="text-xs font-mono text-fg-muted">
          Showing <span className="text-fg-primary font-bold">{customers.length}</span> registered patrons
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={6} />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-50 text-amber-500" />
            <p>No patrons matched the search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Patron</th>
                  <th className="py-3.5 px-4">Clearance</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3.5 px-4">Member Since</th>
                  <th className="py-3.5 px-4 text-center">Account Status</th>
                  <th className="py-3.5 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-fg-primary text-xs flex items-center gap-2">
                        <span>{c.name || 'Patron'}</span>
                        {c.is_verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-fg-muted font-mono">{c.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-bg-secondary border border-border-subtle text-[10px] font-bold">
                        {c.is_staff ? (c.is_superuser ? 'Superuser' : 'Staff') : 'Patron'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-bg-secondary border border-border-subtle text-[10px]">
                        {c.orders_count}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-cyan-600 dark:text-cyan-300">
                      {formatCurrency(Number(c.total_spent || 0))}
                    </td>

                    <td className="py-3 px-4 text-[11px] text-fg-muted">
                      {formatDate(c.created_at)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(c.id)}
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer',
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        )}
                      >
                        {c.status}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectingCustomer(c)}
                        className="text-[11px] font-mono px-2.5 py-1 border-border-subtle hover:bg-bg-secondary text-fg-primary cursor-pointer"
                        rightIcon={<ExternalLink className="w-3 h-3" />}
                      >
                        Dossier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {inspectingCustomer && (
        <CustomerDetailModal
          customer={inspectingCustomer}
          onClose={() => setInspectingCustomer(null)}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} />}>
      <AdminCustomersContent />
    </Suspense>
  );
}
