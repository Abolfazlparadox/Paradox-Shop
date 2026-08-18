from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from .models import Address

User = get_user_model()


class UserSelector:
    """Read-only query methods for the User domain."""

    @staticmethod
    def get_user_with_profile(user_id) -> User:
        """
        Returns a single active, non-deleted User with the related profile pre-fetched.
        Raises User.DoesNotExist if no matching user is found.
        """
        return User.objects.select_related("profile").get(pk=user_id, is_deleted=False)

    @staticmethod
    def get_active_users() -> QuerySet:
        """Returns the queryset of all active, non-deleted users."""
        return User.objects.filter(is_active=True, is_deleted=False)


class AddressSelector:
    """Read-only query methods for the Address domain."""

    @staticmethod
    def get_user_addresses(user) -> QuerySet:
        """Returns all non-deleted addresses belonging to the given user, default-first."""
        return Address.objects.filter(user=user, is_deleted=False).order_by(
            "-is_default", "-created_at"
        )

    @staticmethod
    def get_default_address(user) -> Address | None:
        """Returns the user's current default address, if any."""
        return Address.objects.filter(user=user, is_deleted=False, is_default=True).first()
