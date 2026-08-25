import logging
from typing import Any, Optional
from common.models import AuditLog

logger = logging.getLogger("apps")

SENSITIVE_KEYS = {
    "password",
    "password_confirm",
    "old_password",
    "new_password",
    "new_password_confirm",
    "token",
    "access",
    "refresh",
    "secret",
    "authorization",
    "card_number",
    "cvv",
}


def sanitize_metadata(data: Any) -> Any:
    """
    Recursively redacts sensitive keys from a dict or list.
    """
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_metadata(v)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_metadata(item) for item in data]
    return data


def record_audit_log(
    action: str,
    resource_type: str,
    resource_id: str = "",
    request: Optional[Any] = None,
    user: Optional[Any] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> AuditLog:
    """
    Creates an immutable AuditLog record for an administrative action.
    """
    actor_user = user
    actor_email = ""

    if request:
        if not actor_user and hasattr(request, "user") and request.user.is_authenticated:
            actor_user = request.user
        if not ip_address:
            x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded:
                ip_address = x_forwarded.split(",")[0].strip()
            else:
                ip_address = request.META.get("REMOTE_ADDR")

    if actor_user and hasattr(actor_user, "email"):
        actor_email = actor_user.email
    elif actor_user:
        actor_email = str(actor_user)

    clean_metadata = sanitize_metadata(metadata or {})

    try:
        log_entry = AuditLog.objects.create(
            user=actor_user if getattr(actor_user, "is_authenticated", False) else None,
            user_email=actor_email,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            ip_address=ip_address,
            metadata=clean_metadata,
        )
        return log_entry
    except Exception as e:
        logger.error(f"Failed to record audit log for action '{action}': {e}", exc_info=True)
        return None
