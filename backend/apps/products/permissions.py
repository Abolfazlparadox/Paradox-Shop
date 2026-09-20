from rest_framework.permissions import BasePermission


class IsVerifiedUser(BasePermission):
    """
    Allows access only to authenticated users with verified active accounts
    or staff/admin members.
    """

    message = "You must verify your account email before posting comments."

    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        if request.user.is_staff:
            return True
        profile = getattr(request.user, "profile", None)
        return bool(request.user.is_active and profile and profile.email_verified)
