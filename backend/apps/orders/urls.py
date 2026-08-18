from django.urls import path

from .views import (
    CancelOrderView,
    CheckoutView,
    OrderDetailView,
    OrderListView,
    OrdersHealthCheckView,
)

app_name = "orders"

urlpatterns = [
    path("health/", OrdersHealthCheckView.as_view(), name="module_health"),
    path("", OrderListView.as_view(), name="list"),
    path("<uuid:pk>/", OrderDetailView.as_view(), name="detail"),
    path("<uuid:pk>/cancel/", CancelOrderView.as_view(), name="cancel"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
]
