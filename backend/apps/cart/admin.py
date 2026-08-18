from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    """
    Inline admin for CartItem to be displayed within the Cart admin page.
    """

    model = CartItem
    extra = 0
    readonly_fields = ("product", "variant", "unit_price", "total_price")
    can_delete = True


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Cart model.
    """

    inlines = [CartItemInline]
    list_display = ("id", "user", "session_key", "created_at", "updated_at")
    search_fields = ("user__email", "session_key")
    readonly_fields = ("created_at", "updated_at")
