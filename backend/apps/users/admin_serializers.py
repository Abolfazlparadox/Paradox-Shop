from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.users.models import Address, UserProfile
from apps.orders.models import Order

User = get_user_model()


class AdminAddressSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "title",
            "recipient_name",
            "recipient_phone",
            "province",
            "city",
            "postal_code",
            "address_line",
            "is_default",
        ]


class AdminCustomerOrderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "total",
            "created_at",
        ]


class AdminCustomerListSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name", read_only=True)
    is_verified = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    orders_count = serializers.IntegerField(read_only=True, default=0)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True, default=0)
    last_order_date = serializers.DateTimeField(read_only=True, allow_null=True)
    addresses_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "phone_number",
            "is_verified",
            "is_staff",
            "is_superuser",
            "status",
            "orders_count",
            "total_spent",
            "last_order_date",
            "addresses_count",
            "created_at",
            "updated_at",
        ]

    def get_is_verified(self, obj):
        profile = getattr(obj, "profile", None)
        return bool(profile and (profile.email_verified or profile.phone_verified))

    def get_status(self, obj):
        return "ACTIVE" if obj.is_active else "SUSPENDED"


class AdminCustomerDetailSerializer(AdminCustomerListSerializer):
    addresses = AdminAddressSummarySerializer(many=True, read_only=True)
    orders = AdminCustomerOrderSummarySerializer(many=True, read_only=True)

    class Meta(AdminCustomerListSerializer.Meta):
        fields = AdminCustomerListSerializer.Meta.fields + ["addresses", "orders"]
