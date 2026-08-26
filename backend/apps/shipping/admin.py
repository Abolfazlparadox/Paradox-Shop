from django.contrib import admin
from .models import Shipment, ShippingMethod, ShippingZone, ShippingZoneRate


class ShippingZoneRateInline(admin.TabularInline):
    model = ShippingZoneRate
    extra = 1


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "base_rate",
        "free_shipping_threshold",
        "estimated_days_min",
        "estimated_days_max",
        "is_active",
        "sort_order",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("sort_order", "base_rate")


@admin.register(ShippingZone)
class ShippingZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
    inlines = [ShippingZoneRateInline]


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = (
        "tracking_code",
        "order",
        "carrier_name",
        "shipping_method",
        "shipping_fee",
        "status",
        "shipped_at",
        "delivered_at",
        "created_at",
    )
    list_filter = ("status", "carrier_name", "shipping_method")
    search_fields = ("tracking_code", "order__order_number", "order__user__email")
    readonly_fields = ("tracking_code", "created_at", "updated_at")
