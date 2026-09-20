'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/endpoints';
import { CreateReviewRequest, Review } from '@/types/api';

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation<Review, any, CreateReviewRequest>({
    mutationFn: (data: CreateReviewRequest) => reviewsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productReviews', variables.product_id] });
    },
  });
}
