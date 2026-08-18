from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class Payment(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Payment transaction entity for tracking gateway interactions and payment status.
    """

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        PROCESSING = "processing", _("Processing")
        SUCCEEDED = "succeeded", _("Succeeded")
        FAILED = "failed", _("Failed")
        REFUNDED = "refunded", _("Refunded")

    class PaymentMethod(models.TextChoices):
        ONLINE = "online", _("Online Gateway")
        WALLET = "wallet", _("User Wallet")
        COD = "cod", _("Cash on Delivery")

    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, related_name="payments", verbose_name=_("order")
    )
    amount = models.DecimalField(
        _("amount (Rial)"),
        max_digits=12,
        decimal_places=0,
        help_text=_("Payment amount in Iranian Rial."),
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    payment_method = models.CharField(
        _("payment method"),
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.ONLINE,
    )
    gateway = models.CharField(
        _("payment gateway"),
        max_length=50,
        null=True,
        blank=True,
        help_text=_("e.g., zarinpal, pasargad"),
    )
    transaction_id = models.CharField(
        _("transaction ID"), max_length=100, null=True, blank=True, unique=True, db_index=True
    )
    idempotency_key = models.CharField(
        _("idempotency key"),
        max_length=255,
        null=True,
        blank=True,
        unique=True,
        db_index=True,
        help_text=_("Unique key supplied by client to prevent duplicate payment submissions."),
    )
    gateway_response = models.JSONField(_("gateway raw response"), null=True, blank=True)

    class Meta:
        verbose_name = _("Payment")
        verbose_name_plural = _("Payments")
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gte=0), name="payment_amount_gte_0"),
        ]

    def __str__(self):
        return (
            f"Payment {self.id} for Order #{self.order.order_number} - {self.get_status_display()}"
        )
