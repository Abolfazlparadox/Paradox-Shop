from django.db.models import Q
from apps.reviews.models import Review
from apps.products.models import ProductComment


class AdminReviewSelector:
    """
    Selectors for reviews and threaded product inquiries.
    """

    @staticmethod
    def get_reviews_queryset(
        is_approved: bool = None,
        rating: int = None,
        search: str = None,
    ):
        qs = Review.objects.select_related("product", "user").order_by("-created_at")

        if is_approved is not None:
            qs = qs.filter(is_approved=is_approved)

        if rating is not None:
            qs = qs.filter(rating=rating)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(body__icontains=q)
                | Q(product__name__icontains=q)
                | Q(user__email__icontains=q)
            )

        return qs

    @staticmethod
    def get_comments_queryset(
        is_approved: bool = None,
        search: str = None,
    ):
        qs = (
            ProductComment.objects.select_related("product", "user", "parent")
            .prefetch_related("replies")
            .order_by("-created_at")
        )

        if is_approved is not None:
            qs = qs.filter(is_approved=is_approved)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(content__icontains=q)
                | Q(product__name__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__first_name__icontains=q)
            )

        return qs
