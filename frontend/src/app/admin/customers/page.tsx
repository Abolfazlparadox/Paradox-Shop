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
          <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Patron & Client Directory</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Client lifetime value telemetry, authentication verification, and account clearance
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadCustomers}
          className="text-xs font-mono border-slate-800 hover:bg-slate-800 text-slate-300"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patron name, email..."
            className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="text-xs font-mono text-slate-400 hidden sm:block">
          <span className="text-cyan-400 font-bold">{customers.length}</span> Registered Patrons
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : customers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 font-mono text-xs text-slate-400">
          <Users className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-white font-bold">No patrons found</div>
          <p className="text-slate-500">No client profiles match your search criteria.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Patron Name</th>
                  <th className="py-3.5 px-3">Identity</th>
                  <th className="py-3.5 px-3">Lifetime Value</th>
                  <th className="py-3.5 px-3">Acquisitions</th>
                  <th className="py-3.5 px-3">Verification</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {customers.map((c) => {
                  const isActive = c.status === 'ACTIVE';

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white font-display text-sm">{c.name}</div>
                        <div className="text-[10px] text-slate-400">Since {formatDate(c.created_at)}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-300">{c.email}</div>
                        <div className="text-[10px] text-slate-400">{c.phone_number || 'No phone'}</div>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-cyan-300">
                        {formatCurrency(c.total_spent)}
                      </td>

                      <td className="py-3.5 px-3 text-slate-300">
                        {c.orders_count} Orders
                      </td>

                      <td className="py-3.5 px-3">
                        {c.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            Unverified
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          )}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <button
                          onClick={() => setInspectingCustomer(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <CustomerDetailModal
        customer={inspectingCustomer}
        onClose={() => setInspectingCustomer(null)}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
