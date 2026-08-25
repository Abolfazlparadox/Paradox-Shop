'use client';

import React, { useState, Suspense } from 'react';
import {
  useAdminReviews,
  useDeleteReview,
  useModerateReview,
} from '@/hooks/useAdminData';
import { AdminReviewItem } from '@/types/api';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  ShieldCheck,
  Filter,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminReviewsContent() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: reviews = [],
    isLoading,
  } = useAdminReviews({
    is_approved: statusFilter === 'ALL' ? undefined : statusFilter === 'APPROVED',
    rating: ratingFilter || undefined,
    search: searchQuery,
  });

  const moderateReviewMutation = useModerateReview();
  const deleteReviewMutation = useDeleteReview();

  const handleModerate = async (id: string, isApproved: boolean) => {
    try {
      await moderateReviewMutation.mutateAsync({ id, is_approved: isApproved });
      notify.success(
        isApproved ? 'Review Approved' : 'Review Rejected',
        `Review marked as ${isApproved ? 'published on storefront' : 'rejected'}.`
      );
    } catch {
      notify.error('Moderation Error', 'Failed to moderate review.');
    }
  };

  const handleDelete = async (id: string, author: string) => {
    if (confirm(`Permanently delete review by ${author}?`)) {
      try {
        await deleteReviewMutation.mutateAsync(id);
        notify.success('Review Deleted', 'Review removed from database.');
      } catch {
        notify.error('Deletion Failed', 'Could not delete review.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>Product Reviews & Testimonials Moderation</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Editorial curation of verified patron reviews, star ratings, and craftsmanship feedback
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search review content, product, author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          {[
            { id: 'ALL', label: 'All Reviews' },
            { id: 'PENDING', label: 'Pending Approval' },
            { id: 'APPROVED', label: 'Published' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                statusFilter === st.id
                  ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Rating Filter */}
        <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          <button
            onClick={() => setRatingFilter(null)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[11px]',
              ratingFilter === null
                ? 'bg-bg-elevated text-cyan-600 dark:text-cyan-400 shadow-sm border border-border-subtle'
                : 'text-fg-muted hover:text-fg-primary'
            )}
          >
            All ★
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => setRatingFilter(r)}
              className={cn(
                'px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[11px]',
                ratingFilter === r
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-fg-muted hover:text-fg-primary'
              )}
            >
              {r}★
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-50 text-indigo-500" />
            <p>No reviews found matching the active criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Artifact</th>
                  <th className="py-3.5 px-4">Rating & Review</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-end">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-fg-primary">
                      <div>{r.product_name}</div>
                      <div className="text-[10px] text-fg-muted font-mono">/{r.product_slug}</div>
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <div className="flex items-center gap-1 text-amber-500 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3 h-3',
                              i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-fg-muted/30'
                            )}
                          />
                        ))}
                      </div>
                      {r.title && <div className="font-bold text-fg-primary text-xs">{r.title}</div>}
                      <p className="text-[11px] text-fg-secondary italic line-clamp-2">
                        &ldquo;{r.body}&rdquo;
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-fg-primary flex items-center gap-1.5">
                        <span>{r.author_name}</span>
                        {r.is_verified_purchase && (
                          <span title="Verified Purchase">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-fg-muted truncate">{r.author_email}</div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          r.is_approved
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        )}
                      >
                        {r.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-fg-muted">
                      {formatDate(r.created_at)}
                    </td>

                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {!r.is_approved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModerate(r.id, true)}
                            className="text-[10px] font-mono px-2 py-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModerate(r.id, false)}
                            className="text-[10px] font-mono px-2 py-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Hide
                          </Button>
                        )}
                        <button
                          onClick={() => handleDelete(r.id, r.author_name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-colors cursor-pointer"
                          title="Delete Review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={5} />}>
      <AdminReviewsContent />
    </Suspense>
  );
}
