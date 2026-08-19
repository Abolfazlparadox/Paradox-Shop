import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import Cart

logger = logging.getLogger(__name__)


@shared_task
def cleanup_abandoned_guest_carts(batch_size: int = 500) -> dict:
    """
    Periodic background task to safely delete inactive guest carts
    older than GUEST_CART_RETENTION_DAYS.

    Safety:
    - Only deletes carts where user is NULL (guest sessions). Authenticated carts are never purged.
    - Uses updated_at timestamp to avoid deleting carts that are still actively being modified.
    - Related CartItem records are deleted via CASCADE constraints without foreign key violations.
    - Operates in bounded batches to avoid locking the database for extended periods.
    """
    retention_days = getattr(settings, "GUEST_CART_RETENTION_DAYS", 7)
    cutoff_time = timezone.now() - timedelta(days=retention_days)

    expired_cart_ids = list(
        Cart.objects.filter(
            user__isnull=True,
            updated_at__lte=cutoff_time,
        ).values_list(
            "id", flat=True
        )[:batch_size]
    )

    if not expired_cart_ids:
        logger.debug("No abandoned guest carts found to clean up.")
        return {"deleted": 0, "total_found": 0}

    deleted_count, _ = Cart.objects.filter(id__in=expired_cart_ids).delete()

    logger.info(
        "Finished cleanup_abandoned_guest_carts: deleted %d guest carts (batch size: %d)",
        deleted_count,
        len(expired_cart_ids),
    )
    return {
        "deleted": deleted_count,
        "total_found": len(expired_cart_ids),
    }
