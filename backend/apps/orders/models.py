from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class Order(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Order lifecycle entity with a well-defined state machine.
    """

    class OrderStatus(models.TextChoices):
        PENDING = "pending", _("Pending Payment")
        PROCESSING = "processing", _("Processing")
        SHIPPED = "shipped", _("Shipped")
        DELIVERED = "delivered", _("Delivered")
        CANCELLED = "cancelled", _("Cancelled")
        REFUNDED = "refunded", _("Refunded")

    # Valid state transitions: source_status -> set of allowed target statuses
    VALID_TRANSITIONS = {
        OrderStatus.PENDING: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
        OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
        OrderStatus.DELIVERED: {OrderStatus.REFUNDED},
        # Terminal states — no further transitions
        OrderStatus.CANCELLED: set(),
        OrderStatus.REFUNDED: set(),
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        verbose_name=_("user"),
    )
    order_number = models.CharField(_("order number"), max_length=50, unique=True, db_index=True)
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    subtotal = models.DecimalField(_("subtotal (Rial)"), max_digits=12, decimal_places=0)
    shipping_cost = models.DecimalField(
        _("shipping cost (Rial)"), max_digits=12, decimal_places=0, default=0
    )
    discount_amount = models.DecimalField(
        _("discount amount (Rial)"), max_digits=12, decimal_places=0, default=0
    )
    coupon_code = models.CharField(
        _("coupon code snapshot"), max_length=50, null=True, blank=True
    )
    coupon_snapshot = models.JSONField(_("coupon snapshot"), default=dict, blank=True)
    total = models.DecimalField(_("total amount (Rial)"), max_digits=12, decimal_places=0)
    notes = models.TextField(_("order notes"), null=True, blank=True)
    paid_at = models.DateTimeField(_("paid at"), null=True, blank=True)
    cancelled_at = models.DateTimeField(_("cancelled at"), null=True, blank=True)

    class Meta:
        verbose_name = _("Order")
        verbose_name_plural = _("Orders")
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(subtotal__gte=0), name="order_subtotal_gte_0"
            ),
            models.CheckConstraint(
                condition=models.Q(shipping_cost__gte=0), name="order_shipping_cost_gte_0"
            ),
            models.CheckConstraint(
                condition=models.Q(discount_amount__gte=0), name="order_discount_amount_gte_0"
            ),
            models.CheckConstraint(condition=models.Q(total__gte=0), name="order_total_gte_0"),
        ]

    def __str__(self):
        return f"Order #{self.order_number} - {self.user.email} ({self.get_status_display()})"

    def can_transition_to(self, new_status: str) -> bool:
        """Checks whether transitioning to new_status is allowed from the current status."""
        allowed = self.VALID_TRANSITIONS.get(self.status, set())
        return new_status in allowed


class OrderItem(UUIDPrimaryKeyMixin):
    """
    Immutable line item snapshot of an Order.
    """

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items", verbose_name=_("order")
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name=_("product"),
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name=_("product variant"),
    )
    product_name = models.CharField(_("product name snapshot"), max_length=255)
    variant_name = models.CharField(
        _("variant name snapshot"), max_length=255, null=True, blank=True
    )
    sku = models.CharField(_("SKU snapshot"), max_length=100)
    quantity = models.PositiveIntegerField(_("quantity"))
    original_unit_price = models.DecimalField(
        _("original unit price snapshot (Rial)"),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
    )
    discount_amount = models.DecimalField(
        _("discount amount per unit (Rial)"),
        max_digits=12,
        decimal_places=0,
        default=0,
    )
    promotion_snapshot = models.JSONField(
        _("promotion snapshot"), default=dict, blank=True
    )
    unit_price = models.DecimalField(
        _("final unit price snapshot (Rial)"), max_digits=12, decimal_places=0
    )
    total_price = models.DecimalField(
        _("total price snapshot (Rial)"), max_digits=12, decimal_places=0
    )

    class Meta:
        verbose_name = _("Order Item")
        verbose_name_plural = _("Order Items")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1), name="order_item_quantity_gte_1"
            ),
            models.CheckConstraint(
                condition=models.Q(unit_price__gte=0), name="order_item_unit_price_gte_0"
            ),
            models.CheckConstraint(
                condition=models.Q(total_price__gte=0), name="order_item_total_price_gte_0"
            ),
            models.CheckConstraint(
                condition=models.Q(discount_amount__gte=0),
                name="order_item_discount_amount_gte_0",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(original_unit_price__isnull=True)
                    | models.Q(original_unit_price__gte=0)
                ),
                name="order_item_orig_price_gte_0",
            ),
        ]

    def __str__(self):
        return f"{self.quantity}x {self.product_name} in Order #{self.order.order_number}"


class OrderAddress(UUIDPrimaryKeyMixin):
    """
    Immutable shipping address snapshot attached to an Order.
    """

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="shipping_address", verbose_name=_("order")
    )
    recipient_name = models.CharField(_("recipient name"), max_length=200)
    recipient_phone = models.CharField(_("recipient phone"), max_length=20)
    province = models.CharField(_("province"), max_length=100)
    city = models.CharField(_("city"), max_length=100)
    postal_code = models.CharField(_("postal code"), max_length=20)
    address_line = models.TextField(_("address line"))

    class Meta:
        verbose_name = _("Order Address")
        verbose_name_plural = _("Order Addresses")

    def __str__(self):
        return f"Shipping Address for Order #{self.order.order_number} ({self.recipient_name})"
