'use client';

import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/endpoints';
import { ReviewEligibility } from '@/types/api';
import { useAuthStore } from '@/stores/auth';

export function useReviewEligibility(productId: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery<ReviewEligibility>({
    queryKey: ['reviewEligibility', productId],
    queryFn: () => reviewsApi.getEligibility(productId),
    enabled: Boolean(productId) && isAuthenticated,
    staleTime: 60 * 1000,
  });
}
