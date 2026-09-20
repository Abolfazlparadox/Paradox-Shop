from typing import Optional
from django.db.models import Q, QuerySet

from apps.products.models import ProductComment
from apps.reviews.models import (
    ProductQuestion,
    QuestionReport,
    Review,
    ReviewReport,
)


class AdminReviewSelector:
    """Administrative selectors for Reviews and Q&A Moderation."""

    @staticmethod
    def get_reviews_queryset(
        status: Optional[str] = None,
        is_approved: Optional[bool] = None,
        rating: Optional[int] = None,
        search: Optional[str] = None,
        product_id: Optional[str] = None,
    ) -> QuerySet[Review]:
        qs = (
            Review.objects.select_related("product", "user", "staff_response")
            .prefetch_related("images", "reports")
            .order_by("-created_at")
        )

        if status:
            qs = qs.filter(status=status.upper())
        elif is_approved is not None:
            qs = qs.filter(is_approved=is_approved)

        if rating is not None and 1 <= rating <= 5:
            qs = qs.filter(rating=rating)

        if product_id:
            qs = qs.filter(product_id=product_id)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(body__icontains=q)
                | Q(product__name__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
            )

        return qs

    @staticmethod
    def get_questions_queryset(
        status: Optional[str] = None,
        is_approved: Optional[bool] = None,
        search: Optional[str] = None,
        product_id: Optional[str] = None,
    ) -> QuerySet[ProductQuestion]:
        qs = (
            ProductQuestion.objects.select_related("product", "user", "answer")
            .prefetch_related("reports")
            .order_by("-created_at")
        )

        if status:
            qs = qs.filter(status=status.upper())
        elif is_approved is not None:
            target_status = ProductQuestion.QuestionStatus.APPROVED if is_approved else ProductQuestion.QuestionStatus.PENDING
            qs = qs.filter(status=target_status)

        if product_id:
            qs = qs.filter(product_id=product_id)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(question__icontains=q)
                | Q(product__name__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
            )

        return qs

    @staticmethod
    def get_review_reports_queryset(status: Optional[str] = None) -> QuerySet[ReviewReport]:
        qs = ReviewReport.objects.select_related("review", "user", "review__product").order_by("-created_at")
        if status:
            qs = qs.filter(status=status.upper())
        return qs

    @staticmethod
    def get_comments_queryset(
        is_approved: Optional[bool] = None,
        search: Optional[str] = None,
    ):
        """Legacy comment support during transition."""
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
