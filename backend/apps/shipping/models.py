from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class ShippingMethod(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Delivery method offered to customers during checkout.
    """

    name = models.CharField(_("name"), max_length=200)
    code = models.SlugField(_("code"), max_length=50, unique=True, db_index=True)
    description = models.TextField(_("description"), null=True, blank=True)
    base_rate = models.DecimalField(
        _("base rate (Rial)"),
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text=_("Base flat shipping fee in Iranian Rial."),
    )
    free_shipping_threshold = models.DecimalField(
        _("free shipping threshold (Rial)"),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        help_text=_("Order subtotal required for this method to become free of charge."),
    )
    estimated_days_min = models.PositiveIntegerField(
        _("min estimated delivery days"), default=1
    )
    estimated_days_max = models.PositiveIntegerField(
        _("max estimated delivery days"), default=3
    )
    is_active = models.BooleanField(_("is active"), default=True)
    sort_order = models.PositiveIntegerField(_("sort order"), default=0)

    class Meta:
        verbose_name = _("Shipping Method")
        verbose_name_plural = _("Shipping Methods")
        ordering = ["sort_order", "base_rate"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(base_rate__gte=0), name="shipping_base_rate_gte_0"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def estimated_delivery_text(self) -> str:
        if self.estimated_days_min == self.estimated_days_max:
            return f"{self.estimated_days_min} Business Day{'s' if self.estimated_days_min > 1 else ''}"
        return f"{self.estimated_days_min} to {self.estimated_days_max} Business Days"


class ShippingZone(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Geographic delivery zone based on destination provinces and cities.
    """

    name = models.CharField(_("zone name"), max_length=150, unique=True)
    provinces = models.JSONField(
        _("provinces"),
        default=list,
        help_text=_("List of province names covered by this zone (e.g. ['تهران', 'البرز'])."),
    )
    cities = models.JSONField(
        _("cities"),
        default=list,
        blank=True,
        help_text=_("Optional list of specific cities covered. Leave empty for all cities in province."),
    )
    is_active = models.BooleanField(_("is active"), default=True)

    class Meta:
        verbose_name = _("Shipping Zone")
        verbose_name_plural = _("Shipping Zones")
        ordering = ["name"]

    def __str__(self):
        return self.name

    def matches(self, province: str, city: str = "") -> bool:
        """Check if destination matches this zone."""
        if not self.is_active:
            return False

        if "*" in self.provinces or "all" in self.provinces:
            return True

        if province and province.strip() in self.provinces:
            if not self.cities or len(self.cities) == 0:
                return True
            if city and city.strip() in self.cities:
                return True

        return False


class ShippingZoneRate(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Zone-specific rate adjustment for a shipping method.
    """

    zone = models.ForeignKey(
        ShippingZone,
        on_delete=models.CASCADE,
        related_name="rates",
        verbose_name=_("zone"),
    )
    method = models.ForeignKey(
        ShippingMethod,
        on_delete=models.CASCADE,
        related_name="zone_rates",
        verbose_name=_("shipping method"),
    )
    rate_override = models.DecimalField(
        _("rate override (Rial)"),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        help_text=_("Overrides base shipping rate if specified."),
    )
    additional_fee = models.DecimalField(
        _("additional fee (Rial)"),
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text=_("Extra surcharge added on top of base rate for this zone."),
    )
    is_active = models.BooleanField(_("is active"), default=True)

    class Meta:
        verbose_name = _("Shipping Zone Rate")
        verbose_name_plural = _("Shipping Zone Rates")
        constraints = [
            models.UniqueConstraint(
                fields=["zone", "method"], name="unique_zone_method_rate"
            )
        ]

    def __str__(self):
        return f"{self.method.name} in {self.zone.name}"


class Shipment(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Physical shipment record fulfilling a customer's Order.
    """

    class ShipmentStatus(models.TextChoices):
        PENDING = "pending", _("Pending Processing")
        LABEL_CREATED = "label_created", _("Shipping Label Created")
        IN_TRANSIT = "in_transit", _("In Transit / Handed over to Courier")
        OUT_FOR_DELIVERY = "out_for_delivery", _("Out for Delivery")
        DELIVERED = "delivered", _("Delivered to Customer")
        FAILED = "failed", _("Delivery Failed / Returned")

    # Allowed status transitions
    VALID_TRANSITIONS = {
        ShipmentStatus.PENDING: {ShipmentStatus.LABEL_CREATED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.FAILED},
        ShipmentStatus.LABEL_CREATED: {ShipmentStatus.IN_TRANSIT, ShipmentStatus.FAILED},
        ShipmentStatus.IN_TRANSIT: {ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED, ShipmentStatus.FAILED},
        ShipmentStatus.OUT_FOR_DELIVERY: {ShipmentStatus.DELIVERED, ShipmentStatus.FAILED},
        ShipmentStatus.DELIVERED: set(),
        ShipmentStatus.FAILED: {ShipmentStatus.IN_TRANSIT},
    }

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="shipment",
        verbose_name=_("order"),
    )
    shipping_method = models.ForeignKey(
        ShippingMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shipments",
        verbose_name=_("shipping method"),
    )
    tracking_code = models.CharField(
        _("tracking code"), max_length=100, null=True, blank=True, unique=True, db_index=True
    )
    carrier_name = models.CharField(
        _("carrier name"), max_length=100, default="Paradox Express Fleet"
    )
    shipping_fee = models.DecimalField(
        _("shipping fee (Rial)"), max_digits=12, decimal_places=0, default=0
    )
    status = models.CharField(
        _("shipment status"),
        max_length=25,
        choices=ShipmentStatus.choices,
        default=ShipmentStatus.PENDING,
        db_index=True,
    )
    shipped_at = models.DateTimeField(_("shipped at"), null=True, blank=True)
    delivered_at = models.DateTimeField(_("delivered at"), null=True, blank=True)
    notes = models.TextField(_("delivery notes"), null=True, blank=True)

    class Meta:
        verbose_name = _("Shipment")
        verbose_name_plural = _("Shipments")
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(shipping_fee__gte=0), name="shipment_shipping_fee_gte_0"
            ),
        ]

    def __str__(self):
        return f"Shipment for Order #{self.order.order_number} ({self.get_status_display()})"

    def can_transition_to(self, new_status: str) -> bool:
        allowed = self.VALID_TRANSITIONS.get(self.status, set())
        return new_status in allowed
