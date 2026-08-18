import uuid

from django.db import models
from django.utils import timezone


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
