from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for a Payment record."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "amount",
            "status",
            "payment_method",
            "gateway",
            "transaction_id",
            "idempotency_key",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CreatePaymentSerializer(serializers.Serializer):
    """Validates the payload for initiating a payment on an order."""

    order_id = serializers.UUIDField()
    idempotency_key = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, max_length=255
    )
