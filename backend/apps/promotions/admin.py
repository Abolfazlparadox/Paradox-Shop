from django.contrib import admin

from .models import Coupon, CouponUsage, Promotion


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "slug",
        "discount_type",
        "discount_value",
        "is_active",
        "priority",
        "start_at",
        "end_at",
        "created_at",
    ]
    list_filter = ["is_active", "discount_type", "created_at"]
    search_fields = ["name", "slug", "description"]
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = [
        "included_products",
        "excluded_products",
        "included_categories",
        "included_brands",
    ]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "discount_type",
        "discount_value",
        "is_active",
        "usage_count",
        "total_usage_limit",
        "per_user_usage_limit",
        "audience_type",
        "start_at",
        "end_at",
        "created_at",
    ]
    list_filter = ["is_active", "discount_type", "audience_type", "created_at"]
    search_fields = ["code", "description"]
    filter_horizontal = [
        "eligible_users",
        "included_products",
        "excluded_products",
        "included_categories",
        "included_brands",
    ]
    readonly_fields = ["usage_count", "created_at", "updated_at"]


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ["coupon", "user", "order", "discount_amount", "redeemed_at"]
    list_filter = ["redeemed_at"]
    search_fields = ["coupon__code", "user__email"]
    readonly_fields = ["coupon", "user", "order", "discount_amount", "redeemed_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
