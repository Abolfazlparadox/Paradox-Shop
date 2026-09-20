from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Review model.
    """

    list_display = ("product", "user", "rating", "is_approved", "created_at")
    list_filter = ("rating", "is_approved")
    search_fields = ("product__name", "user__email", "title", "body")
    ordering = ("-created_at",)
    actions = ["approve_reviews"]

    def approve_reviews(self, request, queryset):
        queryset.update(is_approved=True)

    approve_reviews.short_description = "Approve selected reviews"
