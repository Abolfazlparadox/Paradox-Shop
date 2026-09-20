from decimal import Decimal
from rest_framework import serializers

from .models import Shipment, ShippingMethod, ShippingZone, ShippingZoneRate


class ShippingMethodSerializer(serializers.ModelSerializer):
    estimated_delivery_text = serializers.CharField(read_only=True)

    class Meta:
        model = ShippingMethod
        fields = [
            "id",
            "name",
            "code",
            "description",
            "base_rate",
            "free_shipping_threshold",
            "estimated_days_min",
            "estimated_days_max",
            "estimated_delivery_text",
            "is_active",
            "sort_order",
        ]


class ShippingQuoteSerializer(serializers.Serializer):
    method_id = serializers.UUIDField()
    code = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField(allow_null=True, required=False)
    base_rate = serializers.DecimalField(max_digits=12, decimal_places=0)
    shipping_fee = serializers.DecimalField(max_digits=12, decimal_places=0)
    is_free = serializers.BooleanField()
    free_shipping_threshold = serializers.DecimalField(
        max_digits=12, decimal_places=0, allow_null=True, required=False
    )
    estimated_days_min = serializers.IntegerField()
    estimated_days_max = serializers.IntegerField()
    estimated_delivery_text = serializers.CharField()


class ShippingCalculateRequestSerializer(serializers.Serializer):
    method_id = serializers.UUIDField(required=False, allow_null=True)
    province = serializers.CharField(required=False, allow_blank=True, default="")
    city = serializers.CharField(required=False, allow_blank=True, default="")
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=0, required=False, default=Decimal("0")
    )


class ShipmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    shipping_method = ShippingMethodSerializer(read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "id",
            "tracking_code",
            "carrier_name",
            "shipping_fee",
            "status",
            "status_display",
            "shipped_at",
            "delivered_at",
            "notes",
            "shipping_method",
            "created_at",
            "updated_at",
        ]


class ShipmentTrackingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    recipient_province = serializers.CharField(
        source="order.shipping_address.province", read_only=True, default=None
    )
    recipient_city = serializers.CharField(
        source="order.shipping_address.city", read_only=True, default=None
    )
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "tracking_code",
            "carrier_name",
            "status",
            "status_display",
            "shipped_at",
            "delivered_at",
            "recipient_province",
            "recipient_city",
            "order_number",
            "created_at",
        ]
