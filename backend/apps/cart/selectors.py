from django.db.models import Prefetch

from .models import Cart, CartItem


class CartSelector:
    """Read-only query methods for the Cart domain."""

    @staticmethod
    def get_user_cart(user) -> Cart | None:
        """Returns the authenticated user's Cart, or None if it does not exist yet."""
        return Cart.objects.filter(user=user).first()

    @staticmethod
    def get_session_cart(session_key: str) -> Cart | None:
        """Returns the guest Cart tied to the given session key, or None if it does not exist."""
        return Cart.objects.filter(session_key=session_key).first()

    @staticmethod
    def get_cart_with_items(cart_id) -> Cart:
        """
        Returns a Cart with its line items (and each item's product/variant) optimally pre-fetched.
        """
        return Cart.objects.prefetch_related(
            Prefetch(
                "items",
                queryset=CartItem.objects.select_related("product", "variant").order_by(
                    "-created_at"
                ),
            )
        ).get(pk=cart_id)

    @staticmethod
    def get_cart_item(cart: Cart, item_id) -> CartItem:
        """
        Returns a single CartItem, scoped to the given Cart.
        Raises CartItem.DoesNotExist otherwise.
        """
        return CartItem.objects.select_related("product", "variant").get(pk=item_id, cart=cart)
