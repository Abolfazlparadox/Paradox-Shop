from django.contrib import admin

from .models import (
    Brand,
    Product,
    ProductAttributeValue,
    ProductComment,
    ProductImage,
    ProductVariant,
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Brand model.
    """

    list_display = ("name", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


class ProductImageInline(admin.TabularInline):
    """
    Inline admin for ProductImage.
    """

    model = ProductImage
    extra = 1
    classes = ["collapse"]


class ProductVariantInline(admin.TabularInline):
    """
    Inline admin for ProductVariant.
    """

    model = ProductVariant
    extra = 1
    classes = ["collapse"]


class ProductAttributeValueInline(admin.TabularInline):
    """
    Inline admin for ProductAttributeValue.
    """

    model = ProductAttributeValue
    extra = 1
    classes = ["collapse"]


class ProductCommentInline(admin.TabularInline):
    """
    Inline admin for viewing and managing comments directly on a Product.
    """

    model = ProductComment
    extra = 0
    fields = ("user", "parent", "content", "is_approved", "created_at")
    readonly_fields = ("created_at",)
    autocomplete_fields = ["user", "parent"]
    classes = ["collapse"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Product model.
    """

    inlines = [ProductVariantInline, ProductImageInline, ProductAttributeValueInline, ProductCommentInline]

    list_display = (
        "name",
        "category",
        "brand",
        "product_type",
        "base_price",
        "is_active",
        "is_featured",
    )
    list_filter = ("product_type", "is_active", "is_featured", "category", "brand")
    search_fields = ("name", "slug", "description")
    ordering = ("-created_at",)

    prepopulated_fields = {"slug": ("name",)}

    fieldsets = (
        (None, {"fields": ("name", "slug", "product_type", "is_active", "is_featured")}),
        ("Organization", {"fields": ("category", "brand")}),
        ("Content", {"fields": ("description", "short_description")}),
        ("Pricing", {"fields": ("base_price",)}),
    )


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ProductVariant model.
    """

    list_display = ("sku", "product", "name", "final_price", "stock", "is_active")
    list_filter = ("is_active", "product__category")
    search_fields = ("sku", "name", "product__name")
    autocomplete_fields = ["product"]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ProductImage model.
    """

    list_display = ("product", "variant", "alt_text", "is_primary", "sort_order")
    list_filter = ("is_primary", "product__category")
    search_fields = ("alt_text", "product__name")
    autocomplete_fields = ["product", "variant"]


@admin.register(ProductAttributeValue)
class ProductAttributeValueAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ProductAttributeValue model.
    """

    list_display = ("product", "attribute", "value_text", "value_number", "value_boolean")
    search_fields = ("product__name", "attribute__name")
    autocomplete_fields = ["product", "attribute"]


@admin.register(ProductComment)
class ProductCommentAdmin(admin.ModelAdmin):
    """
    Admin configuration for the ProductComment model.
    """

    list_display = ("id", "product", "user", "parent", "is_approved", "created_at")
    list_filter = ("is_approved", "created_at", "product")
    search_fields = ("content", "user__email", "product__name")
    autocomplete_fields = ["product", "user", "parent"]
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
