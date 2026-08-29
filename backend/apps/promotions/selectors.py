from django.db.models import Prefetch, Q, QuerySet
from django.utils import timezone

from .models import Coupon, CouponUsage, Promotion


class PromotionSelector:
    """Read-only query methods for the Promotion domain."""

    @staticmethod
    def get_active_promotions(*, now=None) -> QuerySet[Promotion]:
        """
        Returns promotions that are currently active and within their valid time window.

        Rules:
        - is_active must be True
        - start_at is null OR start_at <= now
        - end_at is null OR end_at > now
        """
        if now is None:
            now = timezone.now()

        return (
            Promotion.objects.filter(is_active=True)
            .filter(Q(start_at__isnull=True) | Q(start_at__lte=now))
            .filter(Q(end_at__isnull=True) | Q(end_at__gt=now))
            .prefetch_related(
                "included_products",
                "excluded_products",
                "included_categories",
                "included_brands",
            )
            .order_by("priority", "-created_at")
        )

    @staticmethod
    def get_promotions_for_product(product, *, now=None) -> list[Promotion]:
        """
        Returns active promotions that target a specific product.

        A promotion targets a product if:
        1. Product is NOT in excluded_products, AND
        2. One of:
           a. No inclusions are set (global promotion), OR
           b. Product is in included_products, OR
           c. Product's category is in included_categories, OR
           d. Product's brand is in included_brands
        """
        active = PromotionSelector.get_active_promotions(now=now)
        matching = []

        for promo in active:
            excluded_ids = set(promo.excluded_products.values_list("id", flat=True))
            if product.id in excluded_ids:
                continue

            included_product_ids = set(promo.included_products.values_list("id", flat=True))
            included_category_ids = set(promo.included_categories.values_list("id", flat=True))
            included_brand_ids = set(promo.included_brands.values_list("id", flat=True))

            has_any_inclusion = included_product_ids or included_category_ids or included_brand_ids

            if not has_any_inclusion:
                # Global promotion — applies to all non-excluded products
                matching.append(promo)
            elif product.id in included_product_ids:
                matching.append(promo)
            elif product.category_id in included_category_ids:
                matching.append(promo)
            elif product.brand_id and product.brand_id in included_brand_ids:
                matching.append(promo)

        return matching

    @staticmethod
    def get_all_promotions() -> QuerySet[Promotion]:
        """Returns all promotions for admin listing."""
        return Promotion.objects.prefetch_related(
            "included_products",
            "excluded_products",
            "included_categories",
            "included_brands",
        ).order_by("priority", "-created_at")


class CouponSelector:
    """Read-only query methods for the Coupon domain."""

    @staticmethod
    def get_coupon_by_code(code: str) -> Coupon | None:
        """Case-insensitive coupon lookup by code."""
        normalized = code.upper().strip()
        return (
            Coupon.objects.prefetch_related(
                "included_products",
                "excluded_products",
                "included_categories",
                "included_brands",
                "eligible_users",
            )
            .filter(code=normalized)
            .first()
        )

    @staticmethod
    def get_user_coupon_usage_count(coupon: Coupon, user) -> int:
        """Returns the number of times a user has redeemed a specific coupon."""
        return CouponUsage.objects.filter(coupon=coupon, user=user).count()

    @staticmethod
    def get_all_coupons() -> QuerySet[Coupon]:
        """Returns all coupons for admin listing."""
        return Coupon.objects.order_by("-created_at")

    @staticmethod
    def get_coupon_usages(coupon: Coupon) -> QuerySet[CouponUsage]:
        """Returns all usage records for a specific coupon."""
        return (
            CouponUsage.objects.filter(coupon=coupon)
            .select_related("user", "order")
            .order_by("-redeemed_at")
        )


class PromotionReportSelector:
    """Aggregated reporting queries for promotions and coupons."""

    @staticmethod
    def get_promotion_reports(*, start_date=None, end_date=None) -> dict:
        """
        Calculates high-level KPIs and breakdown metrics for promotions and coupons.
        Filters by date range if provided.
        """
        from django.db.models import Count, Sum
        from apps.orders.models import Order

        now = timezone.now()

        # Base querysets
        orders_qs = Order.objects.exclude(status=Order.OrderStatus.CANCELLED)
        usages_qs = CouponUsage.objects.all()

        if start_date:
            orders_qs = orders_qs.filter(created_at__gte=start_date)
            usages_qs = usages_qs.filter(redeemed_at__gte=start_date)
        if end_date:
            orders_qs = orders_qs.filter(created_at__lte=end_date)
            usages_qs = usages_qs.filter(redeemed_at__lte=end_date)

        # Aggregate discount metrics
        order_discount_agg = orders_qs.aggregate(
            total_discount=Sum("discount_amount"),
            revenue_affected=Sum("total", filter=Q(discount_amount__gt=0) | Q(coupon_code__isnull=False)),
            orders_with_coupons=Count("id", filter=Q(coupon_code__isnull=False) & ~Q(coupon_code="")),
            orders_with_promotions=Count("id", filter=Q(discount_amount__gt=0) & (Q(coupon_code__isnull=True) | Q(coupon_code=""))),
            total_orders=Count("id"),
        )

        coupon_usage_agg = usages_qs.aggregate(
            redemptions_count=Count("id"),
            total_coupon_discount=Sum("discount_amount"),
        )

        total_discounts_given = order_discount_agg["total_discount"] or 0
        coupon_redemptions = coupon_usage_agg["redemptions_count"] or 0
        total_coupon_discounts = coupon_usage_agg["total_coupon_discount"] or 0
        revenue_affected = order_discount_agg["revenue_affected"] or 0
        orders_with_coupons = order_discount_agg["orders_with_coupons"] or 0
        orders_with_promotions = order_discount_agg["orders_with_promotions"] or 0

        # Campaign status metrics
        active_promotions_count = Promotion.objects.filter(
            is_active=True
        ).filter(Q(start_at__isnull=True) | Q(start_at__lte=now)).filter(Q(end_at__isnull=True) | Q(end_at__gt=now)).count()

        active_coupons_count = Coupon.objects.filter(
            is_active=True
        ).filter(Q(start_at__isnull=True) | Q(start_at__lte=now)).filter(Q(end_at__isnull=True) | Q(end_at__gt=now)).count()

        expired_promotions_count = Promotion.objects.filter(end_at__lte=now).count()
        expired_coupons_count = Coupon.objects.filter(end_at__lte=now).count()

        # Most used and least used coupons
        most_used_coupons = list(
            Coupon.objects.filter(usage_count__gt=0)
            .order_by("-usage_count")[:5]
            .values("id", "code", "discount_type", "discount_value", "usage_count", "total_usage_limit", "is_active")
        )

        least_used_coupons = list(
            Coupon.objects.filter(is_active=True)
            .order_by("usage_count")[:5]
            .values("id", "code", "discount_type", "discount_value", "usage_count", "total_usage_limit", "is_active")
        )

        return {
            "total_discounts_given": total_discounts_given,
            "coupon_redemptions": coupon_redemptions,
            "total_coupon_discounts": total_coupon_discounts,
            "revenue_affected": revenue_affected,
            "orders_with_coupons": orders_with_coupons,
            "orders_with_promotions": orders_with_promotions,
            "active_promotions_count": active_promotions_count,
            "active_coupons_count": active_coupons_count,
            "active_campaigns": active_promotions_count + active_coupons_count,
            "expired_campaigns": expired_promotions_count + expired_coupons_count,
            "most_used_coupons": most_used_coupons,
            "least_used_coupons": least_used_coupons,
        }

