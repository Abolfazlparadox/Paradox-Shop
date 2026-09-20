# ADR-006: Promotion Engine, Discount Calculation & Coupon Lifecycle Architecture

## Status
Accepted (Implemented in Phase 3)

## Context
As the Paradox Shop platform grew into an enterprise e-commerce system, business requirements dictated a robust, fraud-resistant promotion and coupon engine capable of:
1. Automatically applying store-wide or category/product-specific seasonal campaigns.
2. Supporting percentage and fixed-amount discounts with enforceable maximum discount ceilings (`max_discount_amount`).
3. Supporting promotional coupon codes with global and per-user usage limits.
4. Ensuring atomic coupon redemption at checkout to eliminate race conditions (double spending).
5. Offering real-time cart discount preview without mutating cart state.

## Decision
We implemented a dedicated `apps.promotions` Django app following our modular monolith pattern:

1. **Promotion Hierarchy & Priority**:
   - `Promotion` model defines base rules, discount types (`PERCENTAGE`, `FIXED_AMOUNT`), discount values, maximum discount caps, priority ordering, and optional start/end datetimes.
   - When multiple promotions match a product or cart, the engine resolves the conflict by selecting the promotion that provides the highest monetary discount to the customer (`PromotionService.calculate_best_promotion`).

2. **Rule-Based Targeting**:
   - `PromotionRule` supports targeted criteria (`MIN_ORDER_SUBTOTAL`, `MIN_QUANTITY`, `SPECIFIC_PRODUCTS`, `SPECIFIC_CATEGORIES`).

3. **Vouchers & Coupons**:
   - `Coupon` model links directly to a parent `Promotion`.
   - Coupon codes are normalized to uppercase and unique.
   - Strict usage limits: `usage_limit_total` and `usage_limit_per_user`.
   - Idempotent and concurrency-safe validation via `select_for_update` at order checkout.
   - Audit trail maintained via `CouponUsage` linking coupon, user, order, and exact discount applied.

4. **Cart Preview API**:
   - Endpoint `/api/v1/promotions/cart/preview/` calculates potential discounts on current cart or supplied items without writing to the database.

5. **Server Authority**:
   - Frontends only submit coupon strings (`coupon_code`). The backend calculates all subtotals, validates eligibility, applies the discount, and snapshots the discount details into `Order.coupon_snapshot` and `Order.discount_amount`.

## Consequences
- **Positive**: Complete auditability, prevention of discount stacking exploits, predictable pricing, zero client-side calculation trust.
- **Negative**: Adds database evaluation overhead during checkout, mitigated by indexing active promotions and caching promotion queries in Redis.
