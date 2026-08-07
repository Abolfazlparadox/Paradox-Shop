from django.db.models import QuerySet

from .models import Payment


class PaymentSelector:
    """Read-only query methods for the Payment domain."""

    @staticmethod
    def get_user_payments(user) -> QuerySet:
        """Returns all Payments for Orders belonging to the given user."""
        return Payment.objects.filter(order__user=user).order_by('-created_at')

    @staticmethod
    def get_order_payments(order) -> QuerySet:
        """Returns all Payments for a specific Order."""
        return Payment.objects.filter(order=order).order_by('-created_at')