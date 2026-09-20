'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api/endpoints';
import { CategoryTreeNode } from '@/types/api';

export function useCategoryTree() {
  return useQuery<CategoryTreeNode[]>({
    queryKey: ['categoryTree'],
    queryFn: categoriesApi.getTree,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
