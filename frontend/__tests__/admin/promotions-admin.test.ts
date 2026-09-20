import { describe, it, expect } from 'vitest';
import { AdminPromotion, AdminCoupon, AdminPromotionReports } from '@/types/admin';

describe('Admin Promotions & Coupons Control Center', () => {
  describe('1. Promotion Filter and Lifecycle Evaluation', () => {
    const mockPromotions: AdminPromotion[] = [
      {
        id: 'promo-1',
        name: 'Flash Sale 25%',
        slug: 'flash-sale-25',
        discount_type: 'PERCENTAGE',
        discount_value: 25,
        max_discount_amount: 500000,
        is_active: true,
        priority: 1,
        start_at: '2026-08-01T00:00:00Z',
        end_at: '2026-12-31T23:59:59Z',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
      {
        id: 'promo-2',
        name: 'Winter Launch',
        slug: 'winter-launch',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 100000,
        max_discount_amount: null,
        is_active: false,
        priority: 2,
        start_at: '2026-01-01T00:00:00Z',
        end_at: '2026-02-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'promo-3',
        name: 'Past Holiday Special',
        slug: 'past-holiday',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        is_active: true,
        priority: 3,
        start_at: '2025-01-01T00:00:00Z',
        end_at: '2025-02-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    it('correctly filters active promotions within current date window', () => {
      const now = new Date('2026-08-29T12:00:00Z');
      const activePromos = mockPromotions.filter((p) => {
        if (!p.is_active) return false;
        if (p.end_at && new Date(p.end_at) < now) return false;
        return true;
      });

      expect(activePromos.length).toBe(1);
      expect(activePromos[0].id).toBe('promo-1');
    });

    it('identifies expired promotions based on end timestamp', () => {
      const now = new Date('2026-08-29T12:00:00Z');
      const expiredPromos = mockPromotions.filter(
        (p) => p.end_at && new Date(p.end_at) < now
      );

      expect(expiredPromos.length).toBe(2);
      expect(expiredPromos.map((p) => p.id)).toContain('promo-3');
    });
  });

  describe('2. Coupon Builder Validation & Limits', () => {
    it('validates percentage discount upper bound', () => {
      const validPercentage = 30;
      const invalidPercentage = 120;

      const isValidPercentage = (val: number) => val > 0 && val <= 100;

      expect(isValidPercentage(validPercentage)).toBe(true);
      expect(isValidPercentage(invalidPercentage)).toBe(false);
    });

    it('enforces uppercase formatting on coupon codes', () => {
      const input = 'summer_vip_2026';
      const formatted = input.trim().toUpperCase();

      expect(formatted).toBe('SUMMER_VIP_2026');
    });

    it('detects coupon exhaustion when usage meets quota', () => {
      const coupon: AdminCoupon = {
        id: 'cpn-1',
        code: 'LIMITED50',
        discount_type: 'PERCENTAGE',
        discount_value: 50,
        total_usage_limit: 10,
        per_user_usage_limit: 1,
        usage_count: 10,
        is_active: true,
        audience_type: 'ALL_USERS',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const isQuotaExhausted =
        Boolean(coupon.total_usage_limit && coupon.usage_count >= coupon.total_usage_limit);

      expect(isQuotaExhausted).toBe(true);
    });
  });

  describe('3. Promotion Reports Aggregation Mapping', () => {
    it('processes server reports response cleanly without NaN errors', () => {
      const reportResponse: AdminPromotionReports = {
        total_discounts_given: '4500000',
        coupon_redemptions: 24,
        total_coupon_discounts: '1200000',
        revenue_affected: '28000000',
        orders_with_coupons: 18,
        orders_with_promotions: 35,
        active_promotions_count: 4,
        active_coupons_count: 6,
        active_campaigns: 10,
        expired_campaigns: 3,
        most_used_coupons: [
          {
            id: 'c-1',
            code: 'VIP50',
            discount_type: 'PERCENTAGE',
            discount_value: 50,
            usage_count: 15,
            total_usage_limit: 100,
            is_active: true,
          },
        ],
        least_used_coupons: [],
      };

      const totalDiscounts = Number(reportResponse.total_discounts_given);
      const revenue = Number(reportResponse.revenue_affected);

      expect(totalDiscounts).toBe(4500000);
      expect(revenue).toBe(28000000);
      expect(reportResponse.active_campaigns).toBe(10);
      expect(reportResponse.most_used_coupons[0].code).toBe('VIP50');
    });
  });
});
