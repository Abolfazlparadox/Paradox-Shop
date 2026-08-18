from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class Review(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Product Review and Rating entity submitted by users.
    """

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name=_("product"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name=_("user"),
    )
    rating = models.PositiveSmallIntegerField(_("rating (1-5)"))
    title = models.CharField(_("review title"), max_length=255, null=True, blank=True)
    body = models.TextField(_("review body"), null=True, blank=True)
    is_verified_purchase = models.BooleanField(_("is verified purchase"), default=False)
    is_approved = models.BooleanField(_("is approved"), default=False, db_index=True)

    class Meta:
        verbose_name = _("Review")
        verbose_name_plural = _("Reviews")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["product", "user"], name="unique_product_user_review"),
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="review_rating_range_1_to_5",
            ),
        ]

    def __str__(self):
        return f"Review by {self.user.email} on {self.product.name} ({self.rating}/5)"
