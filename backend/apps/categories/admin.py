from django.contrib import admin

from .models import Category, CategoryAttribute


class CategoryAttributeInline(admin.TabularInline):
    """
    Inline admin for CategoryAttribute to be displayed within the Category admin page.
    """

    model = CategoryAttribute
    extra = 1  # Show one extra form for adding new attributes


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Category model.
    """

    inlines = [CategoryAttributeInline]

    list_display = ("name", "parent", "is_active", "sort_order")
    list_filter = ("is_active", "parent")
    search_fields = ("name", "description")
    ordering = ("parent__name", "sort_order", "name")

    prepopulated_fields = {"slug": ("name",)}

    fieldsets = (
        (None, {"fields": ("name", "slug", "parent", "is_active")}),
        ("Details", {"fields": ("description", "image")}),
        ("Ordering", {"fields": ("sort_order",)}),
    )


@admin.register(CategoryAttribute)
class CategoryAttributeAdmin(admin.ModelAdmin):
    """
    Admin configuration for the CategoryAttribute model.
    """

    list_display = (
        "name",
        "category",
        "attribute_type",
        "is_filterable",
        "is_variant",
        "sort_order",
    )
    list_filter = ("attribute_type", "category", "is_filterable", "is_variant")
    search_fields = ("name", "category__name")
    ordering = ("category__name", "sort_order", "name")
