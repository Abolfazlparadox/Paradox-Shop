from rest_framework.permissions import BasePermission


class IsPromotionAdmin(BasePermission):
    """
    Allows access only to staff users with promotions.manage permission.
    Superusers automatically pass.
    """

    message = "Missing required permission: 'promotions.manage'."

    def has_permission(self, request, view):
        if not bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and (request.user.is_staff or request.user.is_superuser)
        ):
            return False

        if request.user.is_superuser:
            return True

        return request.user.has_perm("promotions.manage")
