'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/endpoints';
import { PaginatedResponse, Review } from '@/types/api';

export interface ProductReviewsParams {
  rating?: number;
  verified?: boolean;
  has_images?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

export function useProductReviews(productId: string, params?: ProductReviewsParams) {
  return useQuery<PaginatedResponse<Review>>({
    queryKey: ['productReviews', productId, params],
    queryFn: () => reviewsApi.getByProduct(productId, params),
    enabled: Boolean(productId),
    staleTime: 60 * 1000,
  });
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData | any) => reviewsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviewSummary', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviewEligibility', productId] });
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
    },
  });
}

export function useVoteReview(productId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isHelpful }: { id: string; isHelpful: boolean }) =>
      reviewsApi.vote(id, isHelpful),
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
      }
    },
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: ({ id, reason, details }: { id: string; reason: string; details?: string }) =>
      reviewsApi.report(id, reason, details),
  });
}
