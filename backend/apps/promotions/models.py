from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import TimestampMixin, UUIDPrimaryKeyMixin


class DiscountType(models.TextChoices):
    """Shared discount type choices used by both Promotion and Coupon."""

    PERCENTAGE = "percentage", _("Percentage")
    FIXED_AMOUNT = "fixed_amount", _("Fixed Amount")


# ---------------------------------------------------------------------------
# Promotion — automatic discounts applied without a code
# ---------------------------------------------------------------------------


class Promotion(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Automatic discount applied to eligible products without requiring a code.

    Targeting logic:
    - If *no* included_products / included_categories / included_brands are set,
      the promotion applies to ALL products (minus excluded_products).
    - If any inclusion set is populated, only those products/categories/brands match.
    - excluded_products always takes precedence over inclusions.
    """

    name = models.CharField(_("promotion name"), max_length=255)
    slug = models.SlugField(_("slug"), max_length=255, unique=True, db_index=True)
    description = models.TextField(_("description"), blank=True)

    discount_type = models.CharField(
        _("discount type"),
        max_length=20,
        choices=DiscountType.choices,
    )
    discount_value = models.DecimalField(
        _("discount value"),
        max_digits=12,
        decimal_places=0,
        help_text=_(
            "Percentage (0-100) when type is percentage, "
            "or fixed Rial amount when type is fixed_amount."
        ),
    )
    max_discount_amount = models.DecimalField(
        _("maximum discount amount (Rial)"),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        help_text=_("Caps the discount for percentage-type promotions."),
    )

    start_at = models.DateTimeField(_("start at"), null=True, blank=True)
    end_at = models.DateTimeField(_("end at"), null=True, blank=True)
    is_active = models.BooleanField(_("is active"), default=False, db_index=True)

    priority = models.IntegerField(
        _("priority"),
        default=0,
        help_text=_("Lower number = higher priority. Used for conflict resolution."),
    )

    # --- Targeting ---
    included_products = models.ManyToManyField(
        "products.Product",
        blank=True,
        related_name="included_promotions",
        verbose_name=_("included products"),
    )
    excluded_products = models.ManyToManyField(
        "products.Product",
        blank=True,
        related_name="excluded_promotions",
        verbose_name=_("excluded products"),
    )
    included_categories = models.ManyToManyField(
        "categories.Category",
        blank=True,
        related_name="promotions",
        verbose_name=_("included categories"),
    )
    included_brands = models.ManyToManyField(
        "products.Brand",
        blank=True,
        related_name="promotions",
        verbose_name=_("included brands"),
    )

    class Meta:
        verbose_name = _("Promotion")
        verbose_name_plural = _("Promotions")
        ordering = ["priority", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "start_at", "end_at"], name="idx_promo_active_window"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(discount_value__gt=0),
                name="promo_discount_value_gt_0",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(discount_type="fixed_amount")
                    | models.Q(discount_value__lte=100)
                ),
                name="promo_percentage_lte_100",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(max_discount_amount__isnull=True)
                    | models.Q(max_discount_amount__gte=0)
                ),
                name="promo_max_discount_gte_0",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(start_at__isnull=True)
                    | models.Q(end_at__isnull=True)
                    | models.Q(start_at__lt=models.F("end_at"))
                ),
                name="promo_start_before_end",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_discount_type_display()}: {self.discount_value})"


# ---------------------------------------------------------------------------
# Coupon — manual discounts requiring a code entry
# ---------------------------------------------------------------------------


class AudienceType(models.TextChoices):
    ALL = "all", _("All Users")
    SPECIFIC_USERS = "specific_users", _("Specific Users")


class Coupon(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Discount coupon requiring a code entered by the customer.

    Audience targeting:
    - ALL → any authenticated user can use the coupon.
    - SPECIFIC_USERS → only users in `eligible_users` M2M.
    """

    code = models.CharField(
        _("coupon code"),
        max_length=50,
        unique=True,
        db_index=True,
        help_text=_("Unique coupon code. Stored and compared in uppercase."),
    )
    description = models.TextField(_("description"), blank=True)

    discount_type = models.CharField(
        _("discount type"),
        max_length=20,
        choices=DiscountType.choices,
    )
    discount_value = models.DecimalField(
        _("discount value"),
        max_digits=12,
        decimal_places=0,
        help_text=_(
            "Percentage (0-100) when type is percentage, "
            "or fixed Rial amount when type is fixed_amount."
        ),
    )
    max_discount_amount = models.DecimalField(
        _("maximum discount amount (Rial)"),
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        help_text=_("Caps the discount for percentage-type coupons."),
    )
    min_order_subtotal = models.DecimalField(
        _("minimum order subtotal (Rial)"),
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text=_("Order subtotal must meet this threshold for the coupon to apply."),
    )

    start_at = models.DateTimeField(_("start at"), null=True, blank=True)
    end_at = models.DateTimeField(_("end at"), null=True, blank=True)
    is_active = models.BooleanField(_("is active"), default=True, db_index=True)

    # --- Usage limits ---
    total_usage_limit = models.PositiveIntegerField(
        _("total usage limit"),
        null=True,
        blank=True,
        help_text=_("Maximum total redemptions. Null = unlimited."),
    )
    per_user_usage_limit = models.PositiveIntegerField(
        _("per-user usage limit"),
        default=1,
        help_text=_("Maximum redemptions per user."),
    )
    usage_count = models.PositiveIntegerField(
        _("current usage count"),
        default=0,
        help_text=_("Denormalized counter of total redemptions."),
    )

    # --- Audience targeting ---
    audience_type = models.CharField(
        _("audience type"),
        max_length=20,
        choices=AudienceType.choices,
        default=AudienceType.ALL,
    )
    eligible_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="eligible_coupons",
        verbose_name=_("eligible users"),
        help_text=_("Only relevant when audience_type is SPECIFIC_USERS."),
    )

    # --- Product targeting ---
    included_products = models.ManyToManyField(
        "products.Product",
        blank=True,
        related_name="included_coupons",
        verbose_name=_("included products"),
    )
    excluded_products = models.ManyToManyField(
        "products.Product",
        blank=True,
        related_name="excluded_coupons",
        verbose_name=_("excluded products"),
    )
    included_categories = models.ManyToManyField(
        "categories.Category",
        blank=True,
        related_name="coupons",
        verbose_name=_("included categories"),
    )
    included_brands = models.ManyToManyField(
        "products.Brand",
        blank=True,
        related_name="coupons",
        verbose_name=_("included brands"),
    )

    class Meta:
        verbose_name = _("Coupon")
        verbose_name_plural = _("Coupons")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active", "start_at", "end_at"], name="idx_coupon_active_window"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(discount_value__gt=0),
                name="coupon_discount_value_gt_0",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(discount_type="fixed_amount")
                    | models.Q(discount_value__lte=100)
                ),
                name="coupon_percentage_lte_100",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(max_discount_amount__isnull=True)
                    | models.Q(max_discount_amount__gte=0)
                ),
                name="coupon_max_discount_gte_0",
            ),
            models.CheckConstraint(
                condition=models.Q(min_order_subtotal__gte=0),
                name="coupon_min_order_subtotal_gte_0",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(start_at__isnull=True)
                    | models.Q(end_at__isnull=True)
                    | models.Q(start_at__lt=models.F("end_at"))
                ),
                name="coupon_start_before_end",
            ),
        ]

    def __str__(self):
        return f"Coupon {self.code} ({self.get_discount_type_display()}: {self.discount_value})"

    def save(self, *args, **kwargs):
        # Always store coupon codes in uppercase for consistent lookups.
        self.code = self.code.upper().strip()
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# CouponUsage — tracks per-user coupon redemptions
# ---------------------------------------------------------------------------


class CouponUsage(UUIDPrimaryKeyMixin):
    """
    Immutable record of a coupon redemption by a specific user.
    """

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name="usages",
        verbose_name=_("coupon"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coupon_usages",
        verbose_name=_("user"),
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="coupon_usages",
        verbose_name=_("order"),
    )
    discount_amount = models.DecimalField(
        _("discount amount applied (Rial)"),
        max_digits=12,
        decimal_places=0,
        default=0,
    )
    redeemed_at = models.DateTimeField(_("redeemed at"), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("Coupon Usage")
        verbose_name_plural = _("Coupon Usages")
        ordering = ["-redeemed_at"]
        indexes = [
            models.Index(fields=["coupon", "user"], name="idx_coupon_usage_coupon_user"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(discount_amount__gte=0),
                name="coupon_usage_discount_gte_0",
            ),
        ]

    def __str__(self):
        return f"Usage of {self.coupon.code} by {self.user.email} at {self.redeemed_at}"
