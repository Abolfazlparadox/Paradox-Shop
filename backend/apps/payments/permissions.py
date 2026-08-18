from rest_framework import permissions


class IsPaymentOwner(permissions.BasePermission):
    """
    Object-level permission granting access only to the user who owns the Payment's Order.
    Admin/staff users are also granted access.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj.order.user == request.user
