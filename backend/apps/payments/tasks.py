import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_payment_receipt_notification(
    self, payment_id: str, email: str, order_number: str, amount: str, transaction_id: str
):
    """
    Background job to send payment receipt notification upon successful payment.
    """
    try:
        logger.info(
            "Sending payment receipt notification: "
            "payment_id=%s order=%s txn=%s amount=%s recipient=%s",
            payment_id,
            order_number,
            transaction_id,
            amount,
            email,
        )
        return f"Payment receipt sent for {order_number} (txn: {transaction_id}) to {email}"
    except Exception as exc:
        logger.error("Failed to send payment receipt for payment_id=%s: %s", payment_id, exc)
        raise self.retry(exc=exc)
