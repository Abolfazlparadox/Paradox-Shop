from rest_framework import serializers
from apps.orders.models import Order, OrderAddress, OrderItem
from apps.payments.models import Payment


class AdminOrderItemSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "variant_id",
            "product_name",
            "variant_name",
            "sku",
            "quantity",
            "unit_price",
            "total_price",
            "primary_image",
        ]

    def get_primary_image(self, obj):
        if obj.product and obj.product.images.exists():
            img = obj.product.images.first()
            return img.image.url if img.image else None
        return "/images/products/chrono.png"


class AdminOrderAddressSerializer(serializers.ModelSerializer):
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


class AdminCustomerSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField(source="full_name")
    email = serializers.EmailField()
    phone = serializers.CharField(source="phone_number", allow_null=True)


class AdminOrderListSerializer(serializers.ModelSerializer):
    customer = AdminCustomerSummarySerializer(source="user", read_only=True)
    shipping_address = AdminOrderAddressSerializer(read_only=True)
    items = AdminOrderItemSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)
    total_amount = serializers.DecimalField(source="total", max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer",
            "status",
            "subtotal",
            "shipping_cost",
            "discount_amount",
            "total",
            "total_amount",
            "items_count",
            "items",
            "shipping_address",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]


class AdminPaymentSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "status", "payment_method", "gateway", "transaction_id", "created_at"]


class AdminOrderDetailSerializer(AdminOrderListSerializer):
    payments = AdminPaymentSummarySerializer(many=True, read_only=True)

    class Meta(AdminOrderListSerializer.Meta):
        fields = AdminOrderListSerializer.Meta.fields + ["notes", "payments"]


class AdminOrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.OrderStatus.choices)


class AdminOrderBulkStatusSerializer(serializers.Serializer):
    order_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    status = serializers.ChoiceField(choices=Order.OrderStatus.choices)
