'use client';

import { useQuery } from '@tanstack/react-query';
import { shippingApi } from '@/lib/api/endpoints';
import { ShippingQuote, Shipment } from '@/types/api';

export const SHIPPING_QUERY_KEYS = {
  quotes: (province?: string, city?: string, subtotal?: string | number) => [
    'shipping',
    'quotes',
    province ?? '',
    city ?? '',
    subtotal?.toString() ?? '0',
  ],
  orderShipment: (orderId: string) => ['shipping', 'order', orderId],
  track: (trackingCode: string) => ['shipping', 'track', trackingCode],
};

/**
 * Hook to retrieve available shipping methods and dynamic calculated fees.
 */
export function useShippingQuotes(
  province?: string,
  city?: string,
  subtotal?: number | string
) {
  return useQuery<ShippingQuote[]>({
    queryKey: SHIPPING_QUERY_KEYS.quotes(province, city, subtotal),
    queryFn: () =>
      shippingApi.getQuotes({
        province,
        city,
        subtotal: subtotal ? subtotal.toString() : '0',
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to retrieve shipment tracking details for a specific order.
 */
export function useOrderShipment(orderId?: string) {
  return useQuery<Shipment>({
    queryKey: SHIPPING_QUERY_KEYS.orderShipment(orderId ?? ''),
    queryFn: () => shippingApi.getOrderShipment(orderId!),
    enabled: Boolean(orderId),
    retry: 1,
  });
}

/**
 * Hook to retrieve public shipment tracking by tracking code.
 */
export function useTrackShipment(trackingCode?: string) {
  return useQuery<Shipment>({
    queryKey: SHIPPING_QUERY_KEYS.track(trackingCode ?? ''),
    queryFn: () => shippingApi.trackShipment(trackingCode!),
    enabled: Boolean(trackingCode && trackingCode.trim().length > 3),
    retry: 1,
  });
}
