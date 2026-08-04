from django.urls import path
from .views import OrdersHealthCheckView

app_name = 'orders'

urlpatterns = [
    path('health/', OrdersHealthCheckView.as_view(), name='module_health'),
]
