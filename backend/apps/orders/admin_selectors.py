from django.db.models import Q
from apps.orders.models import Order


class AdminOrderSelector:
    """
    Selectors for administrative order inspection and filtering.
    """

    @staticmethod
    def get_orders_queryset(
        status: str = None,
        search: str = None,
        date_from: str = None,
        date_to: str = None,
    ):
        qs = (
            Order.objects.select_related("user", "shipping_address")
            .prefetch_related("items__product", "items__variant")
            .order_by("-created_at")
        )

        if status and status.upper() != "ALL":
            qs = qs.filter(status=status.lower())

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(order_number__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
                | Q(shipping_address__recipient_name__icontains=q)
                | Q(shipping_address__recipient_phone__icontains=q)
            )

        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        return qs

    @staticmethod
    def get_order_detail(order_id: str) -> Order:
        return (
            Order.objects.select_related("user", "shipping_address")
            .prefetch_related("items__product", "items__variant", "payments")
            .get(id=order_id)
        )
