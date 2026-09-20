'use client';

import React, { useState, useMemo } from 'react';
import {
  useAdminPromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useTogglePromotion,
} from '@/hooks/useAdminData';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminPromotion } from '@/types/admin';
import { PromotionBuilderModal } from '@/components/admin/PromotionBuilderModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import { normalizeApiError } from '@/lib/api/client';
import {
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Clock,
  Percent,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminPromotionsPage() {
  const { can } = usePermissions();
  const canManage = can('promotions.manage');

  const { data: promotions = [], isLoading, refetch, isFetching } = useAdminPromotions();
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();
  const toggleMutation = useTogglePromotion();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERCENTAGE' | 'FIXED_AMOUNT'>('ALL');
  const [editingPromotion, setEditingPromotion] = useState<AdminPromotion | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPromotions = useMemo(() => {
    const now = new Date();

    return promotions.filter((promo) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = promo.name.toLowerCase().includes(q);
        const matchSlug = promo.slug.toLowerCase().includes(q);
        if (!matchName && !matchSlug) return false;
      }

      // Type Filter
      if (typeFilter !== 'ALL' && promo.discount_type !== typeFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'ACTIVE') {
        if (!promo.is_active) return false;
        if (promo.end_at && new Date(promo.end_at) < now) return false;
      } else if (statusFilter === 'INACTIVE') {
        if (promo.is_active) return false;
      } else if (statusFilter === 'EXPIRED') {
        if (!promo.end_at || new Date(promo.end_at) >= now) return false;
      }

      return true;
    });
  }, [promotions, searchQuery, statusFilter, typeFilter]);

  const handleSave = async (data: Partial<AdminPromotion>) => {
    if (editingPromotion) {
      await updateMutation.mutateAsync({ id: editingPromotion.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleToggleActive = async (promo: AdminPromotion) => {
    if (!canManage) {
      notify.error('Access Denied', 'You lack promotions.manage permission.');
      return;
    }
    try {
      await toggleMutation.mutateAsync(promo.id);
      notify.success(
        'Promotion Mutated',
        `Campaign '${promo.name}' is now ${!promo.is_active ? 'ACTIVE' : 'INACTIVE'}.`
      );
    } catch (err: any) {
      const parsed = normalizeApiError(err);
      notify.error('Toggle Failed', parsed.detail || 'Unable to toggle promotion status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      notify.error('Access Denied', 'You lack promotions.manage permission.');
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      notify.success('Promotion Deleted', 'Campaign removed from store.');
      setDeletingId(null);
    } catch (err: any) {
      const parsed = normalizeApiError(err);
      notify.error('Deletion Failed', parsed.detail || 'Unable to delete promotion rule.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
            <span>Automatic Promotion Rules & Campaigns</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Configure storewide sales, percentage discounts, category promos, and priority stacking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs font-mono"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />}
          >
            Refresh
          </Button>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingPromotion(null);
                setIsBuilderOpen(true);
              }}
              className="text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Promotion
            </Button>
          )}
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="p-4 rounded-xl bg-bg-elevated border border-border-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-card">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by name or slug..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center rounded-lg bg-bg-secondary p-1 border border-border-subtle">
            {(['ALL', 'ACTIVE', 'INACTIVE', 'EXPIRED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-3 py-1 rounded-md text-[11px] font-semibold transition-colors',
                  statusFilter === st
                    ? 'bg-bg-elevated text-fg-primary shadow-xs'
                    : 'text-fg-muted hover:text-fg-primary'
                )}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-subtle text-[11px] font-mono text-fg-primary focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED_AMOUNT">Fixed Amount</option>
          </select>
        </div>
      </div>

      {/* Main Promotions Table */}
      <div className="bg-bg-elevated border border-border-subtle rounded-2xl overflow-hidden shadow-card">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} />
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-fg-muted mx-auto" />
            <div className="text-sm font-semibold font-display text-fg-primary">
              No Promotion Rules Found
            </div>
            <p className="text-xs text-fg-muted font-mono max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No promotions match your active filters.'
                : 'Create your first automatic promotion rule to offer discounts to customers.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-bg-secondary border-b border-border-subtle font-mono text-[10px] text-fg-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Campaign Name</th>
                  <th className="px-4 py-3.5">Discount</th>
                  <th className="px-4 py-3.5 text-center">Priority</th>
                  <th className="px-4 py-3.5">Validity Window</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono">
                {filteredPromotions.map((promo) => {
                  const isExpired = promo.end_at && new Date(promo.end_at) < new Date();
                  const isPercentage = promo.discount_type === 'PERCENTAGE';

                  return (
                    <tr key={promo.id} className="hover:bg-bg-secondary/40 transition-colors">
                      {/* Name & Slug */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-fg-primary font-display text-sm">
                          {promo.name}
                        </div>
                        <div className="text-[11px] text-fg-muted font-mono mt-0.5">
                          slug: {promo.slug}
                        </div>
                        {promo.description && (
                          <p className="text-[11px] text-fg-secondary mt-1 font-sans line-clamp-1">
                            {promo.description}
                          </p>
                        )}
                      </td>

                      {/* Discount Value */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                          {isPercentage ? (
                            <span>{promo.discount_value}% OFF</span>
                          ) : (
                            <span>-{formatCurrency(Number(promo.discount_value))}</span>
                          )}
                        </div>
                        {promo.max_discount_amount && (
                          <div className="text-[10px] text-fg-muted font-mono mt-0.5">
                            Cap: {formatCurrency(Number(promo.max_discount_amount))}
                          </div>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-bg-secondary border border-border-subtle text-[11px] font-bold text-fg-primary">
                          #{promo.priority}
                        </span>
                      </td>

                      {/* Validity Window */}
                      <td className="px-4 py-4 text-[11px] text-fg-secondary space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-fg-muted" />
                          <span>Start: {promo.start_at ? formatDate(promo.start_at) : 'Immediate'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-fg-muted" />
                          <span className={cn(isExpired && 'text-status-error font-semibold')}>
                            End: {promo.end_at ? formatDate(promo.end_at) : 'Indefinite'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-status-error/10 text-status-error border border-status-error/20">
                            <XCircle className="w-3 h-3" />
                            Expired
                          </span>
                        ) : promo.is_active ? (
                          <button
                            onClick={() => handleToggleActive(promo)}
                            disabled={!canManage}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(promo)}
                            disabled={!canManage}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-bg-secondary text-fg-muted border border-border-subtle hover:bg-bg-secondary/80 transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPromotion(promo);
                                  setIsBuilderOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors"
                                title="Edit Promotion"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeletingId(promo.id)}
                                className="p-1.5 rounded-lg text-fg-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                                title="Delete Promotion"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promotion Builder Modal */}
      <PromotionBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        promotion={editingPromotion}
        onSave={handleSave}
      />

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-bg-elevated border border-border-subtle p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-status-error">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-sm font-bold font-display text-fg-primary">
                Confirm Promotion Deletion
              </h3>
            </div>
            <p className="text-xs text-fg-secondary font-mono">
              Are you sure you want to permanently delete this promotion rule? Historical order snapshots will remain preserved.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingId(null)}
                className="text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDelete(deletingId)}
                className="text-xs font-mono bg-status-error hover:bg-status-error/80 text-white"
              >
                Delete Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
