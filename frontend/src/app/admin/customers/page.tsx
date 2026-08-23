'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin';
import { AdminCustomer } from '@/types/admin';
import { CustomerDetailModal } from '@/components/admin/CustomerDetailModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import { Users, Search, ShieldCheck, ShieldAlert, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingCustomer, setInspectingCustomer] = useState<AdminCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getCustomers(searchQuery);
      setCustomers(data);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleToggleStatus = async (customerId: string) => {
    try {
      const updated = await adminApi.toggleCustomerStatus(customerId);
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? updated : c)));
      if (inspectingCustomer?.id === customerId) {
        setInspectingCustomer(updated);
      }
      notify.success(
        'Account State Mutated',
        `Client ${updated.name} status shifted to ${updated.status}.`
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
          onClick={loadCustomers}
          className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
        >
          Refresh
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
            className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary placeholder-fg-muted focus:outline-none focus:border-cyan-500 font-sans"
          />
        </div>

        <div className="text-xs font-mono text-fg-muted">
          Showing <span className="text-fg-primary font-bold">{customers.length}</span> registered patrons
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : customers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-elevated border border-border-subtle font-mono text-xs text-fg-muted space-y-2">
          <Users className="w-8 h-8 text-fg-muted mx-auto opacity-50" />
          <p>No patrons match search query.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-bg-elevated border border-border-subtle overflow-hidden shadow-sm dark:shadow-xl transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-fg-muted uppercase text-[10px] tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="py-3.5 px-4">Patron Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Acquisitions</th>
                  <th className="py-3.5 px-4">Lifetime Spend</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-secondary/40 transition-colors">
                    {/* Name & Verification */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-mono font-bold text-xs flex items-center justify-center">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-fg-primary font-display flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.is_verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                            )}
                          </div>
                          <div className="text-[10px] text-fg-muted">
                            Member since {formatDate(c.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="text-fg-primary">{c.email}</div>
                      <div className="text-[10px] text-fg-muted">{c.phone_number || 'No phone'}</div>
                    </td>

                    {/* Orders Count */}
                    <td className="py-3.5 px-4 font-bold text-fg-primary">
                      {c.orders_count} Orders
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-4 font-bold text-cyan-600 dark:text-cyan-300">
                      {formatCurrency(c.total_spent)}
                    </td>

                    {/* Status Toggle Badge */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(c.id)}
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all cursor-pointer',
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        )}
                      >
                        {c.status}
                      </button>
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3.5 px-4 text-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectingCustomer(c)}
                        className="text-[11px] font-mono border-border-subtle hover:bg-bg-secondary text-fg-primary px-2.5 py-1 h-auto"
                      >
                        <span>Dossier</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer Modal */}
      <CustomerDetailModal
        customer={inspectingCustomer}
        onClose={() => setInspectingCustomer(null)}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
