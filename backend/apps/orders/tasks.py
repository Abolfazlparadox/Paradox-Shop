import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Order
from .services import OrderService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_confirmation_email(self, order_id: str, email: str, order_number: str, total: str):
    """
    Background job to dispatch order confirmation notification to user.
    """
    try:
        logger.info(
            "Sending order confirmation email: order_id=%s order_number=%s recipient=%s total=%s",
            order_id,
            order_number,
            email,
            total,
        )
        # Email backend delivery provider hook here (asynchronous notification abstraction)
        return f"Order confirmation sent for {order_number} to {email}"
    except Exception as exc:
        logger.error("Failed to send order confirmation email for order_id=%s: %s", order_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_order_status_notification(
    self, order_id: str, email: str, order_number: str, new_status: str
):
    """
    Background job to notify user when order status transitions.
    """
    try:
        logger.info(
            "Sending order status update notification: "
            "order_id=%s order_number=%s status=%s recipient=%s",
            order_id,
            order_number,
            new_status,
            email,
        )
        return f"Status update ({new_status}) sent for {order_number} to {email}"
    except Exception as exc:
        logger.error("Failed to send status update notification for order_id=%s: %s", order_id, exc)
        raise self.retry(exc=exc)


@shared_task
def cancel_stale_pending_orders(batch_size: int = 100) -> dict:
    """
    Periodic background task to cancel PENDING orders exceeding ORDER_PAYMENT_TIMEOUT_MINUTES
    and safely restore variant stock using OrderService.cancel_order.

    Concurrency & Idempotency:
    - Queries candidate IDs in bounded batches.
    - Each order is locked with select_for_update() inside OrderService.cancel_order.
    - State is re-checked under lock; if the order was paid/processed/cancelled concurrently,
      the cancellation is gracefully skipped without side effects.
    """
    timeout_minutes = getattr(settings, "ORDER_PAYMENT_TIMEOUT_MINUTES", 30)
    cutoff_time = timezone.now() - timedelta(minutes=timeout_minutes)

    stale_order_ids = list(
        Order.objects.filter(
            status=Order.OrderStatus.PENDING,
            created_at__lte=cutoff_time,
        ).values_list("id", flat=True)[:batch_size]
    )

    if not stale_order_ids:
        logger.debug("No stale pending orders found to cancel.")
        return {"cancelled": 0, "skipped": 0, "total_found": 0}

    cancelled_count = 0
    skipped_count = 0

    for order_id in stale_order_ids:
        try:
            OrderService.cancel_order(order_id=order_id)
            cancelled_count += 1
            logger.info("Automatically cancelled stale pending order: order_id=%s", order_id)
        except ValidationError as exc:
            # Order transitioned to paid/processing or was already cancelled concurrently
            skipped_count += 1
            logger.info(
                "Skipped stale cancellation for order_id=%s due to state change: %s",
                order_id,
                exc.detail if hasattr(exc, "detail") else str(exc),
            )
        except Exception as exc:
            skipped_count += 1
            logger.error("Unexpected error cancelling stale order_id=%s: %s", order_id, exc)

    logger.info(
        "Finished cancel_stale_pending_orders: total_found=%d cancelled=%d skipped=%d",
        len(stale_order_ids),
        cancelled_count,
        skipped_count,
    )
    return {
        "cancelled": cancelled_count,
        "skipped": skipped_count,
        "total_found": len(stale_order_ids),
    }
