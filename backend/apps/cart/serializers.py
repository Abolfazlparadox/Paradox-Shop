from decimal import Decimal

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
    """Serializer representing a single line item inside the Cart."""

    product = CartItemProductSerializer(read_only=True)
    variant = CartItemVariantSerializer(read_only=True, allow_null=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "product", "variant", "quantity", "unit_price", "total_price", "created_at"]
        read_only_fields = ["id", "unit_price", "created_at"]


class CartSerializer(serializers.ModelSerializer):
    """Serializer representing the full Cart with its line items and computed totals."""

    items = CartItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "session_key", "items", "items_count", "subtotal", "created_at", "updated_at"]

    def get_items_count(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())

    def get_subtotal(self, obj) -> str:
        total = sum((item.total_price for item in obj.items.all()), Decimal("0"))
        return str(total)


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
