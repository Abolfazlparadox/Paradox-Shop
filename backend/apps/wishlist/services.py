import logging
import uuid
from typing import List, Optional, Tuple

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.products.models import Product, ProductVariant
from .models import Wishlist, WishlistItem

logger = logging.getLogger("commerce.wishlist")
User = get_user_model()


def get_or_create_wishlist(user: User) -> Wishlist:
    """
    Retrieve or create the authoritative wishlist entity for a user.
    """
    wishlist, created = Wishlist.objects.get_or_create(user=user)
    if created:
        logger.info(
            "commerce.wishlist.created",
            extra={"user_id": str(user.id), "wishlist_id": str(wishlist.id)},
        )
    return wishlist


@transaction.atomic
def add_to_wishlist(
    user: User,
    product_id: uuid.UUID,
    variant_id: Optional[uuid.UUID] = None,
) -> Tuple[WishlistItem, bool]:
    """
    Add a product (and optional variant) to the user's persistent wishlist.
    """
    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        raise NotFound("Product not found or inactive.")

    variant = None
    if variant_id:
        try:
            variant = ProductVariant.objects.get(
                id=variant_id, product=product, is_active=True
            )
        except ProductVariant.DoesNotExist:
            raise NotFound("Product variant not found or inactive.")

    wishlist = get_or_create_wishlist(user)

    item, created = WishlistItem.objects.get_or_create(
        wishlist=wishlist,
        product=product,
        variant=variant,
    )

    logger.info(
        "commerce.wishlist.item_added",
        extra={
            "user_id": str(user.id),
            "wishlist_id": str(wishlist.id),
            "item_id": str(item.id),
            "product_id": str(product.id),
            "variant_id": str(variant.id) if variant else None,
            "is_new": created,
        },
    )

    return item, created


@transaction.atomic
def remove_from_wishlist(user: User, item_id: uuid.UUID) -> bool:
    """
    Remove an item from the user's wishlist by item ID.
    """
    try:
        item = WishlistItem.objects.get(id=item_id, wishlist__user=user)
        product_id = str(item.product_id)
        wishlist_id = str(item.wishlist_id)
        item.delete()

        logger.info(
            "commerce.wishlist.item_removed",
            extra={
                "user_id": str(user.id),
                "wishlist_id": wishlist_id,
                "item_id": str(item_id),
                "product_id": product_id,
            },
        )
        return True
    except WishlistItem.DoesNotExist:
        raise NotFound("Wishlist item not found or does not belong to you.")


@transaction.atomic
def remove_by_product(
    user: User,
    product_id: uuid.UUID,
    variant_id: Optional[uuid.UUID] = None,
) -> bool:
    """
    Remove an item from the user's wishlist by product ID and optional variant.
    """
    qs = WishlistItem.objects.filter(wishlist__user=user, product_id=product_id)
    if variant_id:
        qs = qs.filter(variant_id=variant_id)
    
    deleted_count, _ = qs.delete()
    if deleted_count > 0:
        logger.info(
            "commerce.wishlist.item_removed_by_product",
            extra={
                "user_id": str(user.id),
                "product_id": str(product_id),
                "variant_id": str(variant_id) if variant_id else None,
            },
        )
        return True
    return False


@transaction.atomic
def clear_wishlist(user: User) -> int:
    """
    Remove all items from the user's wishlist.
    """
    wishlist = Wishlist.objects.filter(user=user).first()
    if not wishlist:
        return 0

    count, _ = wishlist.items.all().delete()
    logger.info(
        "commerce.wishlist.cleared",
        extra={"user_id": str(user.id), "wishlist_id": str(wishlist.id), "deleted_count": count},
    )
    return count


@transaction.atomic
def merge_guest_wishlist(user: User, product_ids: List[uuid.UUID]) -> int:
    """
    Merge guest wishlist items (list of product IDs) into the authenticated user's wishlist.
    """
    if not product_ids:
        return 0

    wishlist = get_or_create_wishlist(user)
    valid_products = Product.objects.filter(id__in=product_ids, is_active=True)

    added_count = 0
    for prod in valid_products:
        _, created = WishlistItem.objects.get_or_create(
            wishlist=wishlist,
            product=prod,
            variant=None,
        )
        if created:
            added_count += 1

    logger.info(
        "commerce.wishlist.merged",
        extra={
            "user_id": str(user.id),
            "wishlist_id": str(wishlist.id),
            "requested_count": len(product_ids),
            "added_count": added_count,
        },
    )

    return added_count
