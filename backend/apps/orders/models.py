from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from common.models import UUIDPrimaryKeyMixin, TimestampMixin


class Order(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Order lifecycle entity.
    """
    class OrderStatus(models.TextChoices):
        PENDING = 'pending', _('Pending Payment')
        PROCESSING = 'processing', _('Processing')
        SHIPPED = 'shipped', _('Shipped')
        DELIVERED = 'delivered', _('Delivered')
        CANCELLED = 'cancelled', _('Cancelled')
        REFUNDED = 'refunded', _('Refunded')

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='orders',
        verbose_name=_('user')
    )
    order_number = models.CharField(_('order number'), max_length=50, unique=True, db_index=True)
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True
    )
    subtotal = models.DecimalField(_('subtotal (Rial)'), max_digits=12, decimal_places=0)
    shipping_cost = models.DecimalField(_('shipping cost (Rial)'), max_digits=12, decimal_places=0, default=0)
    discount_amount = models.DecimalField(_('discount amount (Rial)'), max_digits=12, decimal_places=0, default=0)
    total = models.DecimalField(_('total amount (Rial)'), max_digits=12, decimal_places=0)
    notes = models.TextField(_('order notes'), null=True, blank=True)
    paid_at = models.DateTimeField(_('paid at'), null=True, blank=True)
    cancelled_at = models.DateTimeField(_('cancelled at'), null=True, blank=True)

    class Meta:
        verbose_name = _('Order')
        verbose_name_plural = _('Orders')
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order_number} - {self.user.email} ({self.get_status_display()})"


class OrderItem(UUIDPrimaryKeyMixin):
    """
    Immutable line item snapshot of an Order.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('order')
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name=_('product')
    )
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name=_('product variant')
    )
    product_name = models.CharField(_('product name snapshot'), max_length=255)
    variant_name = models.CharField(_('variant name snapshot'), max_length=255, null=True, blank=True)
    sku = models.CharField(_('SKU snapshot'), max_length=100)
    quantity = models.PositiveIntegerField(_('quantity'))
    unit_price = models.DecimalField(_('unit price snapshot (Rial)'), max_digits=12, decimal_places=0)
    total_price = models.DecimalField(_('total price snapshot (Rial)'), max_digits=12, decimal_places=0)

    class Meta:
        verbose_name = _('Order Item')
        verbose_name_plural = _('Order Items')

    def __str__(self):
        return f"{self.quantity}x {self.product_name} in Order #{self.order.order_number}"


class OrderAddress(UUIDPrimaryKeyMixin):
    """
    Immutable shipping address snapshot attached to an Order.
    """
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='shipping_address',
        verbose_name=_('order')
    )
    recipient_name = models.CharField(_('recipient name'), max_length=200)
    recipient_phone = models.CharField(_('recipient phone'), max_length=20)
    province = models.CharField(_('province'), max_length=100)
    city = models.CharField(_('city'), max_length=100)
    postal_code = models.CharField(_('postal code'), max_length=20)
    address_line = models.TextField(_('address line'))

    class Meta:
        verbose_name = _('Order Address')
        verbose_name_plural = _('Order Addresses')

    def __str__(self):
        return f"Shipping Address for Order #{self.order.order_number} ({self.recipient_name})"