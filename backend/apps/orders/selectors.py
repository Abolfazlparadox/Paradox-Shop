from django.db.models import Prefetch, QuerySet

from .models import Order, OrderAddress, OrderItem


class OrderSelector:
    """Read-only query methods for the Order domain."""

    @staticmethod
    def get_user_orders(user) -> QuerySet:
        """Returns all Orders belonging to the given user, newest first."""
        return Order.objects.filter(user=user).order_by("-created_at")

    @staticmethod
    def get_order_detail(order_id, user) -> Order:
        """
        Returns a single Order with its items and shipping address pre-fetched,
        scoped to the given user to enforce ownership at the DB query level.
        Raises Order.DoesNotExist if not found or not owned by the user.
        """
        return (
            Order.objects.filter(pk=order_id, user=user)
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related("product", "variant"),
                ),
                "payments",
            )
            .select_related("shipping_address")
            .get()
        )
