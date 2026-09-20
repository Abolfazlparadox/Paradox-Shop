import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/lib/api/endpoints';
import {
  ActivePromotion,
  CouponValidateRequest,
  CouponValidateResponse,
  CartDiscountPreviewRequest,
  CartDiscountPreviewResponse,
} from '@/types/api';

export const PROMOTION_QUERY_KEYS = {
  activePromotions: ['promotions', 'active'] as const,
  cartPreview: (couponCode?: string | null) => ['promotions', 'cartPreview', couponCode ?? ''] as const,
};

/**
 * Hook to retrieve public active promotions for navigation, banners, and discovery.
 */
export function useActivePromotions() {
  return useQuery<ActivePromotion[]>({
    queryKey: PROMOTION_QUERY_KEYS.activePromotions,
    queryFn: promotionsApi.getActivePromotions,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Hook to preview cart discounts and coupon application on live cart.
 */
export function useCartDiscountPreview(couponCode?: string | null, enabled: boolean = true) {
  return useQuery<CartDiscountPreviewResponse>({
    queryKey: PROMOTION_QUERY_KEYS.cartPreview(couponCode),
    queryFn: () => promotionsApi.getCartDiscountPreview({ coupon_code: couponCode }),
    enabled,
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Mutation hook to validate a coupon code and calculate applicable discounts.
 */
export function useValidateCoupon() {
  const queryClient = useQueryClient();

  return useMutation<CouponValidateResponse, Error, CouponValidateRequest>({
    mutationFn: (payload) => promotionsApi.validateCoupon(payload),
    onSuccess: (_, variables) => {
      // Invalidate cart preview with this coupon code to ensure fresh breakdown
      queryClient.invalidateQueries({
        queryKey: PROMOTION_QUERY_KEYS.cartPreview(variables.code),
      });
    },
  });
}
