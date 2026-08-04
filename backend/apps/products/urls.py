from django.urls import path
from .views import ProductsHealthCheckView

app_name = 'products'

urlpatterns = [
    path('health/', ProductsHealthCheckView.as_view(), name='module_health'),
]
