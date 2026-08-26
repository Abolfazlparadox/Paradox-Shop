from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class Wishlist(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    User's wishlist holding saved products for future purchase.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist",
        verbose_name=_("user"),
    )

    class Meta:
        verbose_name = _("Wishlist")
        verbose_name_plural = _("Wishlists")

    def __str__(self):
        return f"Wishlist of {self.user.email}"


class WishlistItem(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Individual product or variant saved in the wishlist.
    """

    wishlist = models.ForeignKey(
        Wishlist,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("wishlist"),
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="wishlist_items",
        verbose_name=_("product"),
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="wishlist_items",
        verbose_name=_("product variant"),
    )

    class Meta:
        verbose_name = _("Wishlist Item")
        verbose_name_plural = _("Wishlist Items")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["wishlist", "product", "variant"],
                name="unique_wishlist_product_variant",
            ),
        ]

    def __str__(self):
        item_name = f"{self.product.name}" + (f" ({self.variant.name})" if self.variant else "")
        return f"{item_name} in Wishlist of {self.wishlist.user.email}"
