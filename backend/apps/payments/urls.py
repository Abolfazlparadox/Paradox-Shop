from django.urls import path

from .views import CreatePaymentView, PaymentDetailView, PaymentListView, PaymentsHealthCheckView

app_name = "payments"

urlpatterns = [
    path("health/", PaymentsHealthCheckView.as_view(), name="module_health"),
    path("", PaymentListView.as_view(), name="list"),
    path("<uuid:pk>/", PaymentDetailView.as_view(), name="detail"),
    path("pay/", CreatePaymentView.as_view(), name="create-payment"),
]
