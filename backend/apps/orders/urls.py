from django.urls import path
from .views import CheckoutView, OrderDetailView, OrderListView, OrdersHealthCheckView

app_name = 'orders'

urlpatterns = [
    path('health/', OrdersHealthCheckView.as_view(), name='module_health'),
    path('', OrderListView.as_view(), name='list'),
    path('<uuid:pk>/', OrderDetailView.as_view(), name='detail'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
]