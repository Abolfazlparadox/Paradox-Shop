'use client';

import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/endpoints';
import { PaginatedResponse, Review } from '@/types/api';

export function useProductReviews(productId: string) {
  return useQuery<PaginatedResponse<Review>>({
    queryKey: ['productReviews', productId],
    queryFn: () => reviewsApi.getByProduct(productId),
    enabled: Boolean(productId),
    staleTime: 2 * 60 * 1000,
  });
}
