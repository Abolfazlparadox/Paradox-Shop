import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UUIDPrimaryKeyMixin(models.Model):
    """
    Abstract mixin that provides a UUID v4 primary key.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier (UUID v4) for this record.",
    )

    class Meta:
        abstract = True


class TimestampMixin(models.Model):
    """
    Abstract mixin that provides automatically managed created_at and updated_at timestamps.
    """

    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """
    Abstract mixin that provides soft delete capability with is_deleted and deleted_at fields.
    """

    is_deleted = models.BooleanField(default=False, db_index=True, verbose_name="Is Deleted")
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Deleted At")

    class Meta:
        abstract = True

    def soft_delete(self):
        """
        Soft deletes the record by setting is_deleted=True and timestamping deleted_at.
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def restore(self):
        """
        Restores a soft-deleted record.
        """
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])


class AuditLog(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Immutable audit log entry recording administrative operations and system state changes.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name=_("actor"),
    )
    user_email = models.CharField(
        max_length=255, blank=True, verbose_name=_("actor email snapshot")
    )
    action = models.CharField(
        max_length=100, db_index=True, verbose_name=_("action")
    )
    resource_type = models.CharField(
        max_length=100, db_index=True, verbose_name=_("resource type")
    )
    resource_id = models.CharField(
        max_length=255, blank=True, verbose_name=_("resource id")
    )
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name=_("IP Address")
    )
    metadata = models.JSONField(
        default=dict, blank=True, verbose_name=_("sanitized metadata")
    )

    class Meta:
        verbose_name = _("Audit Log")
        verbose_name_plural = _("Audit Logs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["resource_type", "resource_id"], name="idx_audit_resource"),
            models.Index(fields=["action", "created_at"], name="idx_audit_action_created"),
        ]

    def __str__(self):
        return f"[{self.created_at}] {self.user_email or 'System'} - {self.action} on {self.resource_type}:{self.resource_id}"


class AdminNotification(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Real-time operational alerts and notifications for store administrators.
    """

    class NotificationType(models.TextChoices):
        ORDER = "ORDER", _("Order Event")
        STOCK = "STOCK", _("Inventory Alert")
        REVIEW = "REVIEW", _("Review Moderation")
        PAYMENT = "PAYMENT", _("Payment Transaction")
        SYSTEM = "SYSTEM", _("System Notice")

    title = models.CharField(max_length=255, verbose_name=_("title"))
    message = models.TextField(verbose_name=_("message"))
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True,
        verbose_name=_("notification type"),
    )
    is_read = models.BooleanField(
        default=False, db_index=True, verbose_name=_("is read")
    )
    action_url = models.CharField(
        max_length=255, null=True, blank=True, verbose_name=_("action URL")
    )
    resource_id = models.CharField(
        max_length=255, null=True, blank=True, verbose_name=_("resource ID")
    )

    class Meta:
        verbose_name = _("Admin Notification")
        verbose_name_plural = _("Admin Notifications")
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_notification_type_display()}] {self.title} (Read: {self.is_read})"


class SystemSetting(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Centralized store configuration and governance parameters.
    """

    key = models.CharField(
        max_length=100, unique=True, db_index=True, verbose_name=_("setting key")
    )
    value = models.JSONField(
        default=dict, verbose_name=_("setting value")
    )
    description = models.TextField(
        blank=True, verbose_name=_("description")
    )

    class Meta:
        verbose_name = _("System Setting")
        verbose_name_plural = _("System Settings")
        ordering = ["key"]

    def __str__(self):
        return f"{self.key}"

