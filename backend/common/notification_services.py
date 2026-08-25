import logging
from typing import Optional
from common.models import AdminNotification

logger = logging.getLogger("apps")


def create_admin_notification(
    title: str,
    message: str,
    notification_type: str = AdminNotification.NotificationType.SYSTEM,
    action_url: Optional[str] = None,
    resource_id: Optional[str] = None,
) -> Optional[AdminNotification]:
    """
    Creates a new operational notification for administrators.
    """
    try:
        notification = AdminNotification.objects.create(
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            resource_id=str(resource_id) if resource_id else None,
        )
        return notification
    except Exception as e:
        logger.error(f"Failed to create admin notification: {e}", exc_info=True)
        return None
