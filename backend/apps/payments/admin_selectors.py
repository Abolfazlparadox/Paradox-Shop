from django.db.models import Q
from apps.payments.models import Payment


class AdminPaymentSelector:
    """
    Selectors for payment transactions inspection.
    """

    @staticmethod
    def get_payments_queryset(
        status: str = None,
        payment_method: str = None,
        gateway: str = None,
        search: str = None,
    ):
        qs = Payment.objects.select_related("order", "order__user").order_by("-created_at")

        if status and status.upper() != "ALL":
            qs = qs.filter(status=status.lower())

        if payment_method and payment_method.upper() != "ALL":
            qs = qs.filter(payment_method=payment_method.lower())

        if gateway:
            qs = qs.filter(gateway__icontains=gateway)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(transaction_id__icontains=q)
                | Q(idempotency_key__icontains=q)
                | Q(order__order_number__icontains=q)
                | Q(order__user__email__icontains=q)
            )

        return qs

    @staticmethod
    def get_payment_detail(payment_id: str) -> Payment:
        return Payment.objects.select_related("order", "order__user", "order__shipping_address").get(id=payment_id)
