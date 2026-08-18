from django.db.models import QuerySet

from apps.orders.models import Order, OrderItem

from .models import Review


class ReviewSelector:
    """Read-only query methods for the Review domain."""

    @staticmethod
    def get_product_reviews(product_id) -> QuerySet:
        """
        Returns approved reviews for a given product, newest first.
        Only approved reviews are publicly visible.
        """
        return (
            Review.objects.filter(
                product_id=product_id,
                is_approved=True,
            )
            .select_related("user")
            .order_by("-created_at")
        )

    @staticmethod
    def user_has_purchased_product(*, user, product_id) -> bool:
        """
        Checks whether the user has at least one delivered order
        containing the given product. Only delivered orders qualify
        for review — users should not review items they have not
        yet received.
        """
        return OrderItem.objects.filter(
            order__user=user,
            product_id=product_id,
            order__status=Order.OrderStatus.DELIVERED,
        ).exists()

    @staticmethod
    def user_has_review_for_product(*, user, product_id) -> bool:
        """Checks whether the user has already submitted a review for this product."""
        return Review.objects.filter(user=user, product_id=product_id).exists()
