'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questionsApi } from '@/lib/api/endpoints';
import { PaginatedResponse, ProductQuestion } from '@/types/api';

export function useProductQuestions(productId: string, params?: { page?: number; page_size?: number }) {
  return useQuery<PaginatedResponse<ProductQuestion>>({
    queryKey: ['productQuestions', productId, params],
    queryFn: () => questionsApi.getByProduct(productId, params),
    enabled: Boolean(productId),
    staleTime: 60 * 1000,
  });
}

export function useCreateProductQuestion(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { product_id: string; question: string }) => questionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productQuestions', productId] });
      queryClient.invalidateQueries({ queryKey: ['myQuestions'] });
    },
  });
}

export function useReportProductQuestion() {
  return useMutation({
    mutationFn: ({ id, reason, details }: { id: string; reason: string; details?: string }) =>
      questionsApi.report(id, reason, details),
  });
}
