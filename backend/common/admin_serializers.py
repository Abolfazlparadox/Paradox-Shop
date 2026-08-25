from rest_framework import serializers
from common.models import AdminNotification, AuditLog, SystemSetting
from common.permissions import get_user_effective_permissions


class AdminKPISerializer(serializers.Serializer):
    monthly_revenue = serializers.IntegerField()
    monthly_revenue_change = serializers.FloatField()
    total_orders = serializers.IntegerField()
    total_orders_change = serializers.FloatField()
    active_customers = serializers.IntegerField()
    active_customers_change = serializers.FloatField()
    conversion_rate = serializers.FloatField()
    conversion_rate_change = serializers.FloatField()
    average_order_value = serializers.IntegerField()
    customer_acquisition_cost = serializers.IntegerField()
    refund_rate = serializers.FloatField()
    target_revenue_progress = serializers.FloatField()
    active_products = serializers.IntegerField()
    low_stock_variants = serializers.IntegerField()
    out_of_stock_variants = serializers.IntegerField()


class AdminRevenuePointSerializer(serializers.Serializer):
    date = serializers.CharField()
    revenue = serializers.IntegerField()
    projected = serializers.IntegerField()
    orders = serializers.IntegerField()


class AdminAcquisitionChannelSerializer(serializers.Serializer):
    name = serializers.CharField()
    value = serializers.IntegerField()
    percentage = serializers.IntegerField()
    color = serializers.CharField()


class AdminTopProductSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    category = serializers.CharField()
    units_sold = serializers.IntegerField()
    revenue = serializers.IntegerField()
    stock = serializers.IntegerField()


class AdminCohortSerializer(serializers.Serializer):
    cohort = serializers.CharField()
    users = serializers.IntegerField()
    m1 = serializers.CharField()
    m2 = serializers.CharField()
    m3 = serializers.CharField()
    m4 = serializers.CharField()


class AdminAnalyticsResponseSerializer(serializers.Serializer):
    kpis = AdminKPISerializer()
    revenue_chart = AdminRevenuePointSerializer(many=True)
    acquisition_channels = AdminAcquisitionChannelSerializer(many=True)
    top_products = AdminTopProductSerializer(many=True)
    cohorts = AdminCohortSerializer(many=True)


class AdminDashboardResponseSerializer(serializers.Serializer):
    kpis = AdminKPISerializer()
    revenue_chart = AdminRevenuePointSerializer(many=True)
    acquisition_channels = AdminAcquisitionChannelSerializer(many=True)
    status_distribution = serializers.DictField(child=serializers.IntegerField())


class AdminNotificationSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="notification_type", read_only=True)
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = AdminNotification
        fields = [
            "id",
            "title",
            "message",
            "type",
            "notification_type",
            "is_read",
            "action_url",
            "resource_id",
            "timestamp",
            "created_at",
        ]

    def get_timestamp(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        return f"{timesince(obj.created_at, timezone.now()).split(',')[0]} ago"


class AdminAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user_id",
            "user_email",
            "action",
            "resource_type",
            "resource_id",
            "ip_address",
            "metadata",
            "created_at",
        ]


class AdminSystemSettingSerializer(serializers.Serializer):
    store_name = serializers.CharField(required=False, default="PARADOX SHOP ATELIER")
    store_url = serializers.CharField(required=False, default="https://shop.paradox.art")
    currency = serializers.CharField(required=False, default="TOMAN")
    tax_rate = serializers.FloatField(required=False, default=9.0)
    shipping_fee_base = serializers.IntegerField(required=False, default=65000)
    free_shipping_threshold = serializers.IntegerField(required=False, default=5000000)
    maintenance_mode = serializers.BooleanField(required=False, default=False)
    webhook_url = serializers.URLField(required=False, allow_blank=True, default="https://api.paradox.art/webhooks/ops")
    updated_at = serializers.DateTimeField(required=False)


from drf_spectacular.utils import extend_schema_field


class AdminMeSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.CharField()
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()
    permissions = serializers.SerializerMethodField()

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_permissions(self, obj):
        return get_user_effective_permissions(obj)

