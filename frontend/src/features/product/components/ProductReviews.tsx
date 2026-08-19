'use client';

import React from 'react';
import { useProductReviews } from '../queries/useProductReviews';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils/format';
import { Star, ShieldCheck, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ProductReviewsProps {
  productId: string;
  className?: string;
}

export function ProductReviews({ productId, className }: ProductReviewsProps) {
  const { data, isLoading } = useProductReviews(productId);
  const reviews = data?.results || [];

  return (
    <section className={cn('space-y-6 pt-10 border-t border-border-subtle', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-display text-fg-primary">
            Client Impressions & Reviews
          </h3>
          <p className="text-xs text-fg-secondary mt-0.5 font-mono">
            Verified delivered purchase evaluations only
          </p>
        </div>

        {reviews.length > 0 && (
          <Badge variant="mono" size="sm">
            {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-fg-muted">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          <span className="text-xs font-mono">Loading reviews...</span>
        </div>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="p-8 rounded-lg bg-bg-elevated border border-border-subtle text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted mb-3 border border-border-subtle">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold font-display text-fg-primary mb-1">
            No Client Reviews Yet
          </h4>
          <p className="text-xs text-fg-secondary max-w-sm">
            Only verified buyers of delivered orders are eligible to submit reviews.
          </p>
        </div>
      )}

      {!isLoading && reviews.length > 0 && (
        <div className="divide-y divide-border-subtle bg-bg-elevated border border-border-subtle rounded-lg p-6 space-y-6">
          {reviews.map((rev) => (
            <article key={rev.id} className="pt-6 first:pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-3.5 h-3.5',
                          i < rev.rating ? 'fill-current' : 'text-fg-muted opacity-30'
                        )}
                      />
                    ))}
                  </div>

                  <span className="text-xs font-semibold font-display text-fg-primary">
                    {rev.user_display_name || rev.user_name || 'Anonymous'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-fg-muted">
                  {rev.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                  <span>{formatDate(rev.created_at)}</span>
                </div>
              </div>

              {rev.title && (
                <h5 className="text-xs font-semibold text-fg-primary font-display">
                  {rev.title}
                </h5>
              )}

              <p className="text-xs text-fg-secondary leading-relaxed">
                {rev.body || rev.comment}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
