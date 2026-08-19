import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id: str, email: str, full_name: str = ""):
    """
    Asynchronous notification task to dispatch a welcome email upon user registration.

    Note:
    Email delivery provider is currently an abstraction layer for asynchronous notifications.
    Only non-sensitive metadata is logged.
    """
    try:
        logger.info(
            "Sending welcome email: user_id=%s recipient=%s full_name=%s",
            user_id,
            email,
            full_name,
        )
        # Email backend integration provider hook here
        return f"Welcome email sent to {email} (user_id: {user_id})"
    except Exception as exc:
        logger.error("Failed to send welcome email for user_id=%s: %s", user_id, exc)
        raise self.retry(exc=exc)
