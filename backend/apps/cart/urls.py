from django.urls import path
from .views import CartHealthCheckView

app_name = 'cart'

urlpatterns = [
    path('health/', CartHealthCheckView.as_view(), name='module_health'),
]
