from django.contrib import admin

from .models import Order, OrderAddress, OrderItem


class OrderItemInline(admin.TabularInline):
    """
    Inline admin for OrderItem.
    """

    model = OrderItem
    extra = 0
    readonly_fields = (
        "product",
        "variant",
        "product_name",
        "variant_name",
        "sku",
        "quantity",
        "unit_price",
        "total_price",
    )
    can_delete = False


class OrderAddressInline(admin.StackedInline):
    """
    Inline admin for OrderAddress.
    """

    model = OrderAddress
    can_delete = False
    readonly_fields = (
        "recipient_name",
        "recipient_phone",
        "province",
        "city",
        "postal_code",
        "address_line",
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Order model.
    """

    inlines = [OrderAddressInline, OrderItemInline]
    list_display = ("order_number", "user", "status", "total", "created_at")
    list_filter = ("status",)
    search_fields = ("order_number", "user__email")
    ordering = ("-created_at",)
    readonly_fields = (
        "user",
        "order_number",
        "subtotal",
        "shipping_cost",
        "discount_amount",
        "total",
        "created_at",
        "updated_at",
        "paid_at",
        "cancelled_at",
    )
