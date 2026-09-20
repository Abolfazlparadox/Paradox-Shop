import uuid
from typing import Optional

from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from .models import Wishlist, WishlistItem

User = get_user_model()


def get_user_wishlist(user: User) -> Optional[Wishlist]:
    """
    Retrieve user wishlist with all nested product images and variants prefetched.
    """
    if not user.is_authenticated:
        return None
    return (
        Wishlist.objects.filter(user=user)
        .prefetch_related(
            "items__product__images",
            "items__product__brand",
            "items__product__category",
            "items__variant",
        )
        .first()
    )


def get_wishlist_items(wishlist: Wishlist) -> QuerySet[WishlistItem]:
    """
    Retrieve all wishlist items for a given wishlist.
    """
    return (
        WishlistItem.objects.filter(wishlist=wishlist)
        .select_related("product", "product__brand", "product__category", "variant")
        .prefetch_related("product__images")
        .order_by("-created_at")
    )


def is_in_wishlist(
    user: User, product_id: uuid.UUID, variant_id: Optional[uuid.UUID] = None
) -> bool:
    """
    Check if a specific product (or variant) is currently in user's wishlist.
    """
    if not user.is_authenticated:
        return False
    qs = WishlistItem.objects.filter(wishlist__user=user, product_id=product_id)
    if variant_id:
        qs = qs.filter(variant_id=variant_id)
    return qs.exists()
