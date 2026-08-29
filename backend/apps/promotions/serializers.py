import re
import uuid

from rest_framework import serializers

from .models import Coupon, CouponUsage, Promotion


# ---------------------------------------------------------------------------
# Customer-facing serializers
# ---------------------------------------------------------------------------


class ActivePromotionSerializer(serializers.ModelSerializer):
    """Public representation of an active promotion for storefront display."""

    discount_type_display = serializers.CharField(
        source="get_discount_type_display", read_only=True
    )

    class Meta:
        model = Promotion
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "discount_type",
            "discount_type_display",
            "discount_value",
            "max_discount_amount",
            "start_at",
            "end_at",
        ]
        read_only_fields = fields


class CouponValidateSerializer(serializers.Serializer):
    """Input serializer for coupon validation."""

    code = serializers.CharField(
        max_length=50,
        help_text="The coupon code to validate.",
    )


class AffectedItemSerializer(serializers.Serializer):
    """Details of a line item evaluated for coupon eligibility."""

    product_id = serializers.UUIDField()
    variant_id = serializers.UUIDField(allow_null=True)
    product_name = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=0)
    eligible_for_coupon = serializers.BooleanField()


class MinOrderStatusSerializer(serializers.Serializer):
    """Status of order subtotal against coupon minimum threshold."""

    met = serializers.BooleanField()
    required_amount = serializers.DecimalField(max_digits=12, decimal_places=0)
    current_amount = serializers.DecimalField(max_digits=12, decimal_places=0)


class CouponValidateResponseSerializer(serializers.Serializer):
    """Response serializer showing coupon validity and discount preview."""

    valid = serializers.BooleanField()
    reason = serializers.CharField()
    code = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.DecimalField(max_digits=12, decimal_places=0)
    max_discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=0, allow_null=True
    )
    min_order_subtotal = serializers.DecimalField(max_digits=12, decimal_places=0)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=0)
    estimated_discount = serializers.DecimalField(
        max_digits=12, decimal_places=0, allow_null=True
    )
    affected_items = AffectedItemSerializer(many=True, default=list)
    min_order_status = MinOrderStatusSerializer(allow_null=True)
    is_expired = serializers.BooleanField(default=False)
    remaining_eligibility = serializers.IntegerField(allow_null=True, default=None)


class ItemDiscountSerializer(serializers.Serializer):
    """Single item discount breakdown in a cart preview."""

    product_id = serializers.UUIDField()
    variant_id = serializers.UUIDField(allow_null=True)
    quantity = serializers.IntegerField()
    original_unit_price = serializers.DecimalField(max_digits=12, decimal_places=0)
    promotion_discount_per_unit = serializers.DecimalField(max_digits=12, decimal_places=0)
    final_unit_price = serializers.DecimalField(max_digits=12, decimal_places=0)
    promotion_id = serializers.UUIDField(allow_null=True)
    promotion_name = serializers.CharField(allow_null=True)
    discount_type = serializers.CharField(allow_null=True)
    discount_value = serializers.DecimalField(
        max_digits=12, decimal_places=0, allow_null=True
    )


class CartDiscountPreviewSerializer(serializers.Serializer):
    """Full discount breakdown for a cart — response from the preview endpoint."""

    item_discounts = ItemDiscountSerializer(many=True)
    promotion_total = serializers.DecimalField(max_digits=12, decimal_places=0)
    coupon_discount = serializers.DecimalField(max_digits=12, decimal_places=0)
    coupon_id = serializers.UUIDField(allow_null=True)
    coupon_code = serializers.CharField(allow_null=True)
    subtotal_before_discounts = serializers.DecimalField(max_digits=12, decimal_places=0)
    subtotal_after_discounts = serializers.DecimalField(max_digits=12, decimal_places=0)
    total_discount = serializers.DecimalField(max_digits=12, decimal_places=0)


class CartDiscountPreviewRequestSerializer(serializers.Serializer):
    """Optional input for cart discount preview (to include coupon)."""

    coupon_code = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        max_length=50,
    )


# ---------------------------------------------------------------------------
# Admin serializers
# ---------------------------------------------------------------------------


from django.contrib.auth import get_user_model
from apps.categories.models import Category
from apps.products.models import Brand, Product

User = get_user_model()


class AdminPromotionSerializer(serializers.ModelSerializer):
    """Full promotion representation for admin CRUD operations."""

    slug = serializers.SlugField(required=False, allow_blank=True)
    discount_type_display = serializers.CharField(
        source="get_discount_type_display", read_only=True
    )
    included_products = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Product.objects.all(), required=False
    )
    excluded_products = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Product.objects.all(), required=False
    )
    included_categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), required=False
    )
    included_brands = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Brand.objects.all(), required=False
    )

    class Meta:
        model = Promotion
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "discount_type",
            "discount_type_display",
            "discount_value",
            "max_discount_amount",
            "start_at",
            "end_at",
            "is_active",
            "priority",
            "included_products",
            "excluded_products",
            "included_categories",
            "included_brands",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "discount_type_display"]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        # Normalize discount_type (case-insensitive)
        if "discount_type" in data and isinstance(data["discount_type"], str):
            dt = data["discount_type"].lower().strip()
            if "fixed" in dt:
                data["discount_type"] = "fixed_amount"
            elif "percent" in dt:
                data["discount_type"] = "percentage"
            else:
                data["discount_type"] = dt

        # Normalize slug
        if not data.get("slug") and data.get("name"):
            import re
            name = str(data.get("name"))
            base_slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
            data["slug"] = base_slug or f"promo-{uuid.uuid4().hex[:8]}"

        # Clean empty string dates/nullables
        for field_name in ("max_discount_amount", "start_at", "end_at"):
            if field_name in data and data[field_name] == "":
                data[field_name] = None

        return super().to_internal_value(data)


class AdminCouponSerializer(serializers.ModelSerializer):
    """Full coupon representation for admin CRUD operations."""

    discount_type_display = serializers.CharField(
        source="get_discount_type_display", read_only=True
    )
    eligible_users = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), required=False
    )
    included_products = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Product.objects.all(), required=False
    )
    excluded_products = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Product.objects.all(), required=False
    )
    included_categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), required=False
    )
    included_brands = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Brand.objects.all(), required=False
    )

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "description",
            "discount_type",
            "discount_type_display",
            "discount_value",
            "max_discount_amount",
            "min_order_subtotal",
            "start_at",
            "end_at",
            "is_active",
            "total_usage_limit",
            "per_user_usage_limit",
            "usage_count",
            "audience_type",
            "eligible_users",
            "included_products",
            "excluded_products",
            "included_categories",
            "included_brands",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "usage_count",
            "created_at",
            "updated_at",
            "discount_type_display",
        ]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        # Normalize code to uppercase
        if "code" in data and isinstance(data["code"], str):
            data["code"] = data["code"].strip().upper()

        # Normalize discount_type (case-insensitive)
        if "discount_type" in data and isinstance(data["discount_type"], str):
            dt = data["discount_type"].lower().strip()
            if "fixed" in dt:
                data["discount_type"] = "fixed_amount"
            elif "percent" in dt:
                data["discount_type"] = "percentage"
            else:
                data["discount_type"] = dt

        # Normalize audience_type
        if "audience_type" in data and isinstance(data["audience_type"], str):
            aud = data["audience_type"].lower().strip()
            if "specific" in aud:
                data["audience_type"] = "specific_users"
            else:
                data["audience_type"] = "all"

        # Clean empty strings for optional numeric/date fields
        for field_name in ("max_discount_amount", "total_usage_limit", "start_at", "end_at"):
            if field_name in data and data[field_name] == "":
                data[field_name] = None

        return super().to_internal_value(data)


class AdminCouponUsageSerializer(serializers.ModelSerializer):
    """Read-only serializer for coupon usage records."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True, default=None)

    class Meta:
        model = CouponUsage
        fields = [
            "id",
            "coupon",
            "user",
            "user_email",
            "order",
            "order_number",
            "discount_amount",
            "redeemed_at",
        ]
        read_only_fields = fields


class CouponLeaderboardItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.DecimalField(max_digits=12, decimal_places=0)
    usage_count = serializers.IntegerField()
    total_usage_limit = serializers.IntegerField(allow_null=True)
    is_active = serializers.BooleanField()


class AdminPromotionReportSerializer(serializers.Serializer):
    """Serializer for the promotion reports & analytics endpoint."""

    total_discounts_given = serializers.DecimalField(max_digits=14, decimal_places=0)
    coupon_redemptions = serializers.IntegerField()
    total_coupon_discounts = serializers.DecimalField(max_digits=14, decimal_places=0)
    revenue_affected = serializers.DecimalField(max_digits=14, decimal_places=0)
    orders_with_coupons = serializers.IntegerField()
    orders_with_promotions = serializers.IntegerField()
    active_promotions_count = serializers.IntegerField()
    active_coupons_count = serializers.IntegerField()
    active_campaigns = serializers.IntegerField()
    expired_campaigns = serializers.IntegerField()
    most_used_coupons = CouponLeaderboardItemSerializer(many=True)
    least_used_coupons = CouponLeaderboardItemSerializer(many=True)

