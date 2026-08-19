from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.cart.models import Cart, CartItem
from apps.cart.tasks import cleanup_abandoned_guest_carts


@pytest.mark.django_db
class TestCartTasks:
    """Integration tests for background cart cleanup tasks and safety rules."""

    def test_cleanup_abandoned_guest_carts_deletes_old_guest_cart(
        self, create_product, create_variant
    ):
        """
        Verify that guest carts older than GUEST_CART_RETENTION_DAYS (7 days)
        and all their attached CartItems are cleanly deleted.
        """
        product = create_product()
        variant = create_variant(product=product)

        old_guest_cart = Cart.objects.create(session_key="old-guest-session-123")
        cart_item = CartItem.objects.create(
            cart=old_guest_cart,
            product=product,
            variant=variant,
            quantity=2,
            unit_price=Decimal("100000"),
        )
        cart_item_id = cart_item.id

        # Backdate updated_at to 10 days ago
        ten_days_ago = timezone.now() - timedelta(days=10)
        Cart.objects.filter(pk=old_guest_cart.pk).update(
            created_at=ten_days_ago, updated_at=ten_days_ago
        )

        result = cleanup_abandoned_guest_carts()

        assert result["deleted"] >= 1
        assert not Cart.objects.filter(pk=old_guest_cart.pk).exists()
        assert not CartItem.objects.filter(pk=cart_item_id).exists()

    def test_cleanup_abandoned_guest_carts_preserves_recent_guest_cart(self, create_product):
        """
        Verify that guest carts updated within retention threshold are kept.
        """
        product = create_product()
        recent_guest_cart = Cart.objects.create(session_key="recent-guest-session-456")
        CartItem.objects.create(
            cart=recent_guest_cart,
            product=product,
            quantity=1,
            unit_price=Decimal("50000"),
        )

        # Cart updated_at is now (recent)
        result = cleanup_abandoned_guest_carts()

        assert result["deleted"] == 0
        assert Cart.objects.filter(pk=recent_guest_cart.pk).exists()
        assert recent_guest_cart.items.count() == 1

    def test_cleanup_abandoned_guest_carts_preserves_authenticated_user_cart(
        self, create_user, create_product
    ):
        """
        Verify that authenticated user carts are NEVER deleted by the guest cleanup task,
        even if they haven't been updated for more than 7 days.
        """
        user = create_user(email="cart_user@example.com")
        user_cart = Cart.objects.create(user=user)
        product = create_product()
        CartItem.objects.create(
            cart=user_cart,
            product=product,
            quantity=1,
            unit_price=Decimal("50000"),
        )

        # Backdate user cart to 20 days ago
        twenty_days_ago = timezone.now() - timedelta(days=20)
        Cart.objects.filter(pk=user_cart.pk).update(
            created_at=twenty_days_ago, updated_at=twenty_days_ago
        )

        result = cleanup_abandoned_guest_carts()

        assert result["deleted"] == 0
        assert Cart.objects.filter(pk=user_cart.pk).exists()
        assert user_cart.items.count() == 1

    def test_cleanup_abandoned_guest_carts_preserves_recently_updated_guest_cart(self):
        """
        Verify that a guest cart created long ago but updated recently is preserved.
        """
        guest_cart = Cart.objects.create(session_key="active-guest-session-789")

        twelve_days_ago = timezone.now() - timedelta(days=12)
        one_day_ago = timezone.now() - timedelta(days=1)

        # Created 12 days ago, but updated 1 day ago
        Cart.objects.filter(pk=guest_cart.pk).update(
            created_at=twelve_days_ago, updated_at=one_day_ago
        )

        result = cleanup_abandoned_guest_carts()

        assert result["deleted"] == 0
        assert Cart.objects.filter(pk=guest_cart.pk).exists()
