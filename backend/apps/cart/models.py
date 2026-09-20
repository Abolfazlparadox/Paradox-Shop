from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class Cart(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Shopping Cart entity supporting authenticated users and guest sessions.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cart",
        verbose_name=_("user"),
    )
    session_key = models.CharField(
        _("session key"), max_length=255, null=True, blank=True, unique=True, db_index=True
    )

    class Meta:
        verbose_name = _("Cart")
        verbose_name_plural = _("Carts")

    def __str__(self):
        if self.user:
            return f"Cart of {self.user.email}"
        return f"Guest Cart ({self.session_key})"


class CartItem(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Line item inside a Shopping Cart.
    """

    cart = models.ForeignKey(
        Cart, on_delete=models.CASCADE, related_name="items", verbose_name=_("cart")
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name=_("product"),
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cart_items",
        verbose_name=_("product variant"),
    )
    quantity = models.PositiveIntegerField(_("quantity"), default=1)
    unit_price = models.DecimalField(
        _("unit price (Rial)"),
        max_digits=12,
        decimal_places=0,
        help_text=_("Price snapshot in Iranian Rial at time of adding to cart."),
    )

    class Meta:
        verbose_name = _("Cart Item")
        verbose_name_plural = _("Cart Items")
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product", "variant"], name="unique_cart_product_variant"
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="cart_item_quantity_gte_1",
            ),
        ]

    def __str__(self):
        item_name = f"{self.product.name}" + (f" ({self.variant.name})" if self.variant else "")
        return f"{self.quantity}x {item_name} in Cart {self.cart_id}"

    @property
    def total_price(self):
        return self.quantity * self.unit_price
