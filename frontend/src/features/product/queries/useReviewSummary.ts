'use client';

import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/endpoints';
import { ReviewSummary } from '@/types/api';

export function useReviewSummary(productId: string) {
  return useQuery<ReviewSummary>({
    queryKey: ['reviewSummary', productId],
    queryFn: () => reviewsApi.getSummary(productId),
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
  });
}
