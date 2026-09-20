from decimal import Decimal
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Cart, CartItem


class CartItemProductSerializer(serializers.Serializer):
    """Minimal Product snapshot embedded inside a CartItem representation."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    is_active = serializers.BooleanField()


class CartItemVariantSerializer(serializers.Serializer):
    """Minimal ProductVariant snapshot embedded inside a CartItem representation."""

    id = serializers.UUIDField()
    sku = serializers.CharField()
    name = serializers.CharField()
    stock = serializers.IntegerField()
    is_active = serializers.BooleanField()


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer representing a single line item inside the Cart with authoritative pricing."""

    product = CartItemProductSerializer(read_only=True)
    variant = CartItemVariantSerializer(read_only=True, allow_null=True)
    original_unit_price = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    original_total_price = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    is_discounted = serializers.SerializerMethodField()
    applied_promotion = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "variant",
            "quantity",
            "original_unit_price",
            "discount_amount",
            "unit_price",
            "original_total_price",
            "total_price",
            "is_discounted",
            "applied_promotion",
            "created_at",
        ]
        read_only_fields = fields

    def _get_item_pricing(self, obj):
        if not hasattr(obj, "_pricing_cache"):
            from apps.promotions.selectors import PromotionSelector
            from apps.promotions.services import PromotionEngine

            original_price = (
                obj.variant.final_price if obj.variant else obj.product.base_price
            )
            matching_promos = PromotionSelector.get_promotions_for_product(obj.product)
            best_promo, discount = PromotionEngine._find_best_promotion_for_product(
                obj.product, matching_promos, original_price
            )
            final_price = max(Decimal("0"), original_price - discount)

            obj._pricing_cache = {
                "original_unit_price": str(original_price),
                "discount_amount": str(discount),
                "unit_price": str(final_price),
                "original_total_price": str(original_price * obj.quantity),
                "total_price": str(final_price * obj.quantity),
                "is_discounted": discount > Decimal("0"),
                "applied_promotion": (
                    {
                        "id": str(best_promo.id),
                        "name": best_promo.name,
                        "discount_type": best_promo.discount_type,
                        "discount_value": str(best_promo.discount_value),
                        "savings": str(discount * obj.quantity),
                    }
                    if best_promo and discount > Decimal("0")
                    else None
                ),
            }
        return obj._pricing_cache

    @extend_schema_field({"type": "string"})
    def get_original_unit_price(self, obj) -> str:
        return self._get_item_pricing(obj)["original_unit_price"]

    @extend_schema_field({"type": "string"})
    def get_discount_amount(self, obj) -> str:
        return self._get_item_pricing(obj)["discount_amount"]

    @extend_schema_field({"type": "string"})
    def get_unit_price(self, obj) -> str:
        return self._get_item_pricing(obj)["unit_price"]

    @extend_schema_field({"type": "string"})
    def get_original_total_price(self, obj) -> str:
        return self._get_item_pricing(obj)["original_total_price"]

    @extend_schema_field({"type": "string"})
    def get_total_price(self, obj) -> str:
        return self._get_item_pricing(obj)["total_price"]

    @extend_schema_field({"type": "boolean"})
    def get_is_discounted(self, obj) -> bool:
        return self._get_item_pricing(obj)["is_discounted"]

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "discount_type": {"type": "string"},
                "discount_value": {"type": "string"},
                "savings": {"type": "string"},
            },
        }
    )
    def get_applied_promotion(self, obj):
        return self._get_item_pricing(obj)["applied_promotion"]


class CartSerializer(serializers.ModelSerializer):
    """Serializer representing the full Cart with its line items and authoritative promotion calculations."""

    items = CartItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    savings = serializers.SerializerMethodField()
    applied_promotions = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "session_key",
            "items",
            "items_count",
            "subtotal",
            "discount_amount",
            "total",
            "savings",
            "applied_promotions",
            "created_at",
            "updated_at",
        ]

    def _get_cart_totals(self, obj):
        if not hasattr(obj, "_totals_cache"):
            subtotal = Decimal("0")
            discount_amount = Decimal("0")
            promotions_dict = {}

            item_serializer = CartItemSerializer()
            for item in obj.items.all():
                pricing = item_serializer._get_item_pricing(item)
                item_orig_total = Decimal(pricing["original_total_price"])
                item_disc_total = Decimal(pricing["discount_amount"]) * item.quantity
                subtotal += item_orig_total
                discount_amount += item_disc_total

                promo = pricing["applied_promotion"]
                if promo:
                    p_id = promo["id"]
                    if p_id not in promotions_dict:
                        promotions_dict[p_id] = {
                            "id": p_id,
                            "name": promo["name"],
                            "discount_type": promo["discount_type"],
                            "discount_value": promo["discount_value"],
                            "total_discount": Decimal("0"),
                        }
                    promotions_dict[p_id]["total_discount"] += item_disc_total

            applied_promos = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "discount_type": p["discount_type"],
                    "discount_value": p["discount_value"],
                    "total_discount": str(p["total_discount"]),
                }
                for p in promotions_dict.values()
            ]

            total = max(Decimal("0"), subtotal - discount_amount)
            obj._totals_cache = {
                "subtotal": str(subtotal),
                "discount_amount": str(discount_amount),
                "total": str(total),
                "savings": str(discount_amount),
                "applied_promotions": applied_promos,
            }
        return obj._totals_cache

    @extend_schema_field({"type": "integer"})
    def get_items_count(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())

    @extend_schema_field({"type": "string"})
    def get_subtotal(self, obj) -> str:
        return self._get_cart_totals(obj)["subtotal"]

    @extend_schema_field({"type": "string"})
    def get_discount_amount(self, obj) -> str:
        return self._get_cart_totals(obj)["discount_amount"]

    @extend_schema_field({"type": "string"})
    def get_total(self, obj) -> str:
        return self._get_cart_totals(obj)["total"]

    @extend_schema_field({"type": "string"})
    def get_savings(self, obj) -> str:
        return self._get_cart_totals(obj)["savings"]

    @extend_schema_field(
        {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "discount_type": {"type": "string"},
                    "discount_value": {"type": "string"},
                    "total_discount": {"type": "string"},
                },
            },
        }
    )
    def get_applied_promotions(self, obj):
        return self._get_cart_totals(obj)["applied_promotions"]


class AddCartItemSerializer(serializers.Serializer):
    """Validates the payload for adding an item to the Cart."""

    product_id = serializers.UUIDField()
    variant_id = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """Validates the payload for updating a Cart item's quantity."""

    quantity = serializers.IntegerField(min_value=1)


class MergeCartSerializer(serializers.Serializer):
    """Validates the payload for merging a guest session Cart into the authenticated user's Cart."""

    session_key = serializers.CharField(required=False, allow_blank=True, default="")
