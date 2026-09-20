'use client';

import React, { useState, useMemo } from 'react';
import {
  useAdminCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  useToggleCoupon,
} from '@/hooks/useAdminData';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminCoupon } from '@/types/admin';
import { CouponBuilderModal } from '@/components/admin/CouponBuilderModal';
import { CouponUsagesDrawer } from '@/components/admin/CouponUsagesDrawer';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import { normalizeApiError } from '@/lib/api/client';
import {
  Tag,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminCouponsPage() {
  const { can } = usePermissions();
  const canManage = can('promotions.manage');

  const { data: coupons = [], isLoading, refetch, isFetching } = useAdminCoupons();
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();
  const toggleMutation = useToggleCoupon();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'ALL_USERS' | 'SPECIFIC_USERS'>('ALL');
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [inspectingCoupon, setInspectingCoupon] = useState<AdminCoupon | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredCoupons = useMemo(() => {
    const now = new Date();

    return coupons.filter((coupon) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = coupon.code.toLowerCase().includes(q);
        const matchDesc = coupon.description?.toLowerCase().includes(q);
        if (!matchCode && !matchDesc) return false;
      }

      // Audience Filter
      if (audienceFilter !== 'ALL' && coupon.audience_type !== audienceFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'ACTIVE') {
        if (!coupon.is_active) return false;
        if (coupon.end_at && new Date(coupon.end_at) < now) return false;
        if (coupon.total_usage_limit && coupon.usage_count >= coupon.total_usage_limit) return false;
      } else if (statusFilter === 'INACTIVE') {
        if (coupon.is_active) return false;
      } else if (statusFilter === 'EXPIRED') {
        const isTimeExpired = coupon.end_at && new Date(coupon.end_at) < now;
        const isUsageExpired = coupon.total_usage_limit && coupon.usage_count >= coupon.total_usage_limit;
        if (!isTimeExpired && !isUsageExpired) return false;
      }

      return true;
    });
  }, [coupons, searchQuery, statusFilter, audienceFilter]);

  const handleSave = async (data: Partial<AdminCoupon>) => {
    if (editingCoupon) {
      await updateMutation.mutateAsync({ id: editingCoupon.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleToggleActive = async (coupon: AdminCoupon) => {
    if (!canManage) {
      notify.error('Access Denied', 'You lack promotions.manage permission.');
      return;
    }
    try {
      await toggleMutation.mutateAsync(coupon.id);
      notify.success(
        'Voucher Mutated',
        `Voucher '${coupon.code}' is now ${!coupon.is_active ? 'ACTIVE' : 'INACTIVE'}.`
      );
    } catch (err: any) {
      const parsed = normalizeApiError(err);
      notify.error('Toggle Failed', parsed.detail || 'Unable to toggle voucher status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      notify.error('Access Denied', 'You lack promotions.manage permission.');
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      notify.success('Voucher Deleted', 'Coupon removed from vault.');
      setDeletingId(null);
    } catch (err: any) {
      const parsed = normalizeApiError(err);
      notify.error('Deletion Failed', parsed.detail || 'Unable to delete coupon voucher.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            <span>Vouchers & Promotional Coupons</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Manage redemption codes, minimum order criteria, usage quotas, and VIP audiences
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
                setEditingCoupon(null);
                setIsBuilderOpen(true);
              }}
              className="text-xs font-mono font-semibold bg-amber-500 hover:bg-amber-600 text-white"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Issue Coupon
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
            placeholder="Search coupons by code or description..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500"
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
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-subtle text-[11px] font-mono text-fg-primary focus:outline-none"
          >
            <option value="ALL">All Audiences</option>
            <option value="ALL_USERS">Public Patrons</option>
            <option value="SPECIFIC_USERS">Targeted VIP List</option>
          </select>
        </div>
      </div>

      {/* Main Coupons Table */}
      <div className="bg-bg-elevated border border-border-subtle rounded-2xl overflow-hidden shadow-card">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} />
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Tag className="w-8 h-8 text-fg-muted mx-auto" />
            <div className="text-sm font-semibold font-display text-fg-primary">
              No Coupon Vouchers Found
            </div>
            <p className="text-xs text-fg-muted font-mono max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No vouchers match your active filters.'
                : 'Issue your first promotional voucher code to share with clients.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-bg-secondary border-b border-border-subtle font-mono text-[10px] text-fg-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Voucher Code</th>
                  <th className="px-4 py-3.5">Discount Rate</th>
                  <th className="px-4 py-3.5">Min Order / Cap</th>
                  <th className="px-4 py-3.5 text-center">Redemptions</th>
                  <th className="px-4 py-3.5">Audience & Period</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono">
                {filteredCoupons.map((coupon) => {
                  const now = new Date();
                  const isTimeExpired = coupon.end_at && new Date(coupon.end_at) < now;
                  const isUsageExpired =
                    coupon.total_usage_limit && coupon.usage_count >= coupon.total_usage_limit;
                  const isExpired = isTimeExpired || isUsageExpired;
                  const isPercentage = coupon.discount_type === 'PERCENTAGE';

                  return (
                    <tr key={coupon.id} className="hover:bg-bg-secondary/40 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-4">
                        <div className="inline-block px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 font-mono font-bold text-amber-500 tracking-wider text-xs">
                          {coupon.code}
                        </div>
                        {coupon.description && (
                          <div className="text-[11px] text-fg-muted font-sans mt-1 line-clamp-1">
                            {coupon.description}
                          </div>
                        )}
                      </td>

                      {/* Discount Rate */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-emerald-400">
                          {isPercentage
                            ? `${coupon.discount_value}% OFF`
                            : `-${formatCurrency(Number(coupon.discount_value))}`}
                        </div>
                      </td>

                      {/* Min Order & Max Cap */}
                      <td className="px-4 py-4 text-[11px] space-y-0.5">
                        <div className="text-fg-secondary">
                          Min: {coupon.min_order_subtotal ? formatCurrency(Number(coupon.min_order_subtotal)) : 'None'}
                        </div>
                        {coupon.max_discount_amount && (
                          <div className="text-fg-muted">
                            Cap: {formatCurrency(Number(coupon.max_discount_amount))}
                          </div>
                        )}
                      </td>

                      {/* Redemptions */}
                      <td className="px-4 py-4 text-center">
                        <div className="text-xs font-bold text-fg-primary">
                          {coupon.usage_count}
                          <span className="text-fg-muted font-normal">
                            {' '}
                            / {coupon.total_usage_limit ? coupon.total_usage_limit : '∞'}
                          </span>
                        </div>
                        <div className="text-[10px] text-fg-muted mt-0.5">
                          Limit/user: {coupon.per_user_usage_limit}
                        </div>
                      </td>

                      {/* Audience & Period */}
                      <td className="px-4 py-4 text-[11px] text-fg-secondary space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-fg-muted" />
                          <span>{coupon.audience_type === 'SPECIFIC_USERS' ? 'Targeted List' : 'Public'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-fg-muted" />
                          <span className={cn(isExpired && 'text-status-error font-semibold')}>
                            {coupon.end_at ? `Exp: ${formatDate(coupon.end_at)}` : 'Indefinite'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-status-error/10 text-status-error border border-status-error/20">
                            <XCircle className="w-3 h-3" />
                            {isUsageExpired ? 'Quota Met' : 'Expired'}
                          </span>
                        ) : coupon.is_active ? (
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            disabled={!canManage}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(coupon)}
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
                          <button
                            onClick={() => setInspectingCoupon(coupon)}
                            className="p-1.5 rounded-lg text-fg-muted hover:text-amber-500 hover:bg-bg-secondary transition-colors"
                            title="Inspect Redemptions"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCoupon(coupon);
                                  setIsBuilderOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors"
                                title="Edit Voucher"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeletingId(coupon.id)}
                                className="p-1.5 rounded-lg text-fg-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                                title="Delete Voucher"
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

      {/* Coupon Builder Modal */}
      <CouponBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        coupon={editingCoupon}
        onSave={handleSave}
      />

      {/* Redemptions Drawer */}
      <CouponUsagesDrawer
        isOpen={Boolean(inspectingCoupon)}
        onClose={() => setInspectingCoupon(null)}
        coupon={inspectingCoupon}
      />

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-bg-elevated border border-border-subtle p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-status-error">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-sm font-bold font-display text-fg-primary">
                Confirm Voucher Deletion
              </h3>
            </div>
            <p className="text-xs text-fg-secondary font-mono">
              Are you sure you want to delete this coupon? Existing order snapshots that redeemed this coupon will remain preserved.
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
                Delete Coupon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
