'use client';

import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/endpoints';
import { ProductDetail } from '@/types/api';

export function useProductDetail(slug: string) {
  return useQuery<ProductDetail>({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug),
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
  });
}
