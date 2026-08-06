from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Object-level permission granting access only to the object's owning user.

    Expects the target object to expose a `user` attribute (e.g. Address).
    """

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, 'user', None)
        return owner is not None and owner == request.user