'use client';

import React, { useState, Suspense } from 'react';
import { useAdminAuditLogs } from '@/hooks/useAdminData';
import { AdminAuditLogItem } from '@/types/api';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatDate } from '@/lib/utils/format';
import {
  Activity,
  Search,
  Shield,
  Clock,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminActivityContent() {
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');
  const [actionSearch, setActionSearch] = useState<string>('');

  const {
    data: auditLogs = [],
    isLoading,
    refetch,
  } = useAdminAuditLogs({
    resource_type: resourceFilter === 'ALL' ? undefined : resourceFilter,
    action: actionSearch || undefined,
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-500" />
            <span>Immutable Administrative Audit Trail</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Cryptographically timestamped record of administrative mutations, inventory shifts, and state transitions
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary cursor-pointer"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
        >
          Refresh Stream
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action or resource..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Resource Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          {['ALL', 'ORDER', 'PRODUCT', 'INVENTORY', 'REVIEW', 'CUSTOMER', 'SETTINGS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setResourceFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                resourceFilter === tab
                  ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Stream Table */}
      <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={8} />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
            <Shield className="w-8 h-8 mx-auto opacity-50 text-cyan-500" />
            <p>No audit log events recorded for active filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action Signature</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Metadata Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3 px-4 text-fg-muted text-[11px] whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>

                    <td className="py-3 px-4 font-bold text-fg-primary">
                      {log.user_email || 'System Daemon'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-fg-primary">
                      <span className="font-semibold text-fg-muted">{log.resource_type}:</span>{' '}
                      <span className="font-bold">{log.resource_id}</span>
                    </td>

                    <td className="py-3 px-4 text-fg-muted text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-[10px] text-fg-muted">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} />}>
      <AdminActivityContent />
    </Suspense>
  );
}
