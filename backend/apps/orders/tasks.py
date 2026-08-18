import logging

from celery import shared_task

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
        # Email backend integration hook here
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
