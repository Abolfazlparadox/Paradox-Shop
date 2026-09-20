"""
Promotions & Coupons — Business Logic Layer

Discount Calculation Pipeline
=============================

    Cart Items
        ↓
    Filter eligible items (exclude excluded products)
        ↓
    Apply best single automatic Promotion per item
      (highest priority wins; ties broken by largest discount)
        ↓
    Calculate promotion discounts per item
        ↓
    Validate & apply Coupon to eligible remaining subtotal
        ↓
    Enforce constraints (max_discount, min_order, floor at 0)
        ↓
    Return DiscountResult

Stacking Policy (Explicit)
==========================

1. ONE best automatic Promotion per product/variant.
   If multiple promotions target the same item, the one producing the
   largest discount wins. Ties broken by lower `priority` value.

2. Coupon applies to the POST-PROMOTION eligible subtotal.
   The coupon is a cart-level discount, not per-item.

3. Coupon excluded/included products are respected.
   Items excluded from the coupon do not contribute to the coupon-eligible
   subtotal.

4. Total NEVER goes below 0.
   max(0, subtotal - promotion_discounts - coupon_discount) + shipping.

5. Rounding: Truncate (floor) to whole Rial.
   DecimalField(12, 0) enforces this at the DB level.
"""

import logging
import uuid
from dataclasses import dataclass, field
from decimal import ROUND_DOWN, Decimal
from typing import Any

from django.db import models as db_models, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from common.audit_services import record_audit_log
from common.notification_services import create_admin_notification
from common.models import AdminNotification

from .models import AudienceType, Coupon, CouponUsage, DiscountType, Promotion
from .selectors import CouponSelector, PromotionSelector

logger = logging.getLogger(__name__)

ZERO = Decimal("0")


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------


@dataclass
class ItemDiscount:
    """Discount breakdown for a single cart line item."""

    product_id: uuid.UUID
    variant_id: uuid.UUID | None
    quantity: int
    original_unit_price: Decimal
    promotion_discount_per_unit: Decimal = ZERO
    final_unit_price: Decimal = ZERO
    promotion_id: uuid.UUID | None = None
    promotion_name: str | None = None
    discount_type: str | None = None
    discount_value: Decimal | None = None

    def __post_init__(self):
        self.final_unit_price = max(
            ZERO, self.original_unit_price - self.promotion_discount_per_unit
        )


@dataclass
class DiscountResult:
    """Complete discount breakdown for a cart."""

    item_discounts: list[ItemDiscount] = field(default_factory=list)
    promotion_total: Decimal = ZERO
    coupon_discount: Decimal = ZERO
    coupon_id: uuid.UUID | None = None
    coupon_code: str | None = None
    subtotal_before_discounts: Decimal = ZERO
    subtotal_after_discounts: Decimal = ZERO
    total_discount: Decimal = ZERO

    def __post_init__(self):
        self._recalculate()

    def _recalculate(self):
        self.promotion_total = sum(
            (item.promotion_discount_per_unit * item.quantity for item in self.item_discounts),
            ZERO,
        )
        self.subtotal_before_discounts = sum(
            (item.original_unit_price * item.quantity for item in self.item_discounts),
            ZERO,
        )
        self.total_discount = self.promotion_total + self.coupon_discount
        self.subtotal_after_discounts = max(
            ZERO, self.subtotal_before_discounts - self.total_discount
        )


# ---------------------------------------------------------------------------
# Promotion Engine — the centralized discount calculator
# ---------------------------------------------------------------------------


class PromotionEngine:
    """
    Stateless discount calculation engine.

    All methods are static. No instance state required.
    """

    @staticmethod
    def calculate_item_promotion_discount(
        *, original_price: Decimal, promotion: Promotion
    ) -> Decimal:
        """
        Calculates the discount amount for a single unit of a product
        under a given promotion.

        Returns the discount amount (not the final price).
        """
        if promotion.discount_type == DiscountType.FIXED_AMOUNT:
            discount = min(promotion.discount_value, original_price)
        else:
            # Percentage
            discount = (original_price * promotion.discount_value / Decimal("100")).quantize(
                Decimal("1"), rounding=ROUND_DOWN
            )
            if promotion.max_discount_amount is not None:
                discount = min(discount, promotion.max_discount_amount)

        return min(discount, original_price)

    @staticmethod
    def _find_best_promotion_for_product(
        product, promotions: list[Promotion], original_price: Decimal
    ) -> tuple[Promotion | None, Decimal]:
        """
        Finds the single best promotion for a product from a list of candidates.

        Selection criteria:
        1. Produces the largest discount amount.
        2. Ties broken by lower priority value (ascending).
        3. Further ties broken by earlier creation (ascending).
        """
        best_promo = None
        best_discount = ZERO

        for promo in promotions:
            discount = PromotionEngine.calculate_item_promotion_discount(
                original_price=original_price, promotion=promo
            )
            if discount > best_discount or (
                discount == best_discount
                and best_promo is not None
                and (promo.priority < best_promo.priority)
            ):
                best_promo = promo
                best_discount = discount

        return best_promo, best_discount

    @staticmethod
    def calculate_cart_discounts(
        *,
        cart_items: list[dict[str, Any]],
        coupon_code: str | None = None,
        user=None,
    ) -> DiscountResult:
        """
        Main entry point for discount calculation.

        Parameters
        ----------
        cart_items : list of dicts
            Each dict must have:
            - product: Product instance
            - variant: ProductVariant instance or None
            - quantity: int
            - unit_price: Decimal (the live/locked price)
        coupon_code : str or None
            Optional coupon code to apply.
        user : User or None
            The authenticated user (required for coupon validation).

        Returns
        -------
        DiscountResult
        """
        now = timezone.now()
        active_promotions = list(PromotionSelector.get_active_promotions(now=now))

        item_discounts: list[ItemDiscount] = []

        # --- Phase 1: Apply best promotion per item ---
        for cart_item in cart_items:
            product = cart_item["product"]
            variant = cart_item["variant"]
            quantity = cart_item["quantity"]
            original_price = cart_item["unit_price"]

            matching_promos = PromotionSelector.get_promotions_for_product(product, now=now)
            best_promo, best_discount = PromotionEngine._find_best_promotion_for_product(
                product, matching_promos, original_price
            )

            item_discount = ItemDiscount(
                product_id=product.id,
                variant_id=variant.id if variant else None,
                quantity=quantity,
                original_unit_price=original_price,
                promotion_discount_per_unit=best_discount,
                promotion_id=best_promo.id if best_promo else None,
                promotion_name=best_promo.name if best_promo else None,
                discount_type=best_promo.discount_type if best_promo else None,
                discount_value=best_promo.discount_value if best_promo else None,
            )
            item_discounts.append(item_discount)

        result = DiscountResult(item_discounts=item_discounts)
        result._recalculate()

        # --- Phase 2: Apply coupon to eligible remaining subtotal ---
        if coupon_code and user:
            try:
                coupon = CouponValidator.validate(
                    code=coupon_code,
                    user=user,
                    subtotal=result.subtotal_after_discounts,
                )
                coupon_discount = PromotionEngine._calculate_coupon_discount(
                    coupon=coupon,
                    item_discounts=item_discounts,
                )
                result.coupon_discount = coupon_discount
                result.coupon_id = coupon.id
                result.coupon_code = coupon.code
                result._recalculate()
            except ValidationError:
                # Coupon is invalid — continue without it but don't swallow
                raise

        logger.info(
            "Discount calculated: subtotal_before=%s promotion_total=%s "
            "coupon_discount=%s subtotal_after=%s coupon_code=%s user_id=%s",
            result.subtotal_before_discounts,
            result.promotion_total,
            result.coupon_discount,
            result.subtotal_after_discounts,
            result.coupon_code,
            getattr(user, "id", None),
        )

        return result

    @staticmethod
    def _calculate_coupon_discount(
        *, coupon: Coupon, item_discounts: list[ItemDiscount]
    ) -> Decimal:
        """
        Calculates coupon discount on the eligible post-promotion subtotal.

        Only items not excluded by the coupon's targeting rules contribute
        to the coupon-eligible subtotal.
        """
        excluded_product_ids = set(coupon.excluded_products.values_list("id", flat=True))
        included_product_ids = set(coupon.included_products.values_list("id", flat=True))
        included_category_ids = set(coupon.included_categories.values_list("id", flat=True))
        included_brand_ids = set(coupon.included_brands.values_list("id", flat=True))
        has_any_inclusion = included_product_ids or included_category_ids or included_brand_ids

        eligible_subtotal = ZERO
        for item in item_discounts:
            if item.product_id in excluded_product_ids:
                continue

            if has_any_inclusion:
                # Need to check if this product matches any inclusion set
                # We don't have the product instance here, so we use product_id
                # For simplicity, when coupon has product-level targeting we check
                # only included_product_ids. Category/brand targeting would require
                # the product instance. We resolve this by pre-loading the product IDs
                # from included categories and brands.
                from apps.products.models import Product

                try:
                    product = Product.objects.select_related("category", "brand").get(
                        id=item.product_id
                    )
                except Product.DoesNotExist:
                    continue

                matches = False
                if item.product_id in included_product_ids:
                    matches = True
                elif product.category_id in included_category_ids:
                    matches = True
                elif product.brand_id and product.brand_id in included_brand_ids:
                    matches = True

                if not matches:
                    continue

            eligible_subtotal += item.final_unit_price * item.quantity

        if eligible_subtotal <= ZERO:
            return ZERO

        if coupon.discount_type == DiscountType.FIXED_AMOUNT:
            discount = min(coupon.discount_value, eligible_subtotal)
        else:
            discount = (eligible_subtotal * coupon.discount_value / Decimal("100")).quantize(
                Decimal("1"), rounding=ROUND_DOWN
            )
            if coupon.max_discount_amount is not None:
                discount = min(discount, coupon.max_discount_amount)

        return min(discount, eligible_subtotal)


# ---------------------------------------------------------------------------
# Coupon Validation
# ---------------------------------------------------------------------------


class CouponValidator:
    """Validates a coupon against all business rules."""

    @staticmethod
    def validate(*, code: str, user, subtotal: Decimal) -> Coupon:
        """
        Validates a coupon code for a specific user and order subtotal.

        Raises ValidationError if the coupon is invalid.
        Returns the validated Coupon instance.
        """
        coupon = CouponSelector.get_coupon_by_code(code)
        if coupon is None:
            logger.info("coupon.rejected: code=%s reason=not_found user_id=%s", code, user.id)
            raise ValidationError({"coupon_code": "Invalid coupon code."})

        now = timezone.now()

        # Active check
        if not coupon.is_active:
            logger.info(
                "coupon.rejected: code=%s reason=inactive user_id=%s", coupon.code, user.id
            )
            raise ValidationError({"coupon_code": "This coupon is no longer active."})

        # Time window: not started
        if coupon.start_at and now < coupon.start_at:
            logger.info(
                "coupon.rejected: code=%s reason=not_started user_id=%s", coupon.code, user.id
            )
            raise ValidationError({"coupon_code": "This coupon is not yet valid."})

        # Time window: expired
        if coupon.end_at and now >= coupon.end_at:
            logger.info(
                "coupon.expired: code=%s reason=expired user_id=%s", coupon.code, user.id
            )
            raise ValidationError({"coupon_code": "This coupon has expired."})

        # Audience check
        if coupon.audience_type == AudienceType.SPECIFIC_USERS:
            eligible_ids = set(coupon.eligible_users.values_list("id", flat=True))
            if user.id not in eligible_ids:
                logger.info(
                    "coupon.rejected: code=%s reason=not_eligible user_id=%s",
                    coupon.code,
                    user.id,
                )
                raise ValidationError({"coupon_code": "You are not eligible for this coupon."})

        # Global usage limit
        if coupon.total_usage_limit is not None and coupon.usage_count >= coupon.total_usage_limit:
            logger.info(
                "coupon.limit_reached: code=%s reason=global_limit user_id=%s",
                coupon.code,
                user.id,
            )
            raise ValidationError({"coupon_code": "This coupon has reached its usage limit."})

        # Per-user usage limit
        user_usage = CouponSelector.get_user_coupon_usage_count(coupon, user)
        if user_usage >= coupon.per_user_usage_limit:
            logger.info(
                "coupon.limit_reached: code=%s reason=per_user_limit user_id=%s usage=%d limit=%d",
                coupon.code,
                user.id,
                user_usage,
                coupon.per_user_usage_limit,
            )
            raise ValidationError(
                {"coupon_code": "You have already used this coupon the maximum number of times."}
            )

        # Minimum order subtotal
        if subtotal > Decimal("0") and subtotal < coupon.min_order_subtotal:
            logger.info(
                "coupon.rejected: code=%s reason=min_subtotal subtotal=%s min=%s user_id=%s",
                coupon.code,
                subtotal,
                coupon.min_order_subtotal,
                user.id,
            )
            raise ValidationError(
                {
                    "coupon_code": (
                        f"Order subtotal must be at least "
                        f"{coupon.min_order_subtotal:,.0f} Rial to use this coupon."
                    )
                }
            )

        return coupon


# ---------------------------------------------------------------------------
# Coupon Service — mutations
# ---------------------------------------------------------------------------


class CouponService:
    """Business logic for coupon mutations."""

    @staticmethod
    @transaction.atomic
    def redeem_coupon(*, coupon: Coupon, user, order, discount_amount: Decimal) -> CouponUsage:
        """
        Records a coupon redemption atomically.

        Uses select_for_update to prevent race-condition over-redemption.
        """
        # Lock the coupon row to prevent concurrent over-redemption
        locked_coupon = Coupon.objects.select_for_update().get(pk=coupon.pk)

        # Re-validate usage limits under lock
        if (
            locked_coupon.total_usage_limit is not None
            and locked_coupon.usage_count >= locked_coupon.total_usage_limit
        ):
            raise ValidationError(
                {"coupon_code": "This coupon has reached its usage limit."}
            )

        user_usage = CouponSelector.get_user_coupon_usage_count(locked_coupon, user)
        if user_usage >= locked_coupon.per_user_usage_limit:
            raise ValidationError(
                {"coupon_code": "You have already used this coupon the maximum number of times."}
            )

        # Create usage record
        usage = CouponUsage.objects.create(
            coupon=locked_coupon,
            user=user,
            order=order,
            discount_amount=discount_amount,
        )

        # Increment denormalized counter
        locked_coupon.usage_count = F("usage_count") + 1
        locked_coupon.save(update_fields=["usage_count"])

        # Check if usage limit was reached
        if locked_coupon.total_usage_limit is not None:
            # Refresh to evaluate F expression
            locked_coupon.refresh_from_db(fields=["usage_count"])
            if locked_coupon.usage_count >= locked_coupon.total_usage_limit:
                create_admin_notification(
                    title="Coupon Usage Limit Reached",
                    message=f"Coupon voucher '{locked_coupon.code}' has reached its maximum quota of {locked_coupon.total_usage_limit} redemptions.",
                    notification_type=AdminNotification.NotificationType.SYSTEM,
                    action_url="/admin/promotions/coupons",
                    resource_id=str(locked_coupon.id),
                )

        logger.info(
            "coupon.redeemed: code=%s user_id=%s order_id=%s discount=%s",
            locked_coupon.code,
            user.id,
            order.id,
            discount_amount,
        )

        return usage

    @staticmethod
    @transaction.atomic
    def create_coupon(*, data: dict, request=None) -> Coupon:
        """Creates a new coupon with audit logging and admin notification."""
        eligible_users = data.pop("eligible_users", [])
        included_products = data.pop("included_products", [])
        excluded_products = data.pop("excluded_products", [])
        included_categories = data.pop("included_categories", [])
        included_brands = data.pop("included_brands", [])

        coupon = Coupon.objects.create(**data)

        if eligible_users:
            coupon.eligible_users.set(eligible_users)
        if included_products:
            coupon.included_products.set(included_products)
        if excluded_products:
            coupon.excluded_products.set(excluded_products)
        if included_categories:
            coupon.included_categories.set(included_categories)
        if included_brands:
            coupon.included_brands.set(included_brands)

        record_audit_log(
            action="coupon.created",
            resource_type="Coupon",
            resource_id=str(coupon.id),
            request=request,
            metadata={"code": coupon.code, "discount_type": coupon.discount_type},
        )

        create_admin_notification(
            title="Coupon Created",
            message=f"New promotional voucher '{coupon.code}' created.",
            notification_type=AdminNotification.NotificationType.SYSTEM,
            action_url="/admin/promotions/coupons",
            resource_id=str(coupon.id),
        )

        logger.info("coupon.created: code=%s id=%s", coupon.code, coupon.id)
        return coupon

    @staticmethod
    @transaction.atomic
    def update_coupon(*, coupon: Coupon, data: dict, request=None) -> Coupon:
        """Updates an existing coupon with audit logging."""
        eligible_users = data.pop("eligible_users", None)
        included_products = data.pop("included_products", None)
        excluded_products = data.pop("excluded_products", None)
        included_categories = data.pop("included_categories", None)
        included_brands = data.pop("included_brands", None)

        for attr, value in data.items():
            setattr(coupon, attr, value)
        coupon.save()

        if eligible_users is not None:
            coupon.eligible_users.set(eligible_users)
        if included_products is not None:
            coupon.included_products.set(included_products)
        if excluded_products is not None:
            coupon.excluded_products.set(excluded_products)
        if included_categories is not None:
            coupon.included_categories.set(included_categories)
        if included_brands is not None:
            coupon.included_brands.set(included_brands)

        record_audit_log(
            action="coupon.updated",
            resource_type="Coupon",
            resource_id=str(coupon.id),
            request=request,
            metadata={"code": coupon.code},
        )

        logger.info("coupon.updated: code=%s id=%s", coupon.code, coupon.id)
        return coupon

    @staticmethod
    @transaction.atomic
    def toggle_activation(*, coupon: Coupon, request=None) -> Coupon:
        """Toggles coupon active status."""
        coupon.is_active = not coupon.is_active
        coupon.save(update_fields=["is_active"])

        action = "coupon.activated" if coupon.is_active else "coupon.deactivated"
        record_audit_log(
            action=action,
            resource_type="Coupon",
            resource_id=str(coupon.id),
            request=request,
            metadata={"code": coupon.code, "is_active": coupon.is_active},
        )

        create_admin_notification(
            title=f"Coupon {'Activated' if coupon.is_active else 'Deactivated'}",
            message=f"Voucher '{coupon.code}' is now {'ACTIVE' if coupon.is_active else 'INACTIVE'}.",
            notification_type=AdminNotification.NotificationType.SYSTEM,
            action_url="/admin/promotions/coupons",
            resource_id=str(coupon.id),
        )

        logger.info("%s: code=%s id=%s", action, coupon.code, coupon.id)
        return coupon


# ---------------------------------------------------------------------------
# Promotion Service — mutations
# ---------------------------------------------------------------------------

class PromotionService:
    """Business logic for promotion mutations."""

    @staticmethod
    @transaction.atomic
    def create_promotion(*, data: dict, request=None) -> Promotion:
        """Creates a new promotion with audit logging."""
        included_products = data.pop("included_products", [])
        excluded_products = data.pop("excluded_products", [])
        included_categories = data.pop("included_categories", [])
        included_brands = data.pop("included_brands", [])

        promotion = Promotion.objects.create(**data)

        if included_products:
            promotion.included_products.set(included_products)
        if excluded_products:
            promotion.excluded_products.set(excluded_products)
        if included_categories:
            promotion.included_categories.set(included_categories)
        if included_brands:
            promotion.included_brands.set(included_brands)

        record_audit_log(
            action="promotion.created",
            resource_type="Promotion",
            resource_id=str(promotion.id),
            request=request,
            metadata={"name": promotion.name, "discount_type": promotion.discount_type},
        )

        create_admin_notification(
            title="Promotion Campaign Created",
            message=f"Campaign '{promotion.name}' was created.",
            notification_type=AdminNotification.NotificationType.SYSTEM,
            action_url="/admin/promotions",
            resource_id=str(promotion.id),
        )

        logger.info("promotion.created: name=%s id=%s", promotion.name, promotion.id)
        return promotion

    @staticmethod
    @transaction.atomic
    def update_promotion(*, promotion: Promotion, data: dict, request=None) -> Promotion:
        """Updates an existing promotion with audit logging."""
        included_products = data.pop("included_products", None)
        excluded_products = data.pop("excluded_products", None)
        included_categories = data.pop("included_categories", None)
        included_brands = data.pop("included_brands", None)

        for attr, value in data.items():
            setattr(promotion, attr, value)
        promotion.save()

        if included_products is not None:
            promotion.included_products.set(included_products)
        if excluded_products is not None:
            promotion.excluded_products.set(excluded_products)
        if included_categories is not None:
            promotion.included_categories.set(included_categories)
        if included_brands is not None:
            promotion.included_brands.set(included_brands)

        record_audit_log(
            action="promotion.updated",
            resource_type="Promotion",
            resource_id=str(promotion.id),
            request=request,
            metadata={"name": promotion.name},
        )

        logger.info("promotion.updated: name=%s id=%s", promotion.name, promotion.id)
        return promotion

    @staticmethod
    @transaction.atomic
    def toggle_activation(*, promotion: Promotion, request=None) -> Promotion:
        """Toggles promotion active status."""
        promotion.is_active = not promotion.is_active
        promotion.save(update_fields=["is_active"])

        action = "promotion.activated" if promotion.is_active else "promotion.deactivated"
        record_audit_log(
            action=action,
            resource_type="Promotion",
            resource_id=str(promotion.id),
            request=request,
            metadata={"name": promotion.name, "is_active": promotion.is_active},
        )

        create_admin_notification(
            title=f"Promotion {'Activated' if promotion.is_active else 'Deactivated'}",
            message=f"Campaign '{promotion.name}' is now {'ACTIVE' if promotion.is_active else 'INACTIVE'}.",
            notification_type=AdminNotification.NotificationType.SYSTEM,
            action_url="/admin/promotions",
            resource_id=str(promotion.id),
        )

        logger.info("%s: name=%s id=%s", action, promotion.name, promotion.id)
        return promotion




