from rest_framework import serializers

from .models import Order, OrderAddress, OrderItem
from apps.shipping.serializers import ShipmentSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for a single Order line item with product/variant references."""

    product_name = serializers.CharField(read_only=True)
    variant_name = serializers.CharField(read_only=True, allow_null=True)
    sku = serializers.CharField(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "variant",
            "product_name",
            "variant_name",
            "sku",
            "quantity",
            "original_unit_price",
            "discount_amount",
            "promotion_snapshot",
            "unit_price",
            "total_price",
        ]
        read_only_fields = fields


class OrderAddressSerializer(serializers.ModelSerializer):
    """Serializer for the shipping address snapshot attached to an Order."""

    class Meta:
        model = OrderAddress
        fields = [
            "recipient_name",
            "recipient_phone",
            "province",
            "city",
            "postal_code",
            "address_line",
        ]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    """Compact Order representation for listing views."""

    items_count = serializers.IntegerField(source="items.count", read_only=True)
    shipment = ShipmentSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "subtotal",
            "shipping_cost",
            "discount_amount",
            "coupon_code",
            "total",
            "notes",
            "created_at",
            "paid_at",
            "items_count",
            "shipment",
        ]
        read_only_fields = fields


class OrderDetailSerializer(serializers.ModelSerializer):
    """Full Order representation including items, shipping address, and payment references."""

    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address = OrderAddressSerializer(read_only=True)
    shipment = ShipmentSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "subtotal",
            "shipping_cost",
            "discount_amount",
            "coupon_code",
            "coupon_snapshot",
            "total",
            "notes",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
            "items",
            "shipping_address",
            "shipment",
        ]
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    """Validates the payload for initiating checkout from the user's cart."""

    address_id = serializers.UUIDField(required=True)
    shipping_method_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    coupon_code = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, max_length=50
    )
