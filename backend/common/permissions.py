from rest_framework.permissions import BasePermission


class IsStaffAdmin(BasePermission):
    """
    Allows access only to authenticated users with staff status or superuser privileges.
    """

    message = "Administrative clearance required (Staff / Superuser)."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and (request.user.is_staff or request.user.is_superuser)
        )


def HasAdminPermission(required_perm: str):
    """
    Returns a DRF permission class that verifies the user possesses `required_perm`.
    Superusers automatically pass.
    """

    class DynamicAdminPermission(BasePermission):
        message = f"Missing required administrative permission: '{required_perm}'."

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

            return request.user.has_perm(required_perm)

    return DynamicAdminPermission


def get_user_effective_permissions(user) -> list[str]:
    """
    Computes and returns a sorted list of permission strings granted to the given user.
    If the user is a superuser, returns ["*"].
    """
    if not user or not user.is_authenticated or not user.is_active:
        return []

    if user.is_superuser:
        return [
            "*",
            "orders.view",
            "orders.update",
            "orders.cancel",
            "products.view",
            "products.create",
            "products.update",
            "products.delete",
            "inventory.view",
            "inventory.update",
            "categories.view",
            "categories.manage",
            "reviews.view",
            "reviews.moderate",
            "users.view",
            "users.manage",
            "payments.view",
            "analytics.view",
            "audit.view",
            "settings.manage",
            "promotions.view",
            "promotions.manage",
        ]

    # For staff users, return specific domain capabilities
    perms = set()
    # Direct and group permissions
    for p in user.get_all_permissions():
        perms.add(p)

    # Standard mappings
    if user.is_staff:
        # Give base staff view permissions by default unless restricted
        perms.add("orders.view")
        perms.add("products.view")
        perms.add("inventory.view")
        perms.add("categories.view")
        perms.add("reviews.view")
        perms.add("customers.view")
        perms.add("analytics.view")
        perms.add("audit.view")

    return sorted(list(perms))
