from rest_framework import serializers
from apps.payments.models import Payment


class AdminPaymentListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_email = serializers.CharField(source="order.user.email", read_only=True)
    customer_name = serializers.CharField(source="order.user.full_name", read_only=True)
    is_mock = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "order_number",
            "customer_name",
            "customer_email",
            "amount",
            "status",
            "payment_method",
            "gateway",
            "transaction_id",
            "is_mock",
            "created_at",
            "updated_at",
        ]

    def get_is_mock(self, obj):
        return obj.gateway in ("mock", "test", None) or "mock" in str(obj.transaction_id or "").lower()


class AdminPaymentDetailSerializer(AdminPaymentListSerializer):
    class Meta(AdminPaymentListSerializer.Meta):
        fields = AdminPaymentListSerializer.Meta.fields + ["idempotency_key", "gateway_response"]
