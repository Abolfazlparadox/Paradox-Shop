from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum
from apps.orders.models import Order

User = get_user_model()


class AdminUserSelector:
    """
    Selectors for customer dossier inspection and patron directory.
    """

    @staticmethod
    def get_customers_queryset(search: str = None, status: str = None):
        paid_statuses = [Order.OrderStatus.PROCESSING, Order.OrderStatus.SHIPPED, Order.OrderStatus.DELIVERED]

        qs = (
            User.objects.select_related("profile")
            .annotate(
                orders_count=Count("orders", distinct=True),
                total_spent=Sum("orders__total", filter=Q(orders__status__in=paid_statuses), distinct=True),
                last_order_date=Max("orders__created_at"),
                addresses_count=Count("addresses", distinct=True),
            )
            .order_by("-created_at")
        )

        if status:
            if status.upper() == "ACTIVE":
                qs = qs.filter(is_active=True)
            elif status.upper() in ("SUSPENDED", "INACTIVE"):
                qs = qs.filter(is_active=False)

        if search:
            q = search.strip()
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(phone_number__icontains=q)
            )

        return qs

    @staticmethod
    def get_customer_detail(user_id: str) -> User:
        paid_statuses = [Order.OrderStatus.PROCESSING, Order.OrderStatus.SHIPPED, Order.OrderStatus.DELIVERED]

        return (
            User.objects.select_related("profile")
            .prefetch_related("addresses", "orders__items", "reviews__product")
            .annotate(
                orders_count=Count("orders", distinct=True),
                total_spent=Sum("orders__total", filter=Q(orders__status__in=paid_statuses), distinct=True),
                last_order_date=Max("orders__created_at"),
            )
            .get(id=user_id)
        )
