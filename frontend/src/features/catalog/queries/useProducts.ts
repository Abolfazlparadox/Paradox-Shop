'use client';

import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/endpoints';
import { PaginatedResponse, ProductFilterParams, ProductListItem } from '@/types/api';

export function useProducts(params?: ProductFilterParams) {
  return useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ['products', params],
    queryFn: () => productsApi.getList(params),
    staleTime: 60 * 1000, // 1 minute
  });
}
