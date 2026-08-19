'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/endpoints';
import { OrderDetail, OrderListItem, PaginatedResponse } from '@/types/api';

export function useOrders(params?: { page?: number; page_size?: number }) {
  return useQuery<PaginatedResponse<OrderListItem>>({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.getList(params),
    staleTime: 30 * 1000,
  });
}

export function useOrderDetail(id: string) {
  return useQuery<OrderDetail>({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}
