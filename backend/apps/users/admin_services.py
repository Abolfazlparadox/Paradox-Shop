from django.contrib.auth import get_user_model
from django.db import transaction
from common.audit_services import record_audit_log

User = get_user_model()


class AdminUserService:
    """
    Administrative operations on User and Patron entities.
    """

    @staticmethod
    @transaction.atomic
    def toggle_status(user: User, actor_user=None, request=None) -> User:
        user.is_active = not user.is_active
        user.save(update_fields=["is_active", "updated_at"])

        record_audit_log(
            action=f"USER_ACCOUNT_{'ACTIVATED' if user.is_active else 'SUSPENDED'}",
            resource_type="CUSTOMER",
            resource_id=str(user.id),
            user=actor_user,
            request=request,
            metadata={"target_email": user.email, "new_active_state": user.is_active},
        )

        return user
