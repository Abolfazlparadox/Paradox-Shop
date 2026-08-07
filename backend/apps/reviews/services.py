import django.db.utils
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Review
from .selectors import ReviewSelector


class ReviewService:
    """Business logic for creating and managing product Reviews."""

    @staticmethod
    @transaction.atomic
    def create_review(*, user, product_id, rating: int, title: str | None = None,
                      body: str | None = None) -> Review:
        """
        Creates a new Review for a product.

        Validations:
        - Rating must be between 1 and 5 (enforced by model constraint, also checked here).
        - User must have a delivered order containing this product.
        - User must not have already reviewed this product (enforced by unique constraint,
          but we check explicitly for a friendly error; concurrent requests that bypass
          the check are caught via IntegrityError).
        """
        # --- Validate rating range ---
        if not (1 <= rating <= 5):
            raise ValidationError({'rating': 'Rating must be between 1 and 5.'})

        # --- Check for duplicate review (fast path) ---
        if ReviewSelector.user_has_review_for_product(user=user, product_id=product_id):
            raise ValidationError({'review': 'You have already reviewed this product.'})

        # --- Verify purchase (only delivered orders qualify) ---
        has_purchased = ReviewSelector.user_has_purchased_product(user=user, product_id=product_id)
        if not has_purchased:
            raise ValidationError(
                {'review': 'You can only review products you have purchased and received.'}
            )

        # --- Create the review ---
        review = Review(
            product_id=product_id,
            user=user,
            rating=rating,
            title=title,
            body=body,
            is_verified_purchase=True,
            is_approved=False,
        )
        try:
            review.save()
        except django.db.utils.IntegrityError:
            raise ValidationError({'review': 'You have already reviewed this product.'})

        return review