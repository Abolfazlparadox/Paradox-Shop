'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/endpoints';
import { CreateProductCommentRequest, PaginatedResponse, ProductComment } from '@/types/api';

export function useProductComments(productIdOrSlug: string) {
  return useQuery<PaginatedResponse<ProductComment>>({
    queryKey: ['productComments', productIdOrSlug],
    queryFn: () => productsApi.getComments(productIdOrSlug),
    enabled: Boolean(productIdOrSlug),
    staleTime: 1 * 60 * 1000,
  });
}

export function useCreateProductComment(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductCommentRequest) =>
      productsApi.createComment(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productComments', productId] });
    },
  });
}
