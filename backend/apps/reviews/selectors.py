from decimal import Decimal
from typing import Any, Dict, Optional
from django.core.cache import cache
from django.db.models import Avg, Count, Q, QuerySet

from apps.orders.models import Order, OrderItem
from .models import ProductQuestion, Review, ReviewVote


class ReviewSelector:
    """Read-only query methods and data access for Reviews and Q&A."""

    @staticmethod
    def get_product_reviews(
        product_id,
        rating: Optional[int] = None,
        is_verified_purchase: Optional[bool] = None,
        has_images: Optional[bool] = None,
        sort_by: str = "newest",
    ) -> QuerySet[Review]:
        """
        Returns approved public reviews for a product with filtering and sorting.
        """
        qs = (
            Review.objects.filter(
                product_id=product_id,
                status=Review.ReviewStatus.APPROVED,
            )
            .select_related("user", "staff_response")
            .prefetch_related("images")
        )

        if rating is not None and 1 <= rating <= 5:
            qs = qs.filter(rating=rating)

        if is_verified_purchase is True:
            qs = qs.filter(is_verified_purchase=True)

        if has_images is True:
            qs = qs.filter(images__isnull=False).distinct()

        # Sorting strategy
        if sort_by == "helpful":
            qs = qs.order_by("-helpful_count", "-created_at")
        elif sort_by == "rating_desc":
            qs = qs.order_by("-rating", "-created_at")
        elif sort_by == "rating_asc":
            qs = qs.order_by("rating", "-created_at")
        elif sort_by == "oldest":
            qs = qs.order_by("created_at")
        else:  # newest
            qs = qs.order_by("-created_at")

        return qs

    @staticmethod
    def get_product_review_summary(product_id) -> Dict[str, Any]:
        """
        Calculates or retrieves cached aggregate review statistics for a product.
        Includes average rating, total counts, verified purchase counts,
        and 1-to-5 star breakdown distribution with percentages.
        """
        cache_key = f"review_summary:{product_id}"
        cached_summary = cache.get(cache_key)
        if cached_summary is not None:
            return cached_summary

        approved_reviews = Review.objects.filter(
            product_id=product_id,
            status=Review.ReviewStatus.APPROVED,
        )

        aggregates = approved_reviews.aggregate(
            total_count=Count("id"),
            avg_rating=Avg("rating"),
            verified_count=Count("id", filter=Q(is_verified_purchase=True)),
            with_images_count=Count("id", filter=Q(images__isnull=False), distinct=True),
        )

        total_count = aggregates["total_count"] or 0
        avg_rating = round(float(aggregates["avg_rating"] or 0.0), 1)
        verified_count = aggregates["verified_count"] or 0
        with_images_count = aggregates["with_images_count"] or 0

        # Distribution breakdown (1 to 5 stars)
        rating_counts = approved_reviews.values("rating").annotate(count=Count("id"))
        counts_map = {item["rating"]: item["count"] for item in rating_counts}

        breakdown = {}
        for star in range(5, 0, -1):
            count = counts_map.get(star, 0)
            percentage = round((count / total_count * 100), 1) if total_count > 0 else 0.0
            breakdown[str(star)] = {
                "stars": star,
                "count": count,
                "percentage": percentage,
            }

        summary = {
            "product_id": str(product_id),
            "total_reviews": total_count,
            "average_rating": avg_rating,
            "verified_purchases_count": verified_count,
            "with_images_count": with_images_count,
            "rating_breakdown": breakdown,
        }

        # Cache summary for 1 hour
        cache.set(cache_key, summary, timeout=3600)
        return summary

    @staticmethod
    def invalidate_product_review_summary(product_id) -> None:
        """Invalidates the cached summary when review state changes."""
        cache.delete(f"review_summary:{product_id}")

    @staticmethod
    def user_has_purchased_product(*, user, product_id) -> bool:
        """
        Checks whether the user has at least one DELIVERED order containing the product.
        Only completed/delivered orders qualify for verified reviews.
        """
        if not user or not user.is_authenticated:
            return False

        return OrderItem.objects.filter(
            order__user=user,
            product_id=product_id,
            order__status=Order.OrderStatus.DELIVERED,
        ).exists()

    @staticmethod
    def user_has_review_for_product(*, user, product_id) -> bool:
        """Checks whether the user has already submitted a review for this product."""
        if not user or not user.is_authenticated:
            return False
        return Review.objects.filter(user=user, product_id=product_id).exists()

    @staticmethod
    def get_user_review_eligibility(*, user, product_id) -> Dict[str, Any]:
        """
        Returns eligibility payload for the user on a specific product.
        """
        if not user or not user.is_authenticated:
            return {
                "can_review": False,
                "has_purchased": False,
                "has_reviewed": False,
                "existing_review": None,
            }

        has_purchased = ReviewSelector.user_has_purchased_product(user=user, product_id=product_id)
        existing_review = Review.objects.filter(user=user, product_id=product_id).first()

        return {
            "can_review": has_purchased and (existing_review is None),
            "has_purchased": has_purchased,
            "has_reviewed": existing_review is not None,
            "existing_review": {
                "id": str(existing_review.id),
                "rating": existing_review.rating,
                "status": existing_review.status,
                "created_at": existing_review.created_at.isoformat(),
            } if existing_review else None,
        }

    @staticmethod
    def get_user_reviews(user) -> QuerySet[Review]:
        """Returns all reviews submitted by the authenticated user."""
        return (
            Review.objects.filter(user=user)
            .select_related("product", "staff_response")
            .prefetch_related("images")
            .order_by("-created_at")
        )

    @staticmethod
    def get_user_votes_for_reviews(*, user, review_ids: list) -> Dict[str, bool]:
        """Returns a map of review_id -> is_helpful for the given user."""
        if not user or not user.is_authenticated or not review_ids:
            return {}

        votes = ReviewVote.objects.filter(user=user, review_id__in=review_ids).values("review_id", "is_helpful")
        return {str(v["review_id"]): v["is_helpful"] for v in votes}


class QASelector:
    """Read-only query methods for Product Q&A inquiries."""

    @staticmethod
    def get_product_questions(product_id) -> QuerySet[ProductQuestion]:
        """Returns approved client questions for a product with answers."""
        return (
            ProductQuestion.objects.filter(
                product_id=product_id,
                status=ProductQuestion.QuestionStatus.APPROVED,
            )
            .select_related("user", "answer")
            .order_by("-created_at")
        )

    @staticmethod
    def get_user_questions(user) -> QuerySet[ProductQuestion]:
        """Returns all questions submitted by the authenticated user."""
        return (
            ProductQuestion.objects.filter(user=user)
            .select_related("product", "answer")
            .order_by("-created_at")
        )
