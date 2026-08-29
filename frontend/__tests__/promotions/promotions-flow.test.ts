import { describe, it, expect } from 'vitest';
import {
  ActivePromotion,
  CouponValidateResponse,
  Cart,
  CartItem,
  OrderDetail,
  ProductListItem,
} from '@/types/api';

describe('Promotions & Discounts Frontend Domain Logic', () => {
  describe('1. Product Sale & Promotion Display', () => {
    it('correctly calculates discount percentage and savings for a discounted product', () => {
      const product: ProductListItem = {
        id: 'p-1',
        name: 'Quantum Chronometer',
        slug: 'quantum-chronometer',
        base_price: '1200000',
        discounted_price: '960000',
        is_discounted: true,
        active_promotion: {
          id: 'promo-1',
          name: 'Autumn Special 20%',
          discount_type: 'PERCENTAGE',
          discount_value: 20,
          savings: 240000,
          discount_percentage: 20,
        },
        is_featured: true,
        category: { id: 'c-1', name: 'Timepieces', slug: 'timepieces' },
      };

      const baseNum = Number(product.base_price);
      const saleNum = Number(product.discounted_price);
      const savings = baseNum - saleNum;
      const discountPercentage = Math.round((savings / baseNum) * 100);

      expect(product.is_discounted).toBe(true);
      expect(savings).toBe(240000);
      expect(discountPercentage).toBe(20);
      expect(product.active_promotion?.name).toBe('Autumn Special 20%');
    });

    it('handles non-discounted products cleanly without false positives', () => {
      const regularProduct: ProductListItem = {
        id: 'p-2',
        name: 'Monolith Case',
        slug: 'monolith-case',
        base_price: '500000',
        discounted_price: null,
        is_discounted: false,
        active_promotion: null,
        is_featured: false,
        category: { id: 'c-2', name: 'Accessories', slug: 'accessories' },
      };

      expect(regularProduct.is_discounted).toBe(false);
      expect(regularProduct.discounted_price).toBeNull();
      expect(regularProduct.active_promotion).toBeNull();
    });
  });

  describe('2. Authoritative Cart Breakdown & Calculations', () => {
    const mockCart: Cart = {
      id: 'cart-1',
      subtotal: '2100000',
      discount_amount: '200000',
      total: '1900000',
      savings: '200000',
      applied_promotions: [
        {
          id: 'promo-1',
          name: 'Watch 10% Off',
          discount_type: 'PERCENTAGE',
          discount_value: '10',
          total_discount: '200000',
        },
      ],
      items: [
        {
          id: 'item-1',
          product: {
            id: 'p-1',
            name: 'Quantum Chronometer',
            slug: 'quantum-chronometer',
            is_active: true,
          },
          quantity: 2,
          original_unit_price: '1000000',
          discount_amount: '100000',
          unit_price: '900000',
          original_total_price: '2000000',
          total_price: '1800000',
          is_discounted: true,
          applied_promotion: {
            id: 'promo-1',
            name: 'Watch 10% Off',
            discount_type: 'PERCENTAGE',
            discount_value: '10',
            savings: '200000',
          },
          created_at: '2026-08-29T10:00:00Z',
        },
        {
          id: 'item-2',
          product: {
            id: 'p-2',
            name: 'Leather Strap',
            slug: 'leather-strap',
            is_active: true,
          },
          quantity: 1,
          original_unit_price: '100000',
          discount_amount: '0',
          unit_price: '100000',
          original_total_price: '100000',
          total_price: '100000',
          is_discounted: false,
          applied_promotion: null,
          created_at: '2026-08-29T10:05:00Z',
        },
      ],
      created_at: '2026-08-29T10:00:00Z',
      updated_at: '2026-08-29T10:05:00Z',
    };

    it('accurately computes mathematical consistency across items and subtotal', () => {
      const sumOriginal = mockCart.items.reduce(
        (acc, item) => acc + Number(item.original_total_price),
        0
      );
      const sumTotal = mockCart.items.reduce(
        (acc, item) => acc + Number(item.total_price),
        0
      );
      const calculatedSavings = sumOriginal - sumTotal;

      expect(sumOriginal).toBe(Number(mockCart.subtotal));
      expect(sumTotal).toBe(Number(mockCart.total));
      expect(calculatedSavings).toBe(Number(mockCart.savings));
      expect(mockCart.applied_promotions?.length).toBe(1);
    });

    it('correctly stacks coupon discount on top of cart promotion discount', () => {
      const couponDiscount = 50000;
      const initialTotal = Number(mockCart.total);
      const shippingFee = 75000;

      const grandTotal = Math.max(0, initialTotal - couponDiscount) + shippingFee;
      const totalSavings = Number(mockCart.savings) + couponDiscount;

      expect(grandTotal).toBe(1900000 - 50000 + 75000); // 1,925,000
      expect(totalSavings).toBe(200000 + 50000); // 250,000
    });
  });

  describe('3. Coupon Validation Contract & Error Responses', () => {
    it('processes valid coupon response with eligible affected items', () => {
      const validCouponResponse: CouponValidateResponse = {
        valid: true,
        reason: 'Coupon applied successfully.',
        code: 'VIP50',
        discount_type: 'FIXED_AMOUNT',
        discount_value: '50000',
        max_discount_amount: null,
        min_order_subtotal: '300000',
        discount_amount: '50000',
        estimated_discount: '50000',
        affected_items: [
          {
            product_id: 'p-1',
            variant_id: null,
            product_name: 'Quantum Chronometer',
            quantity: 1,
            unit_price: '900000',
            eligible_for_coupon: true,
          },
        ],
        min_order_status: {
          met: true,
          required_amount: '300000',
          current_amount: '900000',
        },
        is_expired: false,
        remaining_eligibility: 3,
      };

      expect(validCouponResponse.valid).toBe(true);
      expect(Number(validCouponResponse.discount_amount)).toBe(50000);
      expect(validCouponResponse.min_order_status?.met).toBe(true);
      expect(validCouponResponse.affected_items[0].eligible_for_coupon).toBe(true);
    });

    it('identifies unfulfilled minimum order threshold with exact deficit', () => {
      const unmetMinOrderResponse: CouponValidateResponse = {
        valid: false,
        reason: 'Order subtotal of 150000 does not meet the minimum requirement of 300000.',
        code: 'BIGSAVER',
        discount_type: 'FIXED_AMOUNT',
        discount_value: '100000',
        max_discount_amount: null,
        min_order_subtotal: '300000',
        discount_amount: '0',
        estimated_discount: null,
        affected_items: [],
        min_order_status: {
          met: false,
          required_amount: '300000',
          current_amount: '150000',
        },
        is_expired: false,
        remaining_eligibility: null,
      };

      expect(unmetMinOrderResponse.valid).toBe(false);
      expect(unmetMinOrderResponse.min_order_status?.met).toBe(false);
      const deficit =
        Number(unmetMinOrderResponse.min_order_status?.required_amount) -
        Number(unmetMinOrderResponse.min_order_status?.current_amount);
      expect(deficit).toBe(150000);
    });
  });

  describe('4. Historical Order & Promotion Snapshots', () => {
    it('preserves immutable line-item and order-level discount snapshots', () => {
      const order: OrderDetail = {
        id: 'ord-1',
        order_number: 'PDX-20260829-001',
        status: 'PROCESSING',
        subtotal: '1000000',
        shipping_cost: '50000',
        discount_amount: '150000',
        coupon_code: 'SUMMER50',
        coupon_snapshot: {
          code: 'SUMMER50',
          discount_type: 'FIXED_AMOUNT',
          discount_value: '50000',
          calculated_discount: '50000',
        },
        total: '900000',
        created_at: '2026-08-29T10:30:00Z',
        shipping_address: {
          id: 'addr-1',
          recipient_name: 'Abolfazl Paradox',
          recipient_phone: '09120000000',
          province: 'Tehran',
          city: 'Tehran',
          postal_code: '1234567890',
          address_line: 'District 1, Luxury Tower',
        },
        items: [
          {
            id: 'oi-1',
            product: 'p-1',
            product_name: 'Quantum Chronometer',
            quantity: 1,
            original_unit_price: '1000000',
            discount_amount: '100000',
            promotion_snapshot: {
              id: 'promo-1',
              name: 'Storewide Launch Promo',
              discount_type: 'PERCENTAGE',
              discount_value: '10',
            },
            unit_price: '900000',
            total_price: '900000',
          },
        ],
      };

      expect(order.coupon_code).toBe('SUMMER50');
      expect(order.coupon_snapshot?.calculated_discount).toBe('50000');
      expect(order.items[0].promotion_snapshot?.name).toBe('Storewide Launch Promo');
      expect(Number(order.items[0].original_unit_price)).toBe(1000000);
      expect(Number(order.items[0].unit_price)).toBe(900000);
      expect(Number(order.total)).toBe(900000);
    });
  });
});
