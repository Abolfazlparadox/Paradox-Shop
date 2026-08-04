from django.urls import path
from .views import PaymentsHealthCheckView

app_name = 'payments'

urlpatterns = [
    path('health/', PaymentsHealthCheckView.as_view(), name='module_health'),
]
